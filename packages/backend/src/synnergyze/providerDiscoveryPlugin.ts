import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import {
  capabilitySignalsFromSnapshot,
  discoverLocalStackCapabilities,
} from './localstackCapabilityDiscovery';

export const synnergyzeProviderDiscoveryPlugin = createBackendPlugin({
  pluginId: 'synnergyze-provider-discovery',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
      },
      async init({ config, logger }) {
        const enabled =
          config.getOptionalBoolean(
            'synnergyze.capabilityDiscovery.localstack.enabled',
          ) ?? false;

        if (!enabled) {
          logger.info('LocalStack capability discovery is disabled');
          return;
        }

        const endpoint =
          config.getOptionalString(
            'synnergyze.capabilityDiscovery.localstack.endpoint',
          ) ?? 'http://localhost.localstack.cloud:4566';

        const nodeId =
          config.getOptionalString('synnergyze.node.id') ?? 'ALPHA-NODE-001';

        const timeoutMs =
          config.getOptionalNumber(
            'synnergyze.capabilityDiscovery.localstack.timeoutMs',
          ) ?? 3000;

        try {
          const snapshot = await discoverLocalStackCapabilities({
            endpoint,
            nodeId,
            timeoutMs,
          });
          const signals = capabilitySignalsFromSnapshot(snapshot);

          const running = snapshot.capabilities.filter(
            capability => capability.runtimeState === 'RUNNING',
          ).length;
          const available = snapshot.capabilities.filter(
            capability => capability.runtimeState === 'AVAILABLE',
          ).length;

          logger.info('Synnergyze LocalStack capability discovery completed', {
            provider: snapshot.provider.id,
            providerFamily: snapshot.provider.family,
            providerVersion: snapshot.provider.version,
            nodeId: snapshot.nodeId,
            discoveredCapabilities: snapshot.capabilities.length,
            runningCapabilities: running,
            availableCapabilities: available,
            normalizedSignals: signals.length,
          });
        } catch (error) {
          logger.warn('Synnergyze LocalStack capability discovery unavailable', {
            endpoint,
            nodeId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    });
  },
});
