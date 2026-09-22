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
    position: 'fixed',
    top: theme.spacing(1),
    right: theme.spacing(2),
    zIndex: theme.zIndex.modal - 1,
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'center',
    padding: theme.spacing(0.5),
    borderRadius: theme.shape.borderRadius,
    pointerEvents: 'none',
  },
}));

export function SpotlightContextRibbon() {
  const classes = useStyles();
  const { context, loading, error } = useOperatingContext();

  if (loading) {
    return (
      <Paper className={classes.root} elevation={2}>
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
      <Paper className={classes.root} elevation={2}>
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

  return (
    <Paper className={classes.root} elevation={2}>
      <Tooltip
        title={`Warden: ${context.wardenDecisionRef} • River: ${context.riverSessionRef}`}
      >
        <Chip
          icon={expired ? <WarningIcon /> : <FlareIcon />}
          label={`Spotlight: ${scopeLabel} • ${context.role.toUpperCase()}`}
          size="small"
        />
      </Tooltip>
    </Paper>
  );
}
