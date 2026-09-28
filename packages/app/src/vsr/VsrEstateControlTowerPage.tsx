/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Content,
  ContentHeader,
  Header,
  InfoCard,
  Page,
} from '@backstage/core-components';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Grid from '@material-ui/core/Grid';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { VsrRuntimeTunnelPanel } from './VsrRuntimeTunnelPanel';

type HealthState = 'healthy' | 'degraded' | 'blocked' | 'unknown';

interface HealthDimension {
  name: string;
  state: HealthState;
  source: string;
  description: string;
}

interface EstateSignal {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  scope: string;
  subject: string;
  observedState: string;
  entrySurface: string;
  entryTo: string;
}

const baseHealthDimensions: HealthDimension[] = [
  {
    name: 'Runtime',
    state: 'unknown',
    source: 'Prometheus / provider runtime',
    description: 'Process, service, API and infrastructure health.',
  },
  {
    name: 'Dependencies',
    state: 'unknown',
    source: 'Synnergyze',
    description:
      'Upstream and downstream acceptance, handoff and workflow state.',
  },
  {
    name: 'Authority',
    state: 'unknown',
    source: 'Warden',
    description: 'Grant validity, consent, policy and execution authority.',
  },
  {
    name: 'Evidence',
    state: 'unknown',
    source: 'RiverOS',
    description:
      'Observation, receipt, provenance and verification continuity.',
  },
  {
    name: 'Capacity',
    state: 'unknown',
    source: 'Synnergyze capacity',
    description:
      'Human, agent, compute, provider and physical allocable capacity.',
  },
  {
    name: 'Continuity',
    state: 'unknown',
    source: 'Genesis + RiverOS',
    description:
      'Connection, replay and reconstructability after interruption.',
  },
  {
    name: 'Transaction',
    state: 'unknown',
    source: 'SILK / provider receipts',
    description: 'Settlement, reconciliation and economic execution state.',
  },
];

const EXPECTED_PROMETHEUS_JOBS = ['prometheus', 'river-api'] as const;
const POLL_INTERVAL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 10_000;

const stateLabel = (state: HealthState) => state.toUpperCase();

interface PrometheusResult {
  metric: { job?: string };
  value?: [number, string];
}

const summarizePrometheus = (
  payload: any,
): { state: HealthState; detail: string } => {
  const results = (payload?.data?.result ?? []) as PrometheusResult[];
  const monitored = EXPECTED_PROMETHEUS_JOBS.map(job => ({
    job,
    result: results.find(candidate => candidate.metric.job === job),
  }));
  const downJobs = monitored
    .filter(({ result }) => result && result.value?.[1] !== '1')
    .map(({ job }) => job);
  const missingJobs = monitored
    .filter(({ result }) => !result)
    .map(({ job }) => job);

  if (downJobs.length > 0) {
    return {
      state: 'degraded',
      detail: `Prometheus observed down target(s): ${downJobs.join(', ')}.`,
    };
  }

  if (missingJobs.length > 0) {
    return {
      state: 'unknown',
      detail: `Prometheus reachable; expected target(s) missing: ${missingJobs.join(
        ', ',
      )}.`,
    };
  }

  return {
    state: 'healthy',
    detail: `Prometheus expected targets healthy: ${EXPECTED_PROMETHEUS_JOBS.join(
      ', ',
    )}.`,
  };
};

const summarizeRiver = (
  payload: any,
): { state: HealthState; detail: string } => {
  if (!payload || typeof payload.status !== 'string') {
    return {
      state: 'unknown',
      detail: 'River responded without an authoritative health status.',
    };
  }

  return {
    state: payload.status === 'healthy' ? 'healthy' : 'degraded',
    detail: `River: ${payload.status}; DB: ${payload.database ?? 'unknown'}.`,
  };
};

