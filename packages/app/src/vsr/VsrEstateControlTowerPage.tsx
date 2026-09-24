import {
  Content,
  ContentHeader,
  Header,
  InfoCard,
  Page,
} from '@backstage/core-components';
import {
  Box,
  Button,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@material-ui/core';

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
  entryHref: string;
}

const healthDimensions: HealthDimension[] = [
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
    description: 'Upstream and downstream acceptance, handoff and workflow state.',
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
    description: 'Observation, receipt, provenance and verification continuity.',
  },
  {
    name: 'Capacity',
    state: 'unknown',
    source: 'Synnergyze capacity',
    description: 'Human, agent, compute, provider and physical allocable capacity.',
  },
  {
    name: 'Continuity',
    state: 'unknown',
    source: 'Genesis + RiverOS',
    description: 'Connection, replay and reconstructability after interruption.',
  },
  {
    name: 'Transaction',
    state: 'unknown',
    source: 'SILK / provider receipts',
    description: 'Settlement, reconciliation and economic execution state.',
  },
];

const signals: EstateSignal[] = [
  {
    id: 'ESTATE-SIGNAL-BOOTSTRAP-001',
    severity: 'info',
    scope: 'VSR > Alpha > ALPHA-NODE-001',
    subject: 'Estate telemetry adapters',
    observedState:
      'Control Tower shell is active; live River, Prometheus, Loki and Alertmanager adapters are not connected to this page yet.',
    entrySurface: 'Client Control',
    entryHref: '/vsr/clients/CLIENT-001',
  },
];

const stateLabel = (state: HealthState) => state.toUpperCase();

export const VsrEstateControlTowerPage = () => (
  <Page themeId="tool">
    <Header
      title="VSR Estate Control Tower"
      subtitle="Admin estate view · investigate first, terminal last"
    />
    <Content>
      <ContentHeader title="Estate">
        <Button variant="outlined" href="/vsr/clients/CLIENT-001">
          Open Client Control
        </Button>
      </ContentHeader>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <InfoCard
            title="ALPHA-NODE-001"
            subheader="Genesis estate seed · live adapters pending"
          >
            <Typography variant="body2" paragraph>
              Navigate the estate from canonical objects and signals. Health is
              not inferred from the UI: each dimension remains UNKNOWN until its
              authoritative source is connected.
            </Typography>
            <Box display="flex" gridGap={8} flexWrap="wrap">
              <Chip size="small" label="GENESIS REGISTERED" />
              <Chip size="small" label="LIVE TELEMETRY PENDING" />
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
        <Grid container spacing={3}>
          {healthDimensions.map(dimension => (
            <Grid item xs={12} sm={6} md={4} key={dimension.name}>
              <InfoCard
                title={dimension.name}
                subheader={dimension.source}
              >
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
                      size="small"
                      variant="outlined"
                      href={signal.entryHref}
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
                <Button size="small" variant="outlined" href="/catalog">
                  Genesis / Catalog
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  href="/vsr/clients/CLIENT-001"
                >
                  Warden / Synnergyze
                </Button>
                <Button size="small" variant="outlined" href="/devtools">
                  DevTools
                </Button>
              </Box>
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoCard title="Next live adapters">
              <Typography variant="body2" paragraph>
                1. Prometheus estate metrics and Alertmanager state.
              </Typography>
              <Typography variant="body2" paragraph>
                2. Loki diagnostic links scoped to the selected estate object.
              </Typography>
              <Typography variant="body2" paragraph>
                3. RiverOS observations, receipts and verification timeline.
              </Typography>
              <Typography variant="body2" paragraph>
                4. Warden decision validity and active support sessions.
              </Typography>
              <Typography variant="body2">
                5. Synnergyze dependency, Matter and capacity projections.
              </Typography>
            </InfoCard>
          </Grid>
        </Grid>
      </Box>
    </Content>
  </Page>
);
