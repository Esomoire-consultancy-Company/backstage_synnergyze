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
import { test, expect } from '@playwright/test';

test('Estate keeps tunnel passage separate from Spotlight and Sentinel time', async ({
  page,
}) => {
  const now = Date.now();
  // Test-only identity; intercept every API call so fixture credentials never
  // reach the live backend. This is UI integration coverage, not live Warden proof.
  await page.route('**/api/**', route =>
    route.fulfill({ status: 404, body: '{}' }),
  );
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(now / 1000) + 3600 }),
  ).toString('base64');
  await page.route('**/api/auth/guest/refresh', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        profile: {},
        backstageIdentity: {
          token: `test.${payload}.test`,
          identity: {
            type: 'user',
            userEntityRef: 'user:default/test',
            ownershipEntityRefs: [],
          },
        },
      }),
    }),
  );
  const steps = [
    'ORIGIN_LIGHT',
    'SILK_DAM_ENTRY',
    'TUNNEL_DARK',
    'SILK_DAM_EXIT',
    'RETURN_LIGHT',
  ];
  const snapshot = {
    contract: 'RUNTIME-TUNNEL-101',
    subjectRef: 'ALPHA-NODE-001',
    storyRef: 'river:story:e2e',
    revision: 'r1',
    observedAt: new Date(now - 1000).toISOString(),
    validUntil: new Date(now + 600000).toISOString(),
    interpretation: { decisionRef: 'warden:interpret:e2e', permitted: true },
    observations: steps.map((step, index) => ({
      step,
      observedAt: new Date(now - 6000 + index * 1000).toISOString(),
      evidenceRef: `river:event:e2e:${index}`,
      summary: `Observed ${step}`,
      ...([1, 3].includes(index)
        ? {
            gateRef: `silk:gate:${index}`,
            passageDecisionRef: `warden:passage:${index}`,
          }
        : {}),
    })),
  };
  let available = true;
  await page.route('**/api/proxy/vsr-runtime-tunnel?*', route =>
    route.fulfill({
      status: available ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(available ? snapshot : {}),
    }),
  );
  await page.route('**/api/proxy/vsr-prometheus/**', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          result: [
            { metric: { job: 'prometheus' }, value: [now / 1000, '1'] },
            { metric: { job: 'river-api' }, value: [now / 1000, '1'] },
          ],
        },
      }),
    }),
  );
  await page.route('**/api/proxy/vsr-river/health', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ status: 'healthy', database: 'connected' }),
    }),
  );
  await page.goto('/vsr/estate');
  await page.getByRole('button', { name: 'Enter', exact: true }).click();

  await expect(page.getByText('Sentinel Clock: CURRENT')).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByText('Observed: 1B · Return light', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Inspect 0 · Tunnel dark' }).click();
  await expect(page.getByText('Spotlight: ILLUMINATED')).toBeVisible();
  await expect(
    page.getByText('Observed: 1B · Return light', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Return to peripheral dark' }).click();
  await expect(page.getByText('Spotlight: PERIPHERAL DARK')).toBeVisible();
  available = false;
  await page.reload();
  await expect(page.getByText('Sentinel Clock: UNAVAILABLE')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Inspect 1B · Return light' }),
  ).toBeDisabled();
});
