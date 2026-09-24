import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Content,
  ContentHeader,
  Header,
  InfoCard,
  Page,
} from '@backstage/core-components';
import { Box, Chip, Grid, Tab, Tabs, Typography } from '@material-ui/core';

type ClientTab = 'overview' | 'genesis' | 'synnergyze' | 'warden';

const ClientStatusCard = ({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) => (
  <InfoCard title={title}>
    <Typography variant="h6">{value}</Typography>
    <Typography variant="body2">{detail}</Typography>
  </InfoCard>
);

export const VsrClientAccountPage = () => {
  const { clientRef: routeClientRef } = useParams<{ clientRef?: string }>();
  const clientRef = routeClientRef || 'CLIENT-001';
  const [tab, setTab] = useState<ClientTab>('overview');

  return (
    <Page themeId="home">
      <Header
        title="Virtual Silk Road"
        subtitle={`${clientRef} · Client Admin account`}
      />
      <Content>
        <ContentHeader title="My Estate">
          <Chip size="small" label="CLIENT ADMIN" />
        </ContentHeader>

        <Box mb={3}>
          <Tabs
            value={tab}
            onChange={(_event, value: ClientTab) => setTab(value)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab value="overview" label="Overview" />
            <Tab value="genesis" label="Genesis" />
            <Tab value="synnergyze" label="Synnergyze" />
            <Tab value="warden" label="Warden" />
          </Tabs>
        </Box>

        {tab === 'overview' && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <ClientStatusCard
                title="Genesis"
                value="Network"
                detail="Configure the nodes, provider bindings and runtime estate available to this client."
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <ClientStatusCard
                title="Synnergyze"
                value="Workspaces"
                detail="Run and control licensed workspaces across eligible Genesis nodes."
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <ClientStatusCard
                title="Warden"
                value="Authority"
                detail="Review bounded permissions, developer support sessions and live decisions."
              />
            </Grid>
          </Grid>
        )}

        {tab === 'genesis' && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <InfoCard title="Network">
                <Typography variant="body2">
                  Network configuration is projected from Genesis. Client Admin
                  actions are limited to Warden-authorized node, provider and
                  runtime controls.
                </Typography>
              </InfoCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <InfoCard title="Nodes">
                <Typography variant="body2">
                  Eligible nodes and their runtime state will appear here from
                  the canonical Genesis registry.
                </Typography>
              </InfoCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <InfoCard title="Providers">
                <Typography variant="body2">
                  Provider bindings are visible only within this client's
                  licensed and authorized estate.
                </Typography>
              </InfoCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <InfoCard title="Runtime">
                <Typography variant="body2">
                  Stack health and capability availability are projected from
                  the underlying runtime without exposing developer secrets.
                </Typography>
              </InfoCard>
            </Grid>
          </Grid>
        )}

        {tab === 'synnergyze' && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <InfoCard title="Workspaces">
                <Typography variant="body2">
                  Start, stop and assign eligible workspaces to the Genesis
                  nodes permitted for this client.
                </Typography>
              </InfoCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <InfoCard title="Services">
                <Typography variant="body2">
                  Licensed services and capability entitlements are projected
                  from Synnergyze.
                </Typography>
              </InfoCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <InfoCard title="Usage">
                <Typography variant="body2">
                  Usage and metering are read from canonical workspace activity
                  and remain distinct from billing policy.
                </Typography>
              </InfoCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <InfoCard title="Integrations">
                <Typography variant="body2">
                  Client-scoped integrations can be managed here without
                  exposing provider-native developer credentials.
                </Typography>
              </InfoCard>
            </Grid>
          </Grid>
        )}

        {tab === 'warden' && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <InfoCard title="Warden Live">
                <Typography variant="body2" paragraph>
                  This is the client-side view of governed activity. Client
                  Admin can see decisions affecting the estate and any active
                  VSR Developer support session.
                </Typography>
                <Chip size="small" label="LIVE SUBSCRIPTION READY" />
              </InfoCard>
            </Grid>
            <Grid item xs={12} md={5}>
              <InfoCard title="Developer support">
                <Typography variant="body2">
                  A VSR Developer session must carry purpose, scope, capability
                  set, Warden decision, start time and expiry. The client can
                  observe the session while it is active.
                </Typography>
              </InfoCard>
            </Grid>
          </Grid>
        )}
      </Content>
    </Page>
  );
};
