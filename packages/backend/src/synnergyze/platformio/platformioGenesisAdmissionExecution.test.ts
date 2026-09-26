import {
  executePlatformIOGenesisAdmission,
} from './platformioGenesisAdmissionExecution';
import {
  GenesisAdmissionProposal,
} from './platformioGenesisAdmission';
import {
  GenesisDiscoveredDeviceCandidate,
} from './platformioGenesisProjection';

const candidate: GenesisDiscoveredDeviceCandidate = {
  kind: 'DISCOVERED_DEVICE',
  candidateRef: 'GENESIS-CANDIDATE-DEVICE-001',
  lifecycleStatus: 'PROVISIONAL',
  providerObservation: {
    hardwareId: 'USB VID:PID=10C4:EA60',
  },
  correlationKeys: ['platformio:hwid:USB VID:PID=10C4:EA60'],
  provenance: {
    providerId: 'PROVIDER-PLATFORMIO-001',
    adapterId: 'ADAPTER-PLATFORMIO-001',
    capabilityId: 'platformio.device.list',
    requestId: 'REQ-001',
    wardenDecisionRef: 'WARDEN-OBSERVE-001',
    riverEvidenceRef: 'RIVER-OBSERVE-001',
    observedAt: '2026-09-26T05:15:00.000Z',
  },
  canonicalGenesisDeviceId: null,
  verified: false,
};

const createProposal: GenesisAdmissionProposal = {
  proposalId: 'GENESIS-ADMISSION-PROPOSAL-001',
  source: 'PLATFORMIO',
  candidateRef: candidate.candidateRef,
  candidateKind: candidate.kind,
  proposalKind: 'CREATE_CANONICAL_OBJECT',
  requestedCanonicalKind: 'DEVICE',
  correlationClassification: 'NEW',
  correlationStrength: 'NONE',
  wardenAdmissionRequired: true,
  riverEvidenceRefs: ['RIVER-OBSERVE-001'],
  sourceWardenDecisionRef: 'WARDEN-OBSERVE-001',
  sourceRequestId: 'REQ-001',
  canonicalMutationAuthorized: false,
  canonicalMutationPerformed: false,
  status: 'PROPOSED',
};

