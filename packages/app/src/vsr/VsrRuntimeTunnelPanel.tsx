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

import { InfoCard } from '@backstage/core-components';
import Box from '@material-ui/core/Box';
import Chip from '@material-ui/core/Chip';
import Typography from '@material-ui/core/Typography';

const tunnelSteps = [
  {
    position: '1A',
    code: '1A',
    label: 'ORIGIN_LIGHT',
    detail: 'Canonical origin state',
  },
  {
    position: 'gate-entry',
    code: 'GATE',
    label: 'ENTRY GATE',
    detail: 'SILK DAM boundary',
  },
  {
    position: '0',
    code: '0',
    label: 'TUNNEL_DARK',
    detail: 'Canonical tunnel state',
  },
  {
    position: 'gate-exit',
    code: 'GATE',
    label: 'EXIT GATE',
    detail: 'SILK DAM boundary',
  },
  {
    position: '1B',
    code: '1B',
    label: 'RETURN_LIGHT',
    detail: 'Canonical return state',
  },
] as const;
export const VsrRuntimeTunnelPanel = () => (
  <InfoCard
    title="Canonical runtime tunnel"
    subheader="RUNTIME-TUNNEL-101 · 1A → gate → 0 → gate → 1B"
  >
    <Typography variant="body2" paragraph>
      The tunnel is a state projection. Gates bound entry and exit; they do not
      become state and they do not grant authority.
    </Typography>

    <Box
      aria-label="Canonical runtime tunnel sequence"
      component="ol"
      data-testid="runtime-tunnel-101"
      display="flex"
      alignItems="stretch"
      flexWrap="wrap"
      gridGap={8}
      m={0}
      p={0}
    >
      {tunnelSteps.map((step, index) => (
        <Box
          key={step.position}
          component="li"
          data-tunnel-position={step.position}
          data-testid={`runtime-tunnel-step-${step.position}`}
          display="flex"
          alignItems="center"
          gridGap={8}
          style={{ listStyle: 'none' }}
        >
          {index > 0 && (
            <Typography aria-hidden="true" variant="body2">
              →
            </Typography>
          )}
          <Box
            minWidth={116}
            border={1}
            borderColor="divider"
            borderRadius={4}
            px={1.5}
            py={1}
          >
            <Chip size="small" label={step.code} />
            <Typography variant="subtitle2">{step.label}</Typography>
            <Typography variant="caption">{step.detail}</Typography>
          </Box>
        </Box>
      ))}
    </Box>

    <Box
      data-testid="spotlight-pulse-010"
      mt={2}
      p={1.5}
      border={1}
      borderColor="divider"
      borderRadius={4}
    >
      <Box display="flex" alignItems="center" gridGap={8} flexWrap="wrap">
        <Chip size="small" label="SPOTLIGHT-PULSE-010" />
        <Typography variant="subtitle2">Spotlight pulse · 0 → 1 → 0</Typography>
      </Box>
      <Typography variant="body2">
        Separate session/focus pulse. It does not replace, advance, or rewind
        the canonical runtime-tunnel states.
      </Typography>
    </Box>
    <Box
      data-testid="sentinel-temporal-observer"
      mt={2}
      p={1.5}
      border={1}
      borderColor="divider"
      borderRadius={4}
    >
      <Box display="flex" alignItems="center" gridGap={8} flexWrap="wrap">
        <Chip size="small" label="SENTINEL" />
        <Typography variant="subtitle2">
          Temporal validity observer only
        </Typography>
      </Box>
      <Typography variant="body2">
        Sentinel observes freshness, expiry and supersession. It does not
        execute, transition 1A/0/1B, authorize a gate, or generate the Spotlight
        pulse.
      </Typography>
    </Box>
  </InfoCard>
);
