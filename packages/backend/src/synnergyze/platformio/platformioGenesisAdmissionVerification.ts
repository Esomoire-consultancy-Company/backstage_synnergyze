import {
  GenesisAdmissionMutationResult,
} from './platformioGenesisAdmissionExecution';

export interface GenesisAdmissionVerificationResult {
  verificationRef: string;
  canonicalId: string;
  verified: boolean;
  reason?: string;
  observedStateRef?: string;
}

export interface GenesisAdmissionVerificationReceipt {
  eventType: 'platformio.genesis_admission.verified';
  canonicalId: string;
  mutationRef: string;
  verificationRef: string;
  verified: boolean;
  resultingState: 'VERIFIED' | 'RECONCILIATION_REQUIRED';
  canonicalTruthEstablished: boolean;
  recordedAt: string;
}

export interface PlatformIOGenesisVerificationPorts {
  verifyCanonicalMutation: (
    mutation: GenesisAdmissionMutationResult,
  ) => Promise<GenesisAdmissionVerificationResult>;
  markCanonicalVerified: (input: {
    canonicalId: string;
    mutationRef: string;
    verificationRef: string;
  }) => Promise<void>;
  holdCanonicalForReconciliation: (input: {
    canonicalId: string;
    mutationRef: string;
    verificationRef: string;
    reason?: string;
  }) => Promise<void>;
  recordVerificationEvidence: (
    receipt: GenesisAdmissionVerificationReceipt,
  ) => Promise<void>;
  now?: () => Date;
}

export async function verifyPlatformIOGenesisAdmission(
  mutation: GenesisAdmissionMutationResult,
  ports: PlatformIOGenesisVerificationPorts,
) {
  if (mutation.state !== 'PENDING_VERIFICATION') {
    throw new Error('GENESIS_ADMISSION_NOT_PENDING_VERIFICATION');
  }

  const verification = await ports.verifyCanonicalMutation(mutation);

  if (verification.canonicalId !== mutation.canonicalId) {
    throw new Error('GENESIS_ADMISSION_VERIFICATION_TARGET_MISMATCH');
  }

  const recordedAt = (ports.now ?? (() => new Date()))().toISOString();

  if (verification.verified) {
    await ports.markCanonicalVerified({
      canonicalId: mutation.canonicalId,
      mutationRef: mutation.mutationRef,
      verificationRef: verification.verificationRef,
    });

    await ports.recordVerificationEvidence({
      eventType: 'platformio.genesis_admission.verified',
      canonicalId: mutation.canonicalId,
      mutationRef: mutation.mutationRef,
      verificationRef: verification.verificationRef,
      verified: true,
      resultingState: 'VERIFIED',
      canonicalTruthEstablished: true,
      recordedAt,
    });

    return {
      verification,
      resultingState: 'VERIFIED' as const,
      canonicalTruthEstablished: true as const,
    };
  }

  await ports.holdCanonicalForReconciliation({
    canonicalId: mutation.canonicalId,
    mutationRef: mutation.mutationRef,
    verificationRef: verification.verificationRef,
    reason: verification.reason,
  });

  await ports.recordVerificationEvidence({
    eventType: 'platformio.genesis_admission.verified',
    canonicalId: mutation.canonicalId,
    mutationRef: mutation.mutationRef,
    verificationRef: verification.verificationRef,
    verified: false,
    resultingState: 'RECONCILIATION_REQUIRED',
    canonicalTruthEstablished: false,
    recordedAt,
  });

  return {
    verification,
    resultingState: 'RECONCILIATION_REQUIRED' as const,
    canonicalTruthEstablished: false as const,
  };
}