export const VsrEstateControlTowerPage = () => {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const [runtimeState, setRuntimeState] = useState<HealthState>('unknown');
  const [evidenceState, setEvidenceState] = useState<HealthState>('unknown');
  const [runtimeDetail, setRuntimeDetail] = useState(
    'Prometheus telemetry has not yet been observed.',
  );
  const [evidenceDetail, setEvidenceDetail] = useState(
    'River telemetry has not yet been observed.',
  );

  useEffect(() => {
    let active = true;
    let pollTimer: number | undefined;
    let currentController: AbortController | undefined;

    const requestJson = async (url: string, signal: AbortSignal) => {
      const response = await fetchApi.fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`Telemetry request failed with ${response.status}`);
      }
      return response.json();
    };

    const loadTelemetry = async () => {
      const controller = new AbortController();
      currentController = controller;
      const timeout = window.setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );

      try {
        const baseUrl = await discoveryApi.getBaseUrl('vsr-telemetry');
        const [prometheusResult, riverResult] = await Promise.allSettled([
          requestJson(`${baseUrl}/prometheus/up`, controller.signal),
          requestJson(`${baseUrl}/river/health`, controller.signal),
        ]);

        if (!active) return;

        if (prometheusResult.status === 'fulfilled') {
          const summary = summarizePrometheus(prometheusResult.value);
          setRuntimeState(summary.state);
          setRuntimeDetail(summary.detail);
        } else {
          setRuntimeState('unknown');
          setRuntimeDetail(
            'Prometheus telemetry unavailable; no runtime state inferred.',
          );
        }

        if (riverResult.status === 'fulfilled') {
          const summary = summarizeRiver(riverResult.value);
          setEvidenceState(summary.state);
          setEvidenceDetail(summary.detail);
        } else {
          setEvidenceState('unknown');
          setEvidenceDetail(
            'River telemetry unavailable; no evidence state inferred.',
          );
        }
      } catch (_error) {
        if (!active) return;
        setRuntimeState('unknown');
        setEvidenceState('unknown');
        setRuntimeDetail(
          'Telemetry adapter unavailable; no runtime state inferred.',
        );
        setEvidenceDetail(
          'Telemetry adapter unavailable; no evidence state inferred.',
        );
      } finally {
        window.clearTimeout(timeout);
        if (currentController === controller) {
          currentController = undefined;
        }
        if (active) {
          pollTimer = window.setTimeout(loadTelemetry, POLL_INTERVAL_MS);
        }
      }
    };

    void loadTelemetry();

    return () => {
      active = false;
      if (pollTimer !== undefined) {
        window.clearTimeout(pollTimer);
      }
      currentController?.abort();
    };
  }, [discoveryApi, fetchApi]);

  const healthDimensions = useMemo(
    () =>
      baseHealthDimensions.map(dimension => {
        if (dimension.name === 'Runtime') {
          return { ...dimension, state: runtimeState };
        }
        if (dimension.name === 'Evidence') {
          return { ...dimension, state: evidenceState };
        }
        return dimension;
      }),
    [runtimeState, evidenceState],
  );

  const signals: EstateSignal[] = [
    {
      id: 'ESTATE-SIGNAL-TELEMETRY-001',
      severity:
        runtimeState === 'degraded' || evidenceState === 'degraded'
          ? 'warning'
          : 'info',
      scope: 'VSR > Alpha > ALPHA-NODE-001',
      subject: 'Alpha telemetry',
      observedState: `${runtimeDetail} ${evidenceDetail}`,
      entrySurface: 'DevTools',
      entryTo: '/devtools',
    },
  ];

  return (
    <Page themeId="tool">
      <Header
        title="VSR Estate Control Tower"
        subtitle="Admin estate view · investigate first, terminal last"
      />
      <Content>
        <ContentHeader title="Estate">
          <Button
            component={RouterLink}
            to="/vsr/clients/CLIENT-001"
            variant="outlined"
          >
            Open Client Control
          </Button>
        </ContentHeader>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <InfoCard
              title="ALPHA-NODE-001"
              subheader="Genesis estate seed · Prometheus + River live adapter"
            >
              <Typography variant="body2" paragraph>
                Navigate the estate from canonical objects and signals. Health
                is not inferred from the UI: each dimension remains UNKNOWN
                until its authoritative source is connected.
              </Typography>
              <Box display="flex" gridGap={8} flexWrap="wrap">
                <Chip size="small" label="GENESIS REGISTERED" />
                <Chip size="small" label="PROMETHEUS + RIVER CONNECTED" />
                <Chip size="small" label="TERMINAL = BREAK GLASS" />
              </Box>
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <InfoCard title="Operating path">
              <Typography variant="body2">
                SEE → UNDERSTAND → INVESTIGATE → DECIDE → COORDINATE → ACT →
                VERIFY → BREAK GLASS
              </Typography>
            </InfoCard>
          </Grid>
        </Grid>

        <Box mt={3}>
          <VsrRuntimeTunnelPanel />
        </Box>

        <Box mt={3}>
          <Grid container spacing={3}>
            {healthDimensions.map(dimension => (
              <Grid item xs={12} sm={6} md={4} key={dimension.name}>
                <InfoCard title={dimension.name} subheader={dimension.source}>
                  <Box mb={1}>
                    <Chip size="small" label={stateLabel(dimension.state)} />
                  </Box>
                  <Typography variant="body2">
                    {dimension.description}
                  </Typography>
                </InfoCard>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box mt={3}>
          <InfoCard
            title="Signals"
            subheader="Observation → Signal → Alert → Incident → Matter → Intervention"
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Severity</TableCell>
                  <TableCell>Scope</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Observed state</TableCell>
                  <TableCell>Enter</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {signals.map(signal => (
                  <TableRow key={signal.id}>
                    <TableCell>
                      <Chip
                        size="small"
                        label={signal.severity.toUpperCase()}
                      />
                    </TableCell>
                    <TableCell>{signal.scope}</TableCell>
                    <TableCell>{signal.subject}</TableCell>
                    <TableCell>{signal.observedState}</TableCell>
                    <TableCell>
                      <Button
                        component={RouterLink}
                        size="small"
                        to={signal.entryTo}
                        variant="outlined"
                      >
                        {signal.entrySurface}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </InfoCard>
        </Box>

        <Box mt={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <InfoCard title="Troubleshooting entry map">
                <Typography variant="body2" paragraph>
                  Registry, topology or ownership → Genesis / Catalog.
                </Typography>
                <Typography variant="body2" paragraph>
                  Permission, consent or expired grant → Warden.
                </Typography>
                <Typography variant="body2" paragraph>
                  Workflow, dependency, handoff or capacity → Synnergyze.
                </Typography>
                <Typography variant="body2" paragraph>
                  What actually happened → RiverOS evidence.
                </Typography>
                <Typography variant="body2">
                  Deep host or container failure → DevTools, then terminal only
                  when the higher layers cannot resolve the fault.
                </Typography>
                <Box mt={2} display="flex" gridGap={8} flexWrap="wrap">
                  <Button
                    component={RouterLink}
                    size="small"
                    to="/catalog"
                    variant="outlined"
                  >
                    Genesis / Catalog
                  </Button>
                  <Button
                    component={RouterLink}
                    size="small"
                    to="/vsr/clients/CLIENT-001"
                    variant="outlined"
                  >
                    Warden / Synnergyze
                  </Button>
                  <Button
                    component={RouterLink}
                    size="small"
                    to="/devtools"
                    variant="outlined"
                  >
                    DevTools
                  </Button>
                </Box>
              </InfoCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <InfoCard title="Next live adapters">
                <Typography variant="body2" paragraph>
                  1. Alertmanager state and alert lifecycle.
                </Typography>
                <Typography variant="body2" paragraph>
                  2. Loki diagnostic links scoped to the selected estate object.
                </Typography>
                <Typography variant="body2" paragraph>
                  3. RiverOS observations, receipts and verification timeline
                  (health adapter now live).
                </Typography>
                <Typography variant="body2" paragraph>
                  4. Warden decision validity and active support sessions.
                </Typography>
                <Typography variant="body2" paragraph>
                  5. Synnergyze dependency, Matter and capacity projections.
                </Typography>
                <Typography variant="caption">
                  Story projection remains NOT WIRED. The live River API exposes
                  generic events, not a Warden-filtered Story endpoint; a
                  bounded Warden-admitted projection is required before Story
                  state is shown here.
                </Typography>
              </InfoCard>
            </Grid>
          </Grid>
        </Box>
      </Content>
    </Page>
  );
};
