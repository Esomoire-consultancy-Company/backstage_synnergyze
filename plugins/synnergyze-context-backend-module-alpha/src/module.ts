import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  synnergyzeContextAuthorizationExtensionPoint,
  synnergyzeContextObservationExtensionPoint,
} from '@esomoire/backstage-plugin-synnergyze-context-node';
import {
  HttpRiverContextObserver,
  HttpWardenContextAuthorizer,
} from './providers';

export const alphaSynnergyzeContextModule = createBackendModule({
  pluginId: 'synnergyze-context',
  moduleId: 'alpha-warden-river',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        authorization: synnergyzeContextAuthorizationExtensionPoint,
        observation: synnergyzeContextObservationExtensionPoint,
      },
      async init({ config, logger, authorization, observation }) {
        const wardenBaseUrl = config.getOptionalString(
          'synnergyze.context.warden.baseUrl',
        );
        const riverBaseUrl = config.getOptionalString(
          'synnergyze.context.river.baseUrl',
        );

        if (wardenBaseUrl) {
          authorization.setAuthorizer(
            new HttpWardenContextAuthorizer({
              baseUrl: wardenBaseUrl,
              path:
                config.getOptionalString(
                  'synnergyze.context.warden.authorizePath',
                ) ?? '/authorize',
              listPath:
                config.getOptionalString(
                  'synnergyze.context.warden.optionsPath',
                ) ?? '/contexts',
              bearerToken: config.getOptionalString(
                'synnergyze.context.warden.bearerToken',
              ),
            }),
          );
        } else {
          logger.warn(
            'Synnergyze context Warden adapter is not configured; authorization will fail closed',
          );
        }

        if (riverBaseUrl) {
          observation.setObserver(
            new HttpRiverContextObserver({
              baseUrl: riverBaseUrl,
              path:
                config.getOptionalString(
                  'synnergyze.context.river.transitionPath',
                ) ?? '/events/context-transition',
              bearerToken: config.getOptionalString(
                'synnergyze.context.river.bearerToken',
              ),
            }),
          );
        } else {
          logger.warn(
            'Synnergyze context River adapter is not configured; transitions will fail closed',
          );
        }
      },
    });
  },
});
