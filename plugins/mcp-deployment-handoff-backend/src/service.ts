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

import type {
  Handoff,
  HandoffEvidence,
  HandoffIdentity,
  HandoffServiceOptions,
  HandoffState,
} from './types';

function requireText(value: string | undefined, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing ${field}`);
  }
}

/** In-memory domain service. Actor identities must come from trusted authentication. */
export class DeploymentHandoffService {
  private readonly records = new Map<string, Handoff>();
  private readonly options: HandoffServiceOptions;

  private constructor(options: HandoffServiceOptions) {
    this.options = {
      ...options,
      contract: {
        ref: options.contract.ref,
        receiver: options.contract.receiver,
        location: options.contract.location,
        scope: options.contract.scope,
        evaluate: options.contract.evaluate.bind(options.contract),
      },
    };
    const { contract } = this.options;
    for (const value of [
      contract.ref,
      contract.receiver,
      contract.location,
      contract.scope,
    ]) {
      requireText(value, 'contract identity');
    }
  }

  static create(options: HandoffServiceOptions) {
    return new DeploymentHandoffService(options);
  }

  create(identity: HandoffIdentity, actor: string): Handoff {
    for (const field of [
      'id',
      'location',
      'scope',
      'producer',
      'receiver',
    ] as const) {
      requireText(identity[field], field);
    }
    const { contract } = this.options;
    if (
      actor !== identity.producer ||
      identity.producer === identity.receiver
    ) {
      throw new Error('A distinct producer must create the handoff');
    }
    if (
      identity.receiver !== contract.receiver ||
      identity.location !== contract.location ||
      identity.scope !== contract.scope
    ) {
      throw new Error('Handoff does not match receiver contract binding');
    }
    if (this.records.has(identity.id)) {
      throw new Error('Handoff already exists');
    }
    const record: Handoff = {
      id: identity.id,
      location: identity.location,
      scope: identity.scope,
      producer: identity.producer,
      receiver: identity.receiver,
      state: 'NOT_READY',
    };
    this.records.set(record.id, record);
    return structuredClone(record);
  }

  get(id: string): Handoff {
    return structuredClone(this.record(id));
  }

  submit(id: string, actor: string, evidence: HandoffEvidence): Handoff {
    const record = this.record(id);
    if (actor !== record.producer) {
      throw new Error('Only the producer may submit');
    }
    this.expect(record, 'NOT_READY');
    if (!evidence.upstream.length) {
      throw new Error('Missing upstream dependency evidence');
    }
    for (const item of evidence.upstream) {
      requireText(item.dependency, 'dependency');
      requireText(item.evidenceRef, 'upstream evidence reference');
    }
    for (const item of evidence.externalEffects) {
      requireText(item.provider, 'provider');
      requireText(item.nativeState, 'native state');
      requireText(item.evidenceRef, 'external evidence reference');
    }
    const next: Handoff = {
      ...record,
      evidence: structuredClone(evidence),
      state: 'SUBMITTED',
    };
    this.records.set(id, next);
    return structuredClone(next);
  }

  beginReview(id: string, actor: string): Handoff {
    const record = this.record(id);
    this.receiver(record, actor);
    this.expect(record, 'SUBMITTED');
    const next: Handoff = { ...record, state: 'UNDER_REVIEW' };
    this.records.set(id, next);
    return structuredClone(next);
  }

  async decide(
    id: string,
    actor: string,
    outcome: 'ACCEPTED' | 'REJECTED',
    reason: string,
  ): Promise<Handoff> {
    const record = this.record(id);
    this.receiver(record, actor);
    this.expect(record, 'UNDER_REVIEW');
    if (outcome !== 'ACCEPTED' && outcome !== 'REJECTED') {
      throw new Error('Invalid decision');
    }
    requireText(reason, 'receiver decision reason');
    const { contract, warden, river } = this.options;
    if (outcome === 'ACCEPTED') {
      requireText(
        record.evidence?.wardenDecisionRef,
        'Warden decision reference',
      );
      requireText(
        record.evidence?.riverEvidenceRef,
        'River evidence reference',
      );
    }
    const evaluation = await contract.evaluate(structuredClone(record));
    requireText(evaluation.reason, 'contract evaluation reason');
    if (outcome === 'ACCEPTED') {
      if (evaluation.passed !== true) {
        throw new Error(`Acceptance contract failed: ${evaluation.reason}`);
      }
      const authority = await warden.evaluate({
        decisionRef: record.evidence!.wardenDecisionRef!,
        actor,
        action: 'ACCEPT',
        contractRef: contract.ref,
        handoff: structuredClone(record),
      });
      if (authority.passed !== true) {
        throw new Error('Warden decision did not authorize acceptance');
      }
      const evidence = await river.evaluate({
        evidenceRef: record.evidence!.riverEvidenceRef!,
        contractRef: contract.ref,
        handoff: structuredClone(record),
      });
      if (evidence.passed !== true) {
        throw new Error('River evidence verification failed');
      }
    }
    // Compare the immutable snapshot after awaiting external evaluation.
    if (this.records.get(id) !== record) {
      throw new Error('Handoff changed during review');
    }
    const next: Handoff = {
      ...record,
      state: outcome,
      decision: { actor, outcome, reason, contractRef: contract.ref },
    };
    this.records.set(id, next);
    return structuredClone(next);
  }

  private record(id: string): Handoff {
    const record = this.records.get(id);
    if (!record) {
      throw new Error('Handoff not found');
    }
    return record;
  }

  private receiver(record: Handoff, actor: string) {
    if (actor !== record.receiver || actor === record.producer) {
      throw new Error('Only the receiver may review or decide');
    }
  }

  private expect(record: Handoff, state: HandoffState) {
    if (record.state !== state) {
      throw new Error(
        `Invalid transition from ${record.state}; expected ${state}`,
      );
    }
  }
}