describe('PlatformIO Genesis admission execution', () => {
  it('requires a fresh admission decision and leaves created state pending verification', async () => {
    const receipts: unknown[] = [];

    const result = await executePlatformIOGenesisAdmission(
      createProposal,
      candidate,
      {
        authorizeAdmission: async () => ({
          decisionRef: 'WARDEN-ADMISSION-001',
          proposalId: createProposal.proposalId,
          candidateRef: candidate.candidateRef,
          mutation: 'CREATE_CANONICAL_OBJECT',
          canonicalKind: 'DEVICE',
          allowed: true,
          reservationRef: 'WARDEN-RESERVATION-001',
          expiresAt: '2026-09-26T06:00:00.000Z',
        }),
        createCanonicalObject: async () => ({
          canonicalId: 'GENESIS-DEVICE-101',
          mutationRef: 'GENESIS-MUTATION-001',
          mutation: 'CREATE_CANONICAL_OBJECT',
          state: 'PENDING_VERIFICATION',
        }),
        bindToExistingObject: async () => {
          throw new Error('not expected');
        },
        recordMutationEvidence: async receipt => {
          receipts.push(receipt);
        },
        now: () => new Date('2026-09-26T05:30:00.000Z'),
      },
    );

    expect(result).toMatchObject({
      mutation: {
        canonicalId: 'GENESIS-DEVICE-101',
        state: 'PENDING_VERIFICATION',
      },
      canonicalTruthEstablished: false,
      verificationRequired: true,
    });
    expect(receipts[0]).toMatchObject({
      admissionDecisionRef: 'WARDEN-ADMISSION-001',
      reservationRef: 'WARDEN-RESERVATION-001',
      canonicalState: 'PENDING_VERIFICATION',
      canonicalTruthEstablished: false,
    });
  });

  it('never mutates Genesis when Warden denies admission', async () => {
    const createCanonicalObject = jest.fn();

    await expect(
      executePlatformIOGenesisAdmission(createProposal, candidate, {
        authorizeAdmission: async () => ({
          decisionRef: 'WARDEN-ADMISSION-002',
          proposalId: createProposal.proposalId,
          candidateRef: candidate.candidateRef,
          mutation: 'CREATE_CANONICAL_OBJECT',
          canonicalKind: 'DEVICE',
          allowed: false,
          reason: 'OUT_OF_SCOPE',
        }),
        createCanonicalObject,
        bindToExistingObject: jest.fn(),
        recordMutationEvidence: async () => undefined,
      }),
    ).rejects.toThrow('WARDEN_ADMISSION_DENIED');

    expect(createCanonicalObject).not.toHaveBeenCalled();
  });

  it('requires an effect reservation before Genesis mutation', async () => {
    const createCanonicalObject = jest.fn();

    await expect(
      executePlatformIOGenesisAdmission(createProposal, candidate, {
        authorizeAdmission: async () => ({
          decisionRef: 'WARDEN-ADMISSION-003',
          proposalId: createProposal.proposalId,
          candidateRef: candidate.candidateRef,
          mutation: 'CREATE_CANONICAL_OBJECT',
          canonicalKind: 'DEVICE',
          allowed: true,
        }),
        createCanonicalObject,
        bindToExistingObject: jest.fn(),
        recordMutationEvidence: async () => undefined,
      }),
    ).rejects.toThrow('WARDEN_ADMISSION_RESERVATION_REQUIRED');

    expect(createCanonicalObject).not.toHaveBeenCalled();
  });

  it('rejects reuse of a decision for a different mutation', async () => {
    const createCanonicalObject = jest.fn();

    await expect(
      executePlatformIOGenesisAdmission(createProposal, candidate, {
        authorizeAdmission: async () => ({
          decisionRef: 'WARDEN-ADMISSION-004',
          proposalId: createProposal.proposalId,
          candidateRef: candidate.candidateRef,
          mutation: 'BIND_TO_EXISTING_OBJECT',
          canonicalKind: 'DEVICE',
          allowed: true,
          reservationRef: 'WARDEN-RESERVATION-004',
        }),
        createCanonicalObject,
        bindToExistingObject: jest.fn(),
        recordMutationEvidence: async () => undefined,
      }),
    ).rejects.toThrow('WARDEN_ADMISSION_MUTATION_MISMATCH');

    expect(createCanonicalObject).not.toHaveBeenCalled();
  });

  it('binds only to the canonical object named in both proposal and decision', async () => {
    const proposal: GenesisAdmissionProposal = {
      ...createProposal,
      proposalId: 'GENESIS-ADMISSION-PROPOSAL-005',
      proposalKind: 'BIND_TO_EXISTING_OBJECT',
      correlationClassification: 'MATCH',
      correlationStrength: 'STRONG',
      matchedCanonicalId: 'GENESIS-DEVICE-001',
    };

    const bindToExistingObject = jest.fn(async () => ({
      canonicalId: 'GENESIS-DEVICE-001',
      mutationRef: 'GENESIS-MUTATION-005',
      mutation: 'BIND_TO_EXISTING_OBJECT' as const,
      state: 'PENDING_VERIFICATION' as const,
    }));

    const result = await executePlatformIOGenesisAdmission(
      proposal,
      candidate,
      {
        authorizeAdmission: async () => ({
          decisionRef: 'WARDEN-ADMISSION-005',
          proposalId: proposal.proposalId,
          candidateRef: candidate.candidateRef,
          mutation: 'BIND_TO_EXISTING_OBJECT',
          canonicalKind: 'DEVICE',
          targetCanonicalId: 'GENESIS-DEVICE-001',
          allowed: true,
          reservationRef: 'WARDEN-RESERVATION-005',
        }),
        createCanonicalObject: jest.fn(),
        bindToExistingObject,
        recordMutationEvidence: async () => undefined,
      },
    );

    expect(bindToExistingObject).toHaveBeenCalledWith(
      expect.objectContaining({
        canonicalId: 'GENESIS-DEVICE-001',
      }),
    );
    expect(result.mutation.canonicalId).toBe('GENESIS-DEVICE-001');
  });
});
