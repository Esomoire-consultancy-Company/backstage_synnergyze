import {
  verifyPlatformIOGenesisAdmission,
} from './platformioGenesisAdmissionVerification';

const mutation = {
  canonicalId: 'GENESIS-DEVICE-101',
  mutationRef: 'GENESIS-MUTATION-001',
  mutation: 'CREATE_CANONICAL_OBJECT' as const,
  state: 'PENDING_VERIFICATION' as const,
};

describe('PlatformIO Genesis admission verification', () => {
  it('establishes canonical truth only after independent verification succeeds', async () => {
    const marked: unknown[] = [];
    const receipts: unknown[] = [];

    const result = await verifyPlatformIOGenesisAdmission(mutation, {
      verifyCanonicalMutation: async () => ({
        verificationRef: 'VERIFY-001',
        canonicalId: mutation.canonicalId,
        verified: true,
        observedStateRef: 'RIVER-STATE-001',
      }),
      markCanonicalVerified: async input => {
        marked.push(input);
      },
      holdCanonicalForReconciliation: async () => undefined,
      recordVerificationEvidence: async receipt => {
        receipts.push(receipt);
      },
      now: () => new Date('2026-09-26T05:45:00.000Z'),
    });

    expect(marked).toHaveLength(1);
    expect(result).toMatchObject({
      resultingState: 'VERIFIED',
      canonicalTruthEstablished: true,
    });
    expect(receipts[0]).toMatchObject({
      verified: true,
      resultingState: 'VERIFIED',
      canonicalTruthEstablished: true,
    });
  });

  it('holds failed verification for reconciliation and does not establish canonical truth', async () => {
    const held: unknown[] = [];

    const result = await verifyPlatformIOGenesisAdmission(mutation, {
      verifyCanonicalMutation: async () => ({
        verificationRef: 'VERIFY-002',
        canonicalId: mutation.canonicalId,
        verified: false,
        reason: 'DEVICE_IDENTITY_NOT_CONFIRMED',
      }),
      markCanonicalVerified: async () => undefined,
      holdCanonicalForReconciliation: async input => {
        held.push(input);
      },
      recordVerificationEvidence: async () => undefined,
    });

    expect(held).toHaveLength(1);
    expect(result).toMatchObject({
      resultingState: 'RECONCILIATION_REQUIRED',
      canonicalTruthEstablished: false,
    });
  });

  it('rejects verification evidence for a different canonical target', async () => {
    await expect(
      verifyPlatformIOGenesisAdmission(mutation, {
        verifyCanonicalMutation: async () => ({
          verificationRef: 'VERIFY-003',
          canonicalId: 'GENESIS-DEVICE-OTHER',
          verified: true,
        }),
        markCanonicalVerified: async () => undefined,
        holdCanonicalForReconciliation: async () => undefined,
        recordVerificationEvidence: async () => undefined,
      }),
    ).rejects.toThrow('GENESIS_ADMISSION_VERIFICATION_TARGET_MISMATCH');
  });
});
