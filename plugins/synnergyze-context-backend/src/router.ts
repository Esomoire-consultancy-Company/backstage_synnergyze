import {
  HttpAuthService,
  PermissionsService,
  UserInfoService,
} from '@backstage/backend-plugin-api';
import {
  ContextTransitionEvent,
  OperatingContext,
  parseContextRequest,
  synnergyzeBillingReadPermission,
} from '@esomoire/backstage-plugin-synnergyze-context-common';
import {
  RiverContextObserver,
  SynnergyzeOperatingContextService,
  WardenContextAuthorizer,
} from '@esomoire/backstage-plugin-synnergyze-context-node';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import express from 'express';
import Router from 'express-promise-router';
import { randomUUID } from 'node:crypto';

export interface RouterOptions {
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
  store: SynnergyzeOperatingContextService;
  permissions: PermissionsService;
  authorizer?: WardenContextAuthorizer;
  observer?: RiverContextObserver;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { httpAuth, userInfo, store } = options;
  const router = Router();
  router.use(express.json());

  const principalFor = async (req: express.Request): Promise<string> => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const info = await userInfo.getUserInfo(credentials);
    return info.userEntityRef;
  };

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      authorizationProvider: Boolean(options.authorizer),
      observationProvider: Boolean(options.observer),
    });
  });

  router.get('/context', async (req, res) => {
    const principal = await principalFor(req);
    const context = await store.get(principal);

    if (!context) {
      res.status(404).json({
        error: 'No active operating context',
      });
      return;
    }

    res.json(context);
  });

  router.get('/context/options', async (req, res) => {
    if (!options.authorizer) {
      res.status(503).json({
        error: 'No Warden context authorizer is registered',
      });
      return;
    }

    if (!options.authorizer.listEligibleContexts) {
      res.json({
        discoveryAvailable: false,
        options: [],
      });
      return;
    }

    const principal = await principalFor(req);
    const contextOptions = await options.authorizer.listEligibleContexts({
      principal,
    });

    res.json({
      discoveryAvailable: true,
      options: contextOptions,
    });
  });

  router.get('/billing/scope', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const info = await userInfo.getUserInfo(credentials);
    const contextBefore = await store.get(info.userEntityRef);

    if (!contextBefore) {
      res.status(403).json({
        error: 'No active operating context',
      });
      return;
    }

    const [decision] = await options.permissions.authorize(
      [{ permission: synnergyzeBillingReadPermission }],
      { credentials },
    );

    if (!decision || decision.result !== AuthorizeResult.ALLOW) {
      res.status(403).json({
        error: 'Billing access is not authorized in the active operating context',
      });
      return;
    }

    const context = await store.get(info.userEntityRef);
    if (
      !context ||
      context.wardenDecisionRef !== contextBefore.wardenDecisionRef ||
      context.riverSessionRef !== contextBefore.riverSessionRef
    ) {
      res.status(409).json({
        error: 'Operating context changed during billing authorization; retry',
      });
      return;
    }

    if (context.role === 'admin' && context.scope.type === 'estate') {
      res.json({
        mode: 'estate',
        estateRef: context.scope.estateRef,
        spotlightRef: context.spotlightRef,
        wardenDecisionRef: context.wardenDecisionRef,
        riverSessionRef: context.riverSessionRef,
      });
      return;
    }

    if (context.role === 'developer' && context.scope.type === 'company') {
      res.json({
        mode: 'company',
        companyRef: context.scope.companyRef,
        ...(context.scope.workspaceRef
          ? { workspaceRef: context.scope.workspaceRef }
          : {}),
        ...(context.scope.projectRef
          ? { projectRef: context.scope.projectRef }
          : {}),
        spotlightRef: context.spotlightRef,
        wardenDecisionRef: context.wardenDecisionRef,
        riverSessionRef: context.riverSessionRef,
      });
      return;
    }

    res.status(403).json({
      error: 'Active operating context has an invalid billing scope',
    });
  });

  router.post('/context/resolve', async (req, res) => {
    if (!options.authorizer) {
      res.status(503).json({
        error: 'No Warden context authorizer is registered',
      });
      return;
    }

    const principal = await principalFor(req);
    let request;
    try {
      request = parseContextRequest(req.body);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid context request',
      });
      return;
    }

    const result = await options.authorizer.authorize({
      principal,
      request,
    });

    if (!result.authorized) {
      res.status(403).json({
        authorized: false,
        reason: result.reason,
      });
      return;
    }

    if (result.decision.principal !== principal) {
      res.status(502).json({
        error: 'Warden decision principal does not match authenticated principal',
      });
      return;
    }

    res.json({
      authorized: true,
      decision: result.decision,
    });
  });

  router.post('/context/transition', async (req, res) => {
    if (!options.authorizer) {
      res.status(503).json({
        error: 'No Warden context authorizer is registered',
      });
      return;
    }

    if (!options.observer) {
      res.status(503).json({
        error: 'No River context observer is registered',
      });
      return;
    }

    const principal = await principalFor(req);
    let request;
    try {
      request = parseContextRequest(req.body);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid context request',
      });
      return;
    }

    const previousContext = await store.get(principal);

    const authorization = await options.authorizer.authorize({
      principal,
      request,
    });

    if (!authorization.authorized) {
      res.status(403).json({
        authorized: false,
        reason: authorization.reason,
      });
      return;
    }

    if (authorization.decision.principal !== principal) {
      res.status(502).json({
        error: 'Warden decision principal does not match authenticated principal',
      });
      return;
    }

    const event: ContextTransitionEvent = {
      eventId: randomUUID(),
      eventType: 'synnergyze.context.transitioned',
      occurredAt: new Date().toISOString(),
      principal,
      ...(previousContext ? { previousContext } : {}),
      decision: authorization.decision,
    };

    // Evidence must be committed before active context changes.
    const receipt = await options.observer.recordTransition(event);

    const context: OperatingContext = {
      principal,
      role: authorization.decision.role,
      scope: authorization.decision.scope,
      spotlightRef: authorization.decision.spotlightRef,
      wardenDecisionRef: authorization.decision.decisionRef,
      authorityExpiresAt: authorization.decision.authorityExpiresAt,
      riverSessionRef: receipt.riverSessionRef,
    };

    await store.set(context);
    res.json(context);
  });

  return router;
}
