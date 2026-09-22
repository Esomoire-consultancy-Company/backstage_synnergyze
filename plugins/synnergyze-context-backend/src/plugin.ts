import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import {
  RiverContextObserver,
  synnergyzeContextAuthorizationExtensionPoint,
  synnergyzeContextObservationExtensionPoint,
  WardenContextAuthorizer,
  synnergyzeOperatingContextServiceRef,
} from '@esomoire/backstage-plugin-synnergyze-context-node';
import { createRouter } from './router';

class ContextAuthorizationExtensionPointImpl {
  #authorizer: WardenContextAuthorizer | undefined;

  setAuthorizer(authorizer: WardenContextAuthorizer): void {
    if (this.#authorizer) {
      throw new Error('Synnergyze context authorizer is already registered');
    }
    this.#authorizer = authorizer;
  }

  get authorizer(): WardenContextAuthorizer | undefined {
    return this.#authorizer;
  }
}

class ContextObservationExtensionPointImpl {
  #observer: RiverContextObserver | undefined;

  setObserver(observer: RiverContextObserver): void {
    if (this.#observer) {
      throw new Error('Synnergyze context observer is already registered');
    }
    this.#observer = observer;
  }

  get observer(): RiverContextObserver | undefined {
    return this.#observer;
  }
}

export const synnergyzeContextPlugin = createBackendPlugin({
  pluginId: 'synnergyze-context',
  register(env) {
    const authorization = new ContextAuthorizationExtensionPointImpl();
    const observation = new ContextObservationExtensionPointImpl();

    env.registerExtensionPoint(
      synnergyzeContextAuthorizationExtensionPoint,
      authorization,
    );
    env.registerExtensionPoint(
      synnergyzeContextObservationExtensionPoint,
      observation,
    );

    env.registerInit({
      deps: {
        httpAuth: coreServices.httpAuth,
        userInfo: coreServices.userInfo,
        httpRouter: coreServices.httpRouter,
        contextService: synnergyzeOperatingContextServiceRef,
        permissions: coreServices.permissions,
      },
      async init({
        httpAuth,
        userInfo,
        httpRouter,
        contextService,
        permissions,
      }) {
        httpRouter.use(
          await createRouter({
            httpAuth,
            userInfo,
            store: contextService,
            permissions,
            authorizer: authorization.authorizer,
            observer: observation.observer,
          }),
        );

        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
