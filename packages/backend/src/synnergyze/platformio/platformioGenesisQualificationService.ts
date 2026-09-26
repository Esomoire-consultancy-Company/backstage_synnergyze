import {
  GenesisAdmissionHold,
  GenesisAdmissionProposal,
  GenesisAdmissionPreparation,
  preparePlatformIOGenesisAdmission,
} from './platformioGenesisAdmission';
import {
  GenesisCanonicalIdentityRecord,
  correlatePlatformIOCandidate,
} from './platformioGenesisCorrelation';
import {
  GenesisPlatformIOCandidate,
} from './platformioGenesisProjection';

export interface PlatformIOQualificationStore {
  findCanonicalByKind: (
    kind: 'DEVICE' | 'PROJECT',
  ) => Promise<readonly GenesisCanonicalIdentityRecord[]>;
  saveAdmissionProposal: (
    proposal: GenesisAdmissionProposal,
  ) => Promise<void>;
  saveReconciliationHold: (
    hold: GenesisAdmissionHold,
  ) => Promise<void>;
}

export interface PlatformIOQualificationReceipt {
  eventType: 'platformio.genesis_candidate.qualified';
  candidateRef: string;
  classification: 'NEW' | 'MATCH' | 'AMBIGUOUS' | 'CONFLICT';
  outcome: GenesisAdmissionPreparation['outcome'];
  canonicalMutationPerformed: false;
  recordedAt: string;
}

export interface PlatformIOQualificationPorts {
  store: PlatformIOQualificationStore;
  recordEvidence: (receipt: PlatformIOQualificationReceipt) => Promise<void>;
  now?: () => Date;
}

function canonicalKindFor(candidate: GenesisPlatformIOCandidate) {
  return candidate.kind === 'DISCOVERED_DEVICE' ? 'DEVICE' : 'PROJECT';
}

export async function qualifyPlatformIOGenesisCandidate(
  candidate: GenesisPlatformIOCandidate,
  ports: PlatformIOQualificationPorts,
) {
  if (candidate.lifecycleStatus !== 'PROVISIONAL' || candidate.verified) {
    throw new Error('PLATFORMIO_CANDIDATE_NOT_PROVISIONAL');
  }

  const records = await ports.store.findCanonicalByKind(
    canonicalKindFor(candidate),
  );
  const correlation = correlatePlatformIOCandidate(candidate, records);
  const preparation = preparePlatformIOGenesisAdmission(
    candidate,
    correlation,
  );

  if (preparation.outcome === 'PROPOSAL_READY') {
    await ports.store.saveAdmissionProposal(preparation.proposal);
  } else {
    await ports.store.saveReconciliationHold(preparation.hold);
  }

  await ports.recordEvidence({
    eventType: 'platformio.genesis_candidate.qualified',
    candidateRef: candidate.candidateRef,
    classification: correlation.classification,
    outcome: preparation.outcome,
    canonicalMutationPerformed: false,
    recordedAt: (ports.now ?? (() => new Date()))().toISOString(),
  });

  return {
    correlation,
    preparation,
    canonicalMutationPerformed: false as const,
  };
}
