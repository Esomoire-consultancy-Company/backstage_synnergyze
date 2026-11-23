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
import { projectRuntimeTunnel, runtimeTunnelSteps } from './runtimeTunnel';

const snapshot = () => ({
  contract: 'RUNTIME-TUNNEL-101',
  subjectRef: 'ALPHA-NODE-001',
  storyRef: 'river:story:1',
  revision: 'r1',
  observedAt: '2026-09-25T10:00:05Z',
  validUntil: '2026-09-25T10:01:00Z',
  interpretation: { decisionRef: 'warden:interpret:1', permitted: true },
  observations: runtimeTunnelSteps.map((step, index) => ({
    step,
    observedAt: `2026-09-25T10:00:0${index}Z`,
    evidenceRef: `river:event:${index}`,
    summary: step,
    ...([1, 3].includes(index)
      ? {
          gateRef: `silk:gate:${index}`,
          passageDecisionRef: `warden:passage:${index}`,
        }
      : {}),
  })),
});
const now = Date.parse('2026-09-25T10:00:10Z');
const project = (value: unknown, at = now) =>
  projectRuntimeTunnel(value, 'ALPHA-NODE-001', at);

describe('Sentinel runtime tunnel projection', () => {
  it('projects each canonical prefix without creating state or confusing a pulse with a journey', () => {
    const input = snapshot();
    const before = JSON.stringify(input);
    for (let length = 1; length <= 5; length++) {
      expect(
        project({
          ...input,
          observations: input.observations.slice(0, length),
        }),
      ).toMatchObject({
        temporal: 'current',
        phase: [
          'ORIGIN_LIGHT',
          'ORIGIN_LIGHT',
          'TUNNEL_DARK',
          'TUNNEL_DARK',
          'RETURN_LIGHT',
        ][length - 1],
      });
    }
    expect(
      project({ ...input, observations: input.observations.slice(0, 2) }),
    ).toMatchObject({ phase: 'ORIGIN_LIGHT', boundary: 'SILK_DAM_ENTRY' });
    expect(
      project({ ...input, observations: input.observations.slice(0, 4) }),
    ).toMatchObject({ phase: 'TUNNEL_DARK', boundary: 'SILK_DAM_EXIT' });
    expect(JSON.stringify(input)).toBe(before);
    expect(
      project({
        ...input,
        observations: [{ ...input.observations[0], step: 'ILLUMINATED' }],
      }),
    ).toEqual({ temporal: 'invalid' });
  });
  it('marks expiration without advancing passage and suppresses future/restricted disclosure', () => {
    const input = snapshot();
    input.observations = input.observations.slice(0, 3);
    expect(project(input, Date.parse(input.validUntil))).toMatchObject({
      temporal: 'stale',
      phase: 'TUNNEL_DARK',
    });
    expect(project(input, Date.parse(input.observedAt) - 1)).toEqual({
      temporal: 'future',
    });
    input.interpretation.permitted = false;
    expect(project(input)).toEqual({ temporal: 'restricted' });
    expect(project(undefined)).toEqual({ temporal: 'unavailable' });
  });
  it('rejects missing gates, evidence, scope, chronology and invalid timestamps', () => {
    const input = snapshot();
    const badGate = snapshot();
    delete badGate.observations[1].passageDecisionRef;
    const duplicate = snapshot();
    duplicate.observations[2].evidenceRef =
      duplicate.observations[0].evidenceRef;
    const reversed = snapshot();
    reversed.observations[2].observedAt = '2026-09-25T09:00:00Z';
    for (const value of [
      null,
      {},
      badGate,
      duplicate,
      reversed,
      { ...input, subjectRef: 'OTHER' },
      { ...input, observedAt: 'today' },
      { ...input, validUntil: input.observedAt },
      {
        ...input,
        observations: [input.observations[0], input.observations[4]],
      },
    ])
      expect(project(value)).toEqual({ temporal: 'invalid' });
  });
});
