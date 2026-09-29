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

export const runtimeTunnelSteps = [
  'ORIGIN_LIGHT',
  'SILK_DAM_ENTRY',
  'TUNNEL_DARK',
  'SILK_DAM_EXIT',
  'RETURN_LIGHT',
] as const;

export type TunnelStep = (typeof runtimeTunnelSteps)[number];

export interface RuntimeTunnelObservation {
  step: TunnelStep;
  observedAt: string;
  evidenceRef: string;
  summary: string;
  gateRef?: string;
  passageDecisionRef?: string;
}

export interface RuntimeTunnelSnapshot {
  contract: 'RUNTIME-TUNNEL-101';
  subjectRef: string;
  storyRef: string;
  revision: string;
  observedAt: string;
  validUntil: string;
  interpretation: { decisionRef: string; permitted: boolean };
  observations: readonly RuntimeTunnelObservation[];
}

export interface RuntimeTunnelProjection {
  temporal:
    | 'current'
    | 'stale'
    | 'future'
    | 'unavailable'
    | 'invalid'
    | 'restricted';
  phase?: 'ORIGIN_LIGHT' | 'TUNNEL_DARK' | 'RETURN_LIGHT';
  boundary?: 'SILK_DAM_ENTRY' | 'SILK_DAM_EXIT';
  snapshot?: RuntimeTunnelSnapshot;
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const time = (value: unknown): value is string =>
  text(value) &&
  /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) &&
  Number.isFinite(Date.parse(value));

/** Sentinel assesses time; it never advances a gate or writes canonical state. */
export function projectRuntimeTunnel(
  input: unknown,
  subjectRef: string,
  asOf: number,
): RuntimeTunnelProjection {
  if (input === undefined) return { temporal: 'unavailable' };
  if (
    !record(input) ||
    input.contract !== 'RUNTIME-TUNNEL-101' ||
    input.subjectRef !== subjectRef ||
    !text(input.storyRef) ||
    !text(input.revision) ||
    !time(input.observedAt) ||
    !time(input.validUntil) ||
    !record(input.interpretation) ||
    !text(input.interpretation.decisionRef) ||
    typeof input.interpretation.permitted !== 'boolean' ||
    !Number.isFinite(asOf)
  ) {
    return { temporal: 'invalid' };
  }
  if (!input.interpretation.permitted) return { temporal: 'restricted' };
  if (
    !Array.isArray(input.observations) ||
    input.observations.length === 0 ||
    input.observations.length > runtimeTunnelSteps.length ||
    Date.parse(input.validUntil) <= Date.parse(input.observedAt)
  ) {
    return { temporal: 'invalid' };
  }
  let previous = -Infinity;
  const evidence = new Set<string>();
  const observations: RuntimeTunnelObservation[] = [];
  for (const [index, observation] of input.observations.entries()) {
    if (
      !record(observation) ||
      observation.step !== runtimeTunnelSteps[index] ||
      !time(observation.observedAt) ||
      !text(observation.evidenceRef) ||
      !text(observation.summary) ||
      evidence.has(observation.evidenceRef)
    ) {
      return { temporal: 'invalid' };
    }
    const observed = Date.parse(observation.observedAt);
    if (observed < previous || observed > Date.parse(input.observedAt)) {
      return { temporal: 'invalid' };
    }
    const gate = index === 1 || index === 3;
    if (
      gate &&
      (!text(observation.gateRef) || !text(observation.passageDecisionRef))
    ) {
      return { temporal: 'invalid' };
    }
    previous = observed;
    evidence.add(observation.evidenceRef);
    observations.push({
      step: runtimeTunnelSteps[index],
      observedAt: observation.observedAt,
      evidenceRef: observation.evidenceRef,
      summary: observation.summary,
      ...(gate
        ? {
            gateRef: observation.gateRef as string,
            passageDecisionRef: observation.passageDecisionRef as string,
          }
        : {}),
    });
  }
  // A snapshot from the future must not leak later Story observations into replay.
  if (asOf < Date.parse(input.observedAt)) return { temporal: 'future' };
  const temporal = asOf >= Date.parse(input.validUntil) ? 'stale' : 'current';
  let phase: NonNullable<RuntimeTunnelProjection['phase']> = 'ORIGIN_LIGHT';
  if (observations.length >= 3) phase = 'TUNNEL_DARK';
  if (observations.length === 5) phase = 'RETURN_LIGHT';
  return {
    temporal,
    phase,
    ...(observations.length === 2
      ? { boundary: 'SILK_DAM_ENTRY' as const }
      : {}),
    ...(observations.length === 4
      ? { boundary: 'SILK_DAM_EXIT' as const }
      : {}),
    snapshot: {
      contract: 'RUNTIME-TUNNEL-101',
      subjectRef,
      storyRef: input.storyRef,
      revision: input.revision,
      observedAt: input.observedAt,
      validUntil: input.validUntil,
      interpretation: {
        decisionRef: input.interpretation.decisionRef,
        permitted: true,
      },
      observations,
    },
  };
}
