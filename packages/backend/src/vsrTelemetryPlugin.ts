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
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';

const REQUEST_TIMEOUT_MS = 8_000;

const joinUrl = (baseUrl: string, path: string) =>
  `${baseUrl.replace(/\/$/, '')}${path}`;

export const vsrTelemetryPlugin = createBackendPlugin({
  pluginId: 'vsr-telemetry',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
      },
      async init({ config, httpAuth, httpRouter, logger }) {
        const prometheusBaseUrl =
          config.getOptionalString('vsr.telemetry.prometheusBaseUrl') ??
          'http://127.0.0.1:9090';
        const riverBaseUrl =
          config.getOptionalString('vsr.telemetry.riverBaseUrl') ??
          'http://127.0.0.1:8000';

        httpRouter.use(async (req, res, next) => {
          const target =
            req.path === '/prometheus/up'
              ? joinUrl(prometheusBaseUrl, '/api/v1/query?query=up')
              : req.path === '/river/health'
                ? joinUrl(riverBaseUrl, '/health')
                : undefined;

          if (!target) {
            next();
            return;
          }

          if (req.method !== 'GET') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
          }

          try {
            await httpAuth.credentials(req, { allow: ['user'] });
          } catch (error) {
            next(error);
            return;
          }

          const controller = new AbortController();
          const timeout = setTimeout(
            () => controller.abort(),
            REQUEST_TIMEOUT_MS,
          );

          try {
            const upstream = await fetch(target, {
              method: 'GET',
              signal: controller.signal,
              headers: { accept: 'application/json' },
            });

            if (!upstream.ok) {
              logger.warn(
                'VSR telemetry upstream returned a non-success status',
                {
                  route: req.path,
                  upstreamStatus: upstream.status,
                },
              );
              res.status(502).json({ error: 'Telemetry upstream unavailable' });
              return;
            }

            res.status(200).json(await upstream.json());
          } catch (error) {
            logger.warn('VSR telemetry upstream request failed', {
              route: req.path,
              error: error instanceof Error ? error.message : String(error),
            });
            res.status(502).json({ error: 'Telemetry upstream unavailable' });
          } finally {
            clearTimeout(timeout);
          }
        });
      },
    });
  },
});
