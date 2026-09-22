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
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
  makeStyles,
} from '@material-ui/core';
import FlareIcon from '@material-ui/icons/Flare';
import WarningIcon from '@material-ui/icons/Warning';
import { useEffect, useMemo, useState } from 'react';
import {
  ContextRequest,
  WardenAuthorizationResult,
} from '../api';
import { useOperatingContext } from '../context';

const useStyles = makeStyles(theme => ({
  trigger: {
    margin: theme.spacing(1),
    minWidth: 0,
    textTransform: 'none',
    justifyContent: 'flex-start',
  },
  triggerText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  statusRow: {
    display: 'flex',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  field: {
    marginTop: theme.spacing(2),
  },
  decision: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  },
  warning: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    color: theme.palette.warning.main,
  },
}));

function contextLabel(
  role?: 'admin' | 'developer',
  scope?: ContextRequest['scope'],
): string {
  if (!role || !scope) {
    return 'NO ACTIVE CONTEXT';
  }

  if (role === 'admin' && scope.type === 'estate') {
    return `ADMIN • ${scope.estateRef}`;
  }

  if (role === 'developer' && scope.type === 'company') {
    return `DEVELOPER • ${scope.projectRef ?? scope.workspaceRef ?? scope.companyRef}`;
  }

  return 'INVALID CONTEXT';
}

function requestFingerprint(request: ContextRequest): string {
  return JSON.stringify(request);
}

