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

import { DeploymentHandoffService } from './service';
import type { HandoffEvidence } from './types';

const identity = {
  id: 'handoff-17',
  location: 'region-a',
  scope: 'payments/prod',
  producer: 'service:producer',
  receiver: 'service:receiver',
};

function setup(overrides: Partial<HandoffEvidence> = {}) {
  const contract = {
    ref: 'contract:v1',
    receiver: identity.receiver,
    location: identity.location,
    scope: identity.scope,
    evaluate: jest.fn().mockResolvedValue({ passed: true, reason: 'Compatible' }),
  };
  const warden = {
    evaluate: jest.fn().mockResolvedValue({ passed: true, reason: 'Allowed' }),
  };
  const river = {
    evaluate: jest.fn().mockResolvedValue({ passed: true, reason: 'Verified' }),
  };
  const service = DeploymentHandoffService.create({ contract, warden, river });
  const evidence: HandoffEvidence = {
    upstream: [{ dependency: 'build:17', evidenceRef: 'upstream:17' }],
    wardenDecisionRef: 'warden:17',
    riverEvidenceRef: 'river:17',
    externalEffects: [
      {
        provider: 'example',
        nativeState: 'READY',
        evidenceRef: 'provider:17',
      },
    ],
    ...overrides,
  };
  service.create(identity, identity.producer);
  const submit = () => service.submit(identity.id, identity.producer, evidence);
  const review = () => {
    submit();
    service.beginReview(identity.id, identity.receiver);
  };
  const accept = () =>
    service.decide(
      identity.id,
      identity.receiver,
      'ACCEPTED',
      'Receiver verified',
    );
  return { service, contract, warden, river, evidence, submit, review, accept };
}

