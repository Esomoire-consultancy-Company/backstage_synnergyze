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

import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { screen } from '@testing-library/react';
import { VsrEstateControlTowerPage } from './VsrEstateControlTowerPage';

const unavailableFetch: typeof fetch = async () => {
  throw new Error('telemetry unavailable');
};

const renderEstatePage = (fetchImpl: typeof fetch = unavailableFetch) =>
  renderInTestApp(
    <TestApiProvider
      apis={[
        [
          discoveryApiRef,
          { getBaseUrl: async () => 'http://vsr-telemetry.test' },
        ],
        [fetchApiRef, { fetch: fetchImpl }],
      ]}
    >
      <VsrEstateControlTowerPage />
    </TestApiProvider>,
  );

describe('VsrEstateControlTowerPage', () => {
  it('renders estate operations surfaces and keeps Story fail-closed', async () => {
    await renderEstatePage();

    expect(screen.getByText('VSR Estate Control Tower')).toBeInTheDocument();
    expect(screen.getByText('ALPHA-NODE-001')).toBeInTheDocument();
    expect(screen.getByText('Signals')).toBeInTheDocument();
    expect(screen.getByText('Genesis / Catalog')).toBeInTheDocument();
    expect(screen.getAllByText('DevTools').length).toBeGreaterThan(0);
    expect(screen.getAllByText('UNKNOWN')).toHaveLength(7);
    expect(
      screen.getByText(/Awaiting a permitted canonical River Story projection/),
    ).toBeInTheDocument();
  });

  it('degrades Runtime when any expected Prometheus target is down', async () => {
    const fetch = jest.fn(async input => {
      const url = String(input);

      if (url.endsWith('/prometheus/up')) {
        return new Response(
          JSON.stringify({
            targets: [
              { job: 'prometheus', up: true },
              { job: 'river-api', up: true },
              { job: 'river-api', up: false },
            ],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        );
      }

      return new Response(
        JSON.stringify({ status: 'healthy', database: 'healthy' }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    });

    await renderEstatePage(fetch);

    expect(await screen.findByText('DEGRADED')).toBeInTheDocument();
    expect(
      screen.getByText(/observed down target\(s\): river-api/),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      'http://vsr-telemetry.test/prometheus/up',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