export function SpotlightContextControl() {
  const classes = useStyles();
  const {
    context,
    loading,
    error,
    resolve,
    transition,
    refresh,
  } = useOperatingContext();

  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<'admin' | 'developer'>('developer');
  const [estateRef, setEstateRef] = useState('');
  const [companyRef, setCompanyRef] = useState('');
  const [workspaceRef, setWorkspaceRef] = useState('');
  const [projectRef, setProjectRef] = useState('');
  const [spotlightRef, setSpotlightRef] = useState('');
  const [preview, setPreview] =
    useState<WardenAuthorizationResult>();
  const [previewFingerprint, setPreviewFingerprint] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (context) {
      setRole(context.role);
      setSpotlightRef(context.spotlightRef);
      if (context.scope.type === 'estate') {
        setEstateRef(context.scope.estateRef);
        setCompanyRef('');
        setWorkspaceRef('');
        setProjectRef('');
      } else {
        setCompanyRef(context.scope.companyRef);
        setWorkspaceRef(context.scope.workspaceRef ?? '');
        setProjectRef(context.scope.projectRef ?? '');
        setEstateRef('');
      }
    }

    setPreview(undefined);
    setPreviewFingerprint(undefined);
    setDialogError(undefined);
  }, [open, context]);

  const request = useMemo<ContextRequest>(() => {
    if (role === 'admin') {
      return {
        role,
        scope: {
          type: 'estate',
          estateRef: estateRef.trim(),
        },
        ...(spotlightRef.trim()
          ? { spotlightRef: spotlightRef.trim() }
          : {}),
      };
    }

    return {
      role,
      scope: {
        type: 'company',
        companyRef: companyRef.trim(),
        ...(workspaceRef.trim()
          ? { workspaceRef: workspaceRef.trim() }
          : {}),
        ...(projectRef.trim()
          ? { projectRef: projectRef.trim() }
          : {}),
      },
      ...(spotlightRef.trim()
        ? { spotlightRef: spotlightRef.trim() }
        : {}),
    };
  }, [
    role,
    estateRef,
    companyRef,
    workspaceRef,
    projectRef,
    spotlightRef,
  ]);

  const fingerprint = requestFingerprint(request);
  const previewIsCurrent =
    preview?.authorized === true &&
    previewFingerprint === fingerprint;

  const formValid =
    role === 'admin'
      ? estateRef.trim().length > 0
      : companyRef.trim().length > 0;

  const expiresInMs = context
    ? Date.parse(context.authorityExpiresAt) - Date.now()
    : undefined;
  const expiringSoon =
    expiresInMs !== undefined && expiresInMs > 0 && expiresInMs < 5 * 60_000;

  const handlePreview = async () => {
    setBusy(true);
    setDialogError(undefined);

    try {
      const result = await resolve(request);
      setPreview(result);
      setPreviewFingerprint(fingerprint);
    } catch (e) {
      setPreview(undefined);
      setPreviewFingerprint(undefined);
      setDialogError(
        e instanceof Error ? e.message : 'Unable to preview context',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleActivate = async () => {
    if (!previewIsCurrent) {
      return;
    }

    setBusy(true);
    setDialogError(undefined);

    try {
      await transition(request);
      await refresh();
      setOpen(false);
    } catch (e) {
      setDialogError(
        e instanceof Error ? e.message : 'Unable to activate context',
      );
    } finally {
      setBusy(false);
    }
  };

  const activeLabel = contextLabel(context?.role, context?.scope);

  return (
    <>
      <Tooltip title="Spotlight operating context" placement="right">
        <Button
          className={classes.trigger}
          startIcon={<FlareIcon />}
          onClick={() => setOpen(true)}
          fullWidth
          aria-label="Open Spotlight operating context"
        >
          <span className={classes.triggerText}>
            {loading ? 'Loading Spotlight…' : activeLabel}
          </span>
        </Button>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="spotlight-context-title"
      >
        <DialogTitle id="spotlight-context-title">
          Spotlight Operating Context
        </DialogTitle>
        <DialogContent>
          <div className={classes.statusRow}>
            <Chip
              label={context?.role?.toUpperCase() ?? 'NO CONTEXT'}
              size="small"
            />
            {context && (
              <Chip
                label={
                  context.scope.type === 'estate'
                    ? context.scope.estateRef
                    : context.scope.projectRef ??
                      context.scope.workspaceRef ??
                      context.scope.companyRef
                }
                size="small"
                variant="outlined"
              />
            )}
            {context && (
              <Chip
                label={`Expires ${new Date(
                  context.authorityExpiresAt,
                ).toLocaleTimeString()}`}
                size="small"
                variant="outlined"
              />
            )}
          </div>

          {expiringSoon && (
            <Box className={classes.warning}>
              <WarningIcon fontSize="small" />
              <Typography variant="body2">
                Active Warden authority expires in less than five minutes.
              </Typography>
            </Box>
          )}

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          <Divider />

          <FormControl
            fullWidth
            variant="outlined"
            className={classes.field}
          >
            <InputLabel id="spotlight-role-label">Operating role</InputLabel>
            <Select
              labelId="spotlight-role-label"
              value={role}
              onChange={event => {
                setRole(event.target.value as 'admin' | 'developer');
                setPreview(undefined);
                setPreviewFingerprint(undefined);
              }}
              label="Operating role"
            >
              <MenuItem value="developer">Developer</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>

          {role === 'admin' ? (
            <TextField
              className={classes.field}
              fullWidth
              variant="outlined"
              label="Estate reference"
              value={estateRef}
              onChange={event => {
                setEstateRef(event.target.value);
                setPreview(undefined);
                setPreviewFingerprint(undefined);
              }}
              placeholder="estate:default/alpha"
            />
          ) : (
            <>
              <TextField
                className={classes.field}
                fullWidth
                variant="outlined"
                label="Company reference"
                value={companyRef}
                onChange={event => {
                  setCompanyRef(event.target.value);
                  setPreview(undefined);
                  setPreviewFingerprint(undefined);
                }}
                placeholder="company:default/voi-jeans"
              />
              <TextField
                className={classes.field}
                fullWidth
                variant="outlined"
                label="Workspace reference (optional)"
                value={workspaceRef}
                onChange={event => {
                  setWorkspaceRef(event.target.value);
                  setPreview(undefined);
                  setPreviewFingerprint(undefined);
                }}
                placeholder="workspace:default/retail"
              />
              <TextField
                className={classes.field}
                fullWidth
                variant="outlined"
                label="Project reference (optional)"
                value={projectRef}
                onChange={event => {
                  setProjectRef(event.target.value);
                  setPreview(undefined);
                  setPreviewFingerprint(undefined);
                }}
                placeholder="project:default/storefront"
              />
            </>
          )}

          <TextField
            className={classes.field}
            fullWidth
            variant="outlined"
            label="Spotlight reference (optional)"
            value={spotlightRef}
            onChange={event => {
              setSpotlightRef(event.target.value);
              setPreview(undefined);
              setPreviewFingerprint(undefined);
            }}
            placeholder="spotlight:..."
          />

          {dialogError && (
            <Typography color="error" variant="body2" className={classes.field}>
              {dialogError}
            </Typography>
          )}

          {preview && (
            <Box className={classes.decision}>
              <Typography variant="subtitle2">
                Warden preview
              </Typography>
              {preview.authorized ? (
                <>
                  <Typography variant="body2">
                    Authorized: {preview.decision.decisionRef}
                  </Typography>
                  <Typography variant="body2">
                    Expires:{' '}
                    {new Date(
                      preview.decision.authorityExpiresAt,
                    ).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    Scope:{' '}
                    {contextLabel(
                      preview.decision.role,
                      preview.decision.scope,
                    )}
                  </Typography>
                </>
              ) : (
                <Typography color="error" variant="body2">
                  Denied: {preview.reason}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={handlePreview}
            disabled={!formValid || busy}
            variant="outlined"
          >
            {busy && !previewIsCurrent ? (
              <CircularProgress size={18} />
            ) : (
              'Preview with Warden'
            )}
          </Button>
          <Button
            onClick={handleActivate}
            disabled={!previewIsCurrent || busy}
            color="primary"
            variant="contained"
          >
            {busy && previewIsCurrent ? (
              <CircularProgress size={18} />
            ) : (
              'Activate'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