describe('receiver-owned deployment handoff', () => {
  it('submits, reviews and accepts with bound references, preserving external truth', async () => {
    const { service, submit, accept, contract, warden, river, evidence } = setup();
    expect(service.get(identity.id).state).toBe('NOT_READY');
    expect(submit().state).toBe('SUBMITTED');
    expect(service.beginReview(identity.id, identity.receiver).state).toBe(
      'UNDER_REVIEW',
    );
    const accepted = await accept();
    expect(accepted.state).toBe('ACCEPTED');
    expect(accepted.evidence).toEqual(evidence);
    expect(accepted.decision).toEqual({
      actor: identity.receiver,
      outcome: 'ACCEPTED',
      reason: 'Receiver verified',
      contractRef: contract.ref,
    });
    expect(contract.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({ ...identity, state: 'UNDER_REVIEW' }),
    );
    expect(warden.evaluate).toHaveBeenCalledWith({
      actor: identity.receiver,
      action: 'ACCEPT',
      decisionRef: 'warden:17',
      contractRef: contract.ref,
      handoff: expect.objectContaining(identity),
    });
    expect(river.evaluate).toHaveBeenCalledWith({
      evidenceRef: 'river:17',
      contractRef: contract.ref,
      handoff: expect.objectContaining(identity),
    });
    await expect(accept()).rejects.toThrow('Invalid transition');
  });

  it('denies producer and unrelated actors receiver transitions', async () => {
    const { service, review } = setup();
    review();
    for (const actor of [identity.producer, 'service:stranger']) {
      await expect(
        service.decide(identity.id, actor, 'ACCEPTED', 'Ready'),
      ).rejects.toThrow('Only the receiver');
      await expect(
        service.decide(identity.id, actor, 'REJECTED', 'No'),
      ).rejects.toThrow('Only the receiver');
    }
    expect(service.get(identity.id).state).toBe('UNDER_REVIEW');
  });

  it.each([
    ['wardenDecisionRef', 'Warden'],
    ['riverEvidenceRef', 'River'],
  ] as const)('requires %s before acceptance', async (field, label) => {
    for (const value of [undefined, '', '   ']) {
      const { review, accept, service, warden, river } = setup({ [field]: value });
      review();
      await expect(accept()).rejects.toThrow(`Missing ${label}`);
      expect(service.get(identity.id).state).toBe('UNDER_REVIEW');
      expect(warden.evaluate).not.toHaveBeenCalled();
      expect(river.evaluate).not.toHaveBeenCalled();
    }
  });

  it('fails closed on failed or unavailable evaluation', async () => {
    for (const port of ['contract', 'warden', 'river'] as const) {
      const fixture = setup();
      fixture.review();
      fixture[port].evaluate.mockResolvedValue({
        passed: false,
        reason: 'Binding mismatch',
      });
      await expect(fixture.accept()).rejects.toThrow();
      expect(fixture.service.get(identity.id).state).toBe('UNDER_REVIEW');
      fixture[port].evaluate.mockRejectedValue(new Error('Unavailable'));
      await expect(fixture.accept()).rejects.toThrow('Unavailable');
      expect(fixture.service.get(identity.id).decision).toBeUndefined();
    }
  });

  it('records receiver rejection after contract evaluation without claiming acceptance', async () => {
    const { service, review, contract, warden, river } = setup({
      wardenDecisionRef: undefined,
      riverEvidenceRef: undefined,
    });
    review();
    contract.evaluate.mockResolvedValue({
      passed: false,
      reason: 'Dependency incompatible',
    });
    const rejected = await service.decide(
      identity.id,
      identity.receiver,
      'REJECTED',
      'Dependency incompatible',
    );
    expect(rejected.state).toBe('REJECTED');
    expect(rejected.decision).toEqual({
      actor: identity.receiver,
      outcome: 'REJECTED',
      reason: 'Dependency incompatible',
      contractRef: contract.ref,
    });
    expect(rejected.evidence?.externalEffects[0].nativeState).toBe('READY');
    expect(contract.evaluate).toHaveBeenCalledTimes(1);
    expect(warden.evaluate).not.toHaveBeenCalled();
    expect(river.evaluate).not.toHaveBeenCalled();
    await expect(
      service.decide(identity.id, identity.receiver, 'ACCEPTED', 'Retry'),
    ).rejects.toThrow('Invalid transition');
  });

  it('rejects skipped, repeated and unauthorized transitions and incomplete submission', async () => {
    const { service, submit, accept, evidence } = setup();
    expect(() => service.beginReview(identity.id, identity.receiver)).toThrow(
      'Invalid transition',
    );
    await expect(accept()).rejects.toThrow('Invalid transition');
    expect(() =>
      service.submit(identity.id, identity.receiver, evidence),
    ).toThrow('Only the producer');
    expect(() =>
      service.submit(identity.id, identity.producer, {
        ...evidence,
        upstream: [],
      }),
    ).toThrow('Missing upstream');
    expect(() =>
      service.submit(identity.id, identity.producer, {
        ...evidence,
        upstream: [{ dependency: 'build', evidenceRef: ' ' }],
      }),
    ).toThrow('Missing upstream');
    submit();
    expect(() => submit()).toThrow('Invalid transition');
    await expect(accept()).rejects.toThrow('Invalid transition');
    expect(() => service.beginReview(identity.id, identity.producer)).toThrow(
      'Only the receiver',
    );
    service.beginReview(identity.id, identity.receiver);
    expect(() => service.beginReview(identity.id, identity.receiver)).toThrow(
      'Invalid transition',
    );
    await expect(
      service.decide(identity.id, identity.receiver, 'REJECTED', ' '),
    ).rejects.toThrow('Missing receiver decision reason');
  });

  it('binds identities and isolates stored evidence from caller mutations', () => {
    const { service, submit, evidence } = setup();
    for (const field of ['location', 'scope', 'receiver'] as const) {
      expect(() =>
        service.create(
          { ...identity, id: 'other', [field]: 'other' },
          identity.producer,
        ),
      ).toThrow('binding');
    }
    expect(() =>
      service.create(
        { ...identity, producer: identity.receiver },
        identity.receiver,
      ),
    ).toThrow('distinct producer');
    expect(() => service.create(identity, identity.producer)).toThrow(
      'already exists',
    );
    expect(() =>
      service.create({ ...identity, id: ' ' }, identity.producer),
    ).toThrow('Missing id');
    const submitted = submit();
    submitted.state = 'ACCEPTED';
    evidence.upstream[0].evidenceRef = 'changed';
    submitted.evidence!.externalEffects[0].nativeState = 'changed';
    expect(service.get(identity.id).state).toBe('SUBMITTED');
    expect(service.get(identity.id).evidence?.upstream[0].evidenceRef).toBe(
      'upstream:17',
    );
    expect(service.get(identity.id).evidence?.externalEffects[0].nativeState).toBe(
      'READY',
    );
  });

  it('allows only one concurrent terminal decision', async () => {
    const { service, review, accept } = setup();
    review();
    const results = await Promise.allSettled([
      accept(),
      service.decide(
        identity.id,
        identity.receiver,
        'REJECTED',
        'Receiver declined',
      ),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect(service.get(identity.id).decision?.actor).toBe(identity.receiver);
  });
});
