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

import {
  Chip,
  Paper,
  Tooltip,
  makeStyles,
} from '@material-ui/core';
import FlareIcon from '@material-ui/icons/Flare';
import WarningIcon from '@material-ui/icons/Warning';
import { useOperatingContext } from '../context';

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing(1),
    alignItems: 'center',
    padding: theme.spacing(0.5, 2),
    borderRadius: 0,
  },
}));

export function SpotlightContextRibbon() {
  const classes = useStyles();
  const { context, loading, error } = useOperatingContext();

  if (loading) {
    return (
      <Paper
        className={classes.root}
        elevation={2}
        role="status"
        aria-live="polite"
      >
        <Chip
          icon={<FlareIcon />}
          label="Spotlight • loading"
          size="small"
        />
      </Paper>
    );
  }

  if (!context) {
    return (
      <Paper
        className={classes.root}
        elevation={2}
        role="status"
        aria-live="polite"
      >
        <Tooltip title={error ?? 'No active Warden-authorized context'}>
          <Chip
            icon={<WarningIcon />}
            label="Spotlight • NO CONTEXT"
            size="small"
          />
        </Tooltip>
      </Paper>
    );
  }

  const scopeLabel =
    context.scope.type === 'estate'
      ? context.scope.estateRef
      : context.scope.projectRef ??
        context.scope.workspaceRef ??
        context.scope.companyRef;

  const expired = Date.parse(context.authorityExpiresAt) <= Date.now();
  let status: 'ACTIVE' | 'DEGRADED' | 'EXPIRED' = 'ACTIVE';
  if (expired) {
    status = 'EXPIRED';
  } else if (error) {
    status = 'DEGRADED';
  }
  const degraded = status !== 'ACTIVE';
  const visibleLabel =
    status === 'ACTIVE'
      ? `Spotlight: ${scopeLabel} • ${context.role.toUpperCase()}`
      : `Spotlight: ${scopeLabel} • ${context.role.toUpperCase()} • ${status}`;
  const accessibleLabel =
    `Spotlight context ${scopeLabel}, role ${context.role}, status ${status.toLowerCase()}`;

  return (
    <Paper
      className={classes.root}
      elevation={2}
      role="status"
      aria-live="polite"
    >
      <Tooltip
        title={
          error
            ? `${accessibleLabel}. ${error}. Warden: ${context.wardenDecisionRef}`
            : `${accessibleLabel}. Warden: ${context.wardenDecisionRef} • River: ${context.riverSessionRef}`
        }
      >
        <Chip
          icon={degraded ? <WarningIcon /> : <FlareIcon />}
          label={visibleLabel}
          aria-label={accessibleLabel}
          size="small"
        />
      </Tooltip>
    </Paper>
  );
}
