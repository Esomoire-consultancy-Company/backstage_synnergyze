import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Content,
  ContentHeader,
  Header,
  InfoCard,
  Page,
  Progress,
} from '@backstage/core-components';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import {
  Box,
  Button,
  Chip,
  Grid,
  Tab,
  Tabs,
  Typography,
} from '@material-ui/core';

type ControlTab = 'genesis' | 'synnergyze' | 'warden';

interface ControlItem {
  label: string;
  description: string;
  state: 'ready' | 'planned';
}

const genesisControls: ControlItem[] = [
  {
    label: 'Network',
    description:
      'Client network topology, nodes, locations and runtime relationships.',
    state: 'ready',
  },
  {
    label: 'Nodes',
    description: 'Eligible client nodes and their provisioned runtime state.',
    state: 'ready',
  },
  {
    label: 'Providers',
    description: 'Provider bindings exposed to this client estate.',
    state: 'ready',
  },
  {
    label: 'Runtime',
    description: 'Stack and capability runtime state projected from Genesis.',
    state: 'ready',
  },
];

const synnergyzeControls: ControlItem[] = [
  {
    label: 'Workspaces',
    description: 'Run and control workspaces across eligible Genesis nodes.',
    state: 'ready',
  },
  {
    label: 'Services',
    description: 'Licensed services and client capability entitlements.',
    state: 'ready',
  },
  {
    label: 'Usage',
    description:
      'Workspace and capability usage projected from Synnergyze metering.',
    state: 'planned',
  },
  {
    label: 'Integrations',
    description: 'Client-scoped provider and application integrations.',
    state: 'ready',
  },
];

const ControlCards = ({ items }: { items: ControlItem[] }) => (
  <Grid container spacing={3}>
    {items.map(item => (
      <Grid item xs={12} md={6} key={item.label}>
        <InfoCard
          title={item.label}
          subheader={
            item.state === 'ready' ? 'Control available' : 'Projection planned'
          }
        >
          <Typography variant="body2">{item.description}</Typography>
          <Box mt={2}>
            <Chip
              size="small"
              label={item.state === 'ready' ? 'READY' : 'PLANNED'}
            />
          </Box>
        </InfoCard>
      </Grid>
    ))}
  </Grid>
);

const WardenLivePanel = ({ clientRef }: { clientRef: string }) => (
  <Grid container spacing={3}>
    <Grid item xs={12} md={7}>
      <InfoCard
        title="Warden Live"
        subheader="Governed activity subscription for this client estate"
      >
        <Box mb={2}>
          <Chip size="small" label="SUBSCRIPTION SURFACE" />
        </Box>
        <Typography variant="body2" paragraph>
          Developer and client-admin actions will appear here as a bounded
          execution timeline. Warden supplies authority and scope; provider
          execution receipts and River observations remain separate records.
        </Typography>
        <Typography variant="body2">
          Client: <strong>{clientRef}</strong>
        </Typography>
      </InfoCard>
    </Grid>
    <Grid item xs={12} md={5}>
      <InfoCard title="Expected live stages">
        <Typography variant="body2">
          Request received → principal resolved → scope checked → Warden
          decision → provider execution → provider receipt → River observation →
          client projection refreshed → verification.
        </Typography>
      </InfoCard>
    </Grid>
  </Grid>
);

export const VsrClientControlPage = () => {
  const { clientRef: routeClientRef } = useParams<{ clientRef?: string }>();
  const config = useApi(configApiRef);
  const [tab, setTab] = useState<ControlTab>('genesis');

  const clientRef = routeClientRef || 'CLIENT-001';

  const vsrClientBaseUrl =
    config.getOptionalString('vsr.clientBaseUrl') ?? 'http://localhost:3000';

  const clientUrl = useMemo(
    () =>
      `${vsrClientBaseUrl.replace(/\/$/, '')}/account/${encodeURIComponent(
        clientRef,
      )}`,
    [clientRef, vsrClientBaseUrl],
  );

  return (
    <Page themeId="tool">
      <Header
        title="VSR Client Control"
        subtitle={`${clientRef} · Client Admin projection`}
      />
      <Content>
        <ContentHeader title="Client estate controls">
          <Button
            variant="outlined"
            href={clientUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open client view
          </Button>
        </ContentHeader>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <InfoCard title="Authority model">
              <Typography variant="body2">
                Client Admin operates this bounded estate. Genesis controls the
                network; Synnergyze controls workspaces. VSR Developer access
                requires standing engineering scope or a Warden-authorized
                support session.
              </Typography>
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <InfoCard title="Projection">
              <Typography variant="body2">VSR client account</Typography>
              <Box mt={1}>
                <Chip size="small" label="GOVERNED PROJECTION" />
              </Box>
            </InfoCard>
          </Grid>
        </Grid>

        <Box mt={3} mb={2}>
          <Tabs
            value={tab}
            onChange={(_event, value: ControlTab) => setTab(value)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab value="genesis" label="Genesis" />
            <Tab value="synnergyze" label="Synnergyze" />
            <Tab value="warden" label="Warden Live" />
          </Tabs>
        </Box>

        {tab === 'genesis' && <ControlCards items={genesisControls} />}
        {tab === 'synnergyze' && <ControlCards items={synnergyzeControls} />}
        {tab === 'warden' && <WardenLivePanel clientRef={clientRef} />}
      </Content>
    </Page>
  );
};

export const VsrClientControlLoading = () => <Progress />;
