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

import { MockFetchApi, registerMswTestHooks } from '@backstage/test-utils';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { SynnergyzeContextClient } from './SynnergyzeContextClient';

const server = setupServer();
const baseUrl = 'http://backstage/api/synnergyze-context';
const discoveryApi = { getBaseUrl: async () => baseUrl };
const fetchApi = new MockFetchApi();

describe('SynnergyzeContextClient', () => {
  registerMswTestHooks(server);

  let client: SynnergyzeContextClient;

  beforeEach(() => {
    client = new SynnergyzeContextClient({ discoveryApi, fetchApi });
  });

  it('returns undefined when there is no active context', async () => {
    server.use(
      http.get(`${baseUrl}/context`, () =>
        HttpResponse.json(
          { error: 'No active operating context' },
          { status: 404 },
        ),
      ),
    );

    await expect(client.getActiveContext()).resolves.toBeUndefined();
  });

  it('loads Warden-discovered eligible contexts', async () => {
    server.use(
      http.get(`${baseUrl}/context/options`, () =>
        HttpResponse.json({
          discoveryAvailable: true,
          options: [
            {
              id: 'voi-developer',
              label: 'VOI Jeans — Developer',
              role: 'developer',
              scope: {
                type: 'company',
                companyRef: 'company:default/voi-jeans',
              },
              spotlightRef: 'spotlight:voi-jeans',
            },
          ],
        }),
      ),
    );

    await expect(client.listEligibleContexts()).resolves.toEqual({
      discoveryAvailable: true,
      options: [
        {
          id: 'voi-developer',
          label: 'VOI Jeans — Developer',
          role: 'developer',
          scope: {
            type: 'company',
            companyRef: 'company:default/voi-jeans',
          },
          spotlightRef: 'spotlight:voi-jeans',
        },
      ],
    });
  });

  it('preserves a Warden denial as an authorization result', async () => {
    server.use(
      http.post(`${baseUrl}/context/resolve`, () =>
        HttpResponse.json(
          {
            authorized: false,
            reason: 'Estate scope is not permitted',
          },
          { status: 403 },
        ),
      ),
    );

    await expect(
      client.resolveContext({
        role: 'admin',
        scope: {
          type: 'estate',
          estateRef: 'estate:default/alpha',
        },
      }),
    ).resolves.toEqual({
      authorized: false,
      reason: 'Estate scope is not permitted',
    });
  });

  it('sends the exact transition request and returns the active context', async () => {
    server.use(
      http.post(
        `${baseUrl}/context/transition`,
        async ({ request }) => {
          expect(await request.json()).toEqual({
            role: 'developer',
            scope: {
              type: 'company',
              companyRef: 'company:default/voi-jeans',
              workspaceRef: 'workspace:default/retail',
            },
            spotlightRef: 'spotlight:voi-retail',
          });

          return HttpResponse.json({
            principal: 'user:default/faiz',
            role: 'developer',
            scope: {
              type: 'company',
              companyRef: 'company:default/voi-jeans',
              workspaceRef: 'workspace:default/retail',
            },
            spotlightRef: 'spotlight:voi-retail',
            wardenDecisionRef: 'warden:decision:001',
            authorityExpiresAt: '2099-01-01T00:00:00.000Z',
            riverSessionRef: 'river:session:001',
          });
        },
      ),
    );

    await expect(
      client.transitionContext({
        role: 'developer',
        scope: {
          type: 'company',
          companyRef: 'company:default/voi-jeans',
          workspaceRef: 'workspace:default/retail',
        },
        spotlightRef: 'spotlight:voi-retail',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        role: 'developer',
        spotlightRef: 'spotlight:voi-retail',
        wardenDecisionRef: 'warden:decision:001',
        riverSessionRef: 'river:session:001',
      }),
    );
  });
});
