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
import { useEffect, useState } from 'react';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { InfoCard } from '@backstage/core-components';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import {
  projectRuntimeTunnel,
  runtimeTunnelSteps,
  TunnelStep,
} from './runtimeTunnel';

const labels: Record<TunnelStep, string> = {
  ORIGIN_LIGHT: '1A · Origin light',
  SILK_DAM_ENTRY: 'SILK DAM entry gate',
  TUNNEL_DARK: '0 · Tunnel dark',
  SILK_DAM_EXIT: 'SILK DAM exit gate',
  RETURN_LIGHT: '1B · Return light',
};

export function RuntimeTunnelView({
  input,
  subjectRef,
  asOf,
}: {
  input: unknown;
  subjectRef: string;
  asOf: number;
}) {
  const projection = projectRuntimeTunnel(input, subjectRef, asOf);
  const [focus, setFocus] = useState<TunnelStep>();
  const snapshot = projection.snapshot;
  const illuminated = snapshot?.observations.some(item => item.step === focus);
  return (
    <InfoCard title="Runtime tunnel" subheader="Stage + Glass + Spotlight">
      <Typography variant="body2" paragraph>
        Light, through uncertainty, to evidence-backed understanding. Darkness
        is unresolved context, not service failure.
      </Typography>
      <Typography component="p" role="status">
        Sentinel Clock: {projection.temporal.toUpperCase()}
      </Typography>
      <Typography variant="body2" paragraph>
        {projection.phase
          ? `${
              projection.temporal === 'stale' ? 'Last observed' : 'Observed'
            }: ${labels[projection.phase]}`
          : 'Tunnel state unknown. Awaiting a permitted canonical River Story projection.'}
      </Typography>
      {projection.boundary && (
        <Typography variant="body2">
          Boundary observed: {labels[projection.boundary]}
        </Typography>
      )}
      <Box
        component="ol"
        aria-label="RUNTIME-TUNNEL-101"
        display="flex"
        flexWrap="wrap"
        gridGap={12}
        p={0}
        style={{ listStyle: 'none' }}
      >
        {runtimeTunnelSteps.map(step => {
          const observed = snapshot?.observations.find(
            item => item.step === step,
          );
          return (
            <Box
              component="li"
              key={step}
              p={2}
              border={1}
              borderRadius={4}
              aria-current={projection.phase === step ? 'step' : undefined}
              bgcolor={step === 'TUNNEL_DARK' ? '#202936' : 'background.paper'}
              color={step === 'TUNNEL_DARK' ? '#ffffff' : 'text.primary'}
            >
              <Typography>{labels[step]}</Typography>
              <Typography variant="caption">
                {observed ? 'Evidence available' : 'Not observed'}
              </Typography>
              <Box mt={1}>
                <Button
                  size="small"
                  color="inherit"
                  variant="outlined"
                  disabled={!observed}
                  onClick={() => setFocus(step)}
                >
                  Inspect {labels[step]}
                </Button>
              </Box>
            </Box>
          );
        })}
      </Box>
      <Typography variant="body2" paragraph>
        Spotlight pulse (SPOTLIGHT-PULSE-010): peripheral dark → illuminated →
        peripheral dark. Focus changes the view only; it cannot move the journey
        through a gate.
      </Typography>
      <Typography variant="body2">
        Spotlight: {illuminated ? 'ILLUMINATED' : 'PERIPHERAL DARK'}
      </Typography>
      {illuminated && (
        <Button onClick={() => setFocus(undefined)}>
          Return to peripheral dark
        </Button>
      )}
      {snapshot && (
        <Box mt={2}>
          <Typography variant="body2">
            River Story: {snapshot.storyRef} · Revision: {snapshot.revision}
          </Typography>
          <Typography variant="body2">
            Observed: {snapshot.observedAt} · Valid until: {snapshot.validUntil}
          </Typography>
          <Typography variant="body2">
            Interpretation reference: {snapshot.interpretation.decisionRef}
          </Typography>
          <Box component="ol" aria-label="River Story chronology">
            {snapshot.observations
              .filter(item => !illuminated || item.step === focus)
              .map(item => (
                <li key={item.evidenceRef}>
                  <Typography variant="body2">
                    {item.observedAt} — {item.summary}
                  </Typography>
                  <Typography variant="caption">
                    Evidence: {item.evidenceRef}
                    {item.gateRef &&
                      ` · Gate: ${item.gateRef} · Passage: ${item.passageDecisionRef}`}
                  </Typography>
                </li>
              ))}
          </Box>
        </Box>
      )}
      <Typography variant="caption" component="p">
        Sentinel observes temporal validity only. Genesis owns identity, River
        supplies chronology, Warden governs interpretation and passage, and SILK
        DAM supplies gates.
      </Typography>
    </InfoCard>
  );
}

/** The optional proxy must point to an authenticated, Warden-filtered read service. */
export function RuntimeTunnelPanel({ subjectRef }: { subjectRef: string }) {
  const discovery = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const [input, setInput] = useState<unknown>();
  const [asOf, setAsOf] = useState(Date.now());
  useEffect(() => {
    let active = true;
    let pending = false;
    let controller: AbortController | undefined;
    setInput(undefined);
    const refresh = async () => {
      if (pending) return;
      pending = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 10000);
      try {
        const baseUrl = await discovery.getBaseUrl('proxy');
        if (!active) return;
        const response = await fetchApi.fetch(
          `${baseUrl}/vsr-runtime-tunnel?subjectRef=${encodeURIComponent(
            subjectRef,
          )}`,
          { signal: controller.signal, cache: 'no-store' },
        );
        if (!response.ok) throw new Error('Projection unavailable');
        const value: unknown = await response.json();
        if (active) setInput(value);
      } catch {
        if (active) setInput(undefined);
      } finally {
        window.clearTimeout(timeout);
        pending = false;
      }
    };
    void refresh();
    const refreshTimer = window.setInterval(refresh, 30000);
    const clockTimer = window.setInterval(() => setAsOf(Date.now()), 1000);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(refreshTimer);
      window.clearInterval(clockTimer);
    };
  }, [discovery, fetchApi, subjectRef]);
  return (
    <RuntimeTunnelView input={input} subjectRef={subjectRef} asOf={asOf} />
  );
}
