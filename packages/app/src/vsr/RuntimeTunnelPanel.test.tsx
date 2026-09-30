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
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VsrEstateControlTowerPage } from './VsrEstateControlTowerPage';
import { RuntimeTunnelView } from './RuntimeTunnelPanel';

const story = {
  contract: 'RUNTIME-TUNNEL-101',
  subjectRef: 'ALPHA-NODE-001',
  storyRef: 'river:story:alpha',
  revision: 'r1',
  observedAt: '2026-09-25T10:00:00Z',
  validUntil: '2026-09-25T11:00:00Z',
  interpretation: { permitted: true, decisionRef: 'warden:interpret:1' },
  observations: [
    {
      step: 'ORIGIN_LIGHT',
      observedAt: '2026-09-25T09:00:00Z',
      evidenceRef: 'river:1',
      summary: 'Latency observed',
    },
    {
      step: 'SILK_DAM_ENTRY',
      observedAt: '2026-09-25T09:01:00Z',
      evidenceRef: 'river:2',
      summary: 'Entry recorded',
      gateRef: 'silk:entry',
      passageDecisionRef: 'warden:entry',
    },
    {
      step: 'TUNNEL_DARK',
      observedAt: '2026-09-25T09:02:00Z',
      evidenceRef: 'river:3',
      summary: 'Cause unresolved',
    },
  ],
};

describe('Estate runtime visualization', () => {
  it('renders a missing canonical projection without fabricating passage from healthy telemetry', async () => {
    const fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === 'string' || input instanceof URL
          ? String(input)
          : input.url;
      if (url.includes('vsr-runtime-tunnel'))
        return new Response('', { status: 404 });
      if (url.endsWith('/prometheus/up'))
        return new Response(
          JSON.stringify({
            targets: [
              { job: 'prometheus', up: true },
              { job: 'river-api', up: true },
            ],
          }),
        );
      return new Response(
        JSON.stringify({ status: 'healthy', database: 'connected' }),
      );
    });
    await renderInTestApp(
      <TestApiProvider
        apis={[
          [
            discoveryApiRef,
            { getBaseUrl: async () => 'http://backend.test/api/proxy' },
          ],
          [fetchApiRef, { fetch }],
        ]}
      >
        <VsrEstateControlTowerPage />
      </TestApiProvider>,
    );
    expect(await screen.findAllByText('HEALTHY')).toHaveLength(2);
    expect(screen.getByText('Sentinel Clock: UNAVAILABLE')).toBeInTheDocument();
    expect(
      screen.getAllByRole('list', { name: 'RUNTIME-TUNNEL-101' }),
    ).toHaveLength(1);
    expect(
      within(
        screen.getByRole('list', { name: 'RUNTIME-TUNNEL-101' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(5);
    expect(
      screen.getByRole('button', { name: 'Inspect 1B · Return light' }),
    ).toBeDisabled();

    expect(
      fetch.mock.calls.every(([url]) =>
        String(url).startsWith('http://backend.test/api/proxy/'),
      ),
    ).toBe(true);
  });

  it('keeps Spotlight inspection separate from canonical passage and Sentinel expiration', async () => {
    const user = userEvent.setup();
    const { rerender } = await renderInTestApp(
      <RuntimeTunnelView
        input={story}
        subjectRef="ALPHA-NODE-001"
        asOf={Date.parse('2026-09-25T10:30:00Z')}
      />,
    );
    expect(screen.getByText('Observed: 0 · Tunnel dark')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Inspect 1A · Origin light' }),
    );
    expect(screen.getByText('Spotlight: ILLUMINATED')).toBeInTheDocument();
    expect(screen.getByText('Observed: 0 · Tunnel dark')).toBeInTheDocument();
    expect(screen.queryByText(/Cause unresolved/)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Return to peripheral dark' }),
    );
    expect(screen.getByText('Spotlight: PERIPHERAL DARK')).toBeInTheDocument();
    expect(screen.getByText(/Cause unresolved/)).toBeInTheDocument();
    rerender(
      <RuntimeTunnelView
        input={story}
        subjectRef="ALPHA-NODE-001"
        asOf={Date.parse(story.validUntil)}
      />,
    );
    expect(screen.getByText('Sentinel Clock: STALE')).toBeInTheDocument();
    expect(
      screen.getByText('Last observed: 0 · Tunnel dark'),
    ).toBeInTheDocument();
    rerender(
      <RuntimeTunnelView
        input={{
          ...story,
          interpretation: { ...story.interpretation, permitted: false },
        }}
        subjectRef="ALPHA-NODE-001"
        asOf={Date.parse(story.validUntil)}
      />,
    );
    expect(screen.getByText('Sentinel Clock: RESTRICTED')).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'River Story chronology' }),
    ).not.toBeInTheDocument();
  });
});
