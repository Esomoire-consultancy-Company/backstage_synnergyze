import {
  HttpAuthService,
  UserInfoService,
} from '@backstage/backend-plugin-api';
import {
  ContextTransitionEvent,
  OperatingContext,
  parseContextRequest,
} from '@esomoire/backstage-plugin-synnergyze-context-common';
import {
  RiverContextObserver,
  WardenContextAuthorizer,
} from '@esomoire/backstage-plugin-synnergyze-context-node';
import express from 'express';
import Router from 'express-promise-router';
import { randomUUID } from 'node:crypto';
import { OperatingContextStore } from './store';

export interface RouterOptions {
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
  store: OperatingContextStore;
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
