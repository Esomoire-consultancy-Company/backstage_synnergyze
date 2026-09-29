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
  renderInTestApp,
  TestApiProvider,
} from '@backstage/test-utils';
import {
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { screen, within } from '@testing-library/react';
import { VsrEstateControlTowerPage } from './VsrEstateControlTowerPage';
import { VsrRuntimeTunnelPanel } from './VsrRuntimeTunnelPanel';

describe('VsrEstateControlTowerPage', () => {
  it('renders estate operations surfaces and keeps Story fail-closed', async () => {
    await renderInTestApp(<VsrEstateControlTowerPage />);

    expect(screen.getByText('VSR Estate Control Tower')).toBeInTheDocument();
    expect(screen.getByText('ALPHA-NODE-001')).toBeInTheDocument();
    expect(screen.getByText('Signals')).toBeInTheDocument();
    expect(screen.getByText('Genesis / Catalog')).toBeInTheDocument();
    expect(screen.getAllByText('DevTools').length).toBeGreaterThan(0);
    expect(screen.getAllByText('UNKNOWN')).toHaveLength(7);
    expect(
      screen.getByText(/Story projection remains NOT WIRED/),
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

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [
            discoveryApiRef,
            { getBaseUrl: async () => 'http://vsr-telemetry.test' },
          ],
          [fetchApiRef, { fetch }],
        ]}
      >
        <VsrEstateControlTowerPage />
      </TestApiProvider>,
    );

    expect(await screen.findByText('DEGRADED')).toBeInTheDocument();
    expect(screen.getByText(/observed down target\(s\): river-api/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      'http://vsr-telemetry.test/prometheus/up',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('renders the canonical runtime tunnel in exact positional order', async () => {
    const { container } = await renderInTestApp(<VsrRuntimeTunnelPanel />);
    const positions = Array.from(
      container.querySelectorAll('[data-tunnel-position]'),
    ).map(node => node.getAttribute('data-tunnel-position'));

    expect(positions).toEqual(['1A', 'gate-entry', '0', 'gate-exit', '1B']);
    expect(
      screen.getByRole('list', {
        name: 'Canonical runtime tunnel sequence',
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });
  it('keeps entry and exit gates explicit without turning them into state', async () => {
    await renderInTestApp(<VsrRuntimeTunnelPanel />);

    expect(
      screen.getByTestId('runtime-tunnel-step-gate-entry'),
    ).toHaveTextContent('ENTRY GATE');
    expect(
      screen.getByTestId('runtime-tunnel-step-gate-entry'),
    ).toHaveTextContent('SILK DAM boundary');
    expect(
      screen.getByTestId('runtime-tunnel-step-gate-exit'),
    ).toHaveTextContent('EXIT GATE');
    expect(
      screen.getByTestId('runtime-tunnel-step-gate-exit'),
    ).toHaveTextContent('SILK DAM boundary');
  });

  it('keeps Spotlight pulse separate from the runtime tunnel', async () => {
    await renderInTestApp(<VsrRuntimeTunnelPanel />);

    const tunnel = screen.getByTestId('runtime-tunnel-101');
    expect(
      within(tunnel).queryByTestId('spotlight-pulse-010'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('spotlight-pulse-010')).toHaveTextContent(
      '0 → 1 → 0',
    );
    expect(screen.getByTestId('spotlight-pulse-010')).toHaveTextContent(
      'does not replace, advance, or rewind',
    );
  });
  it('keeps Sentinel observation-only and temporally scoped', async () => {
    await renderInTestApp(<VsrRuntimeTunnelPanel />);

    const sentinel = screen.getByTestId('sentinel-temporal-observer');
    expect(sentinel).toHaveTextContent('Temporal validity observer only');
    expect(sentinel).toHaveTextContent('freshness, expiry and supersession');
    expect(sentinel).toHaveTextContent(
      'does not execute, transition 1A/0/1B, authorize a gate',
    );
    expect(sentinel).toHaveTextContent('generate the Spotlight pulse');
  });
});
