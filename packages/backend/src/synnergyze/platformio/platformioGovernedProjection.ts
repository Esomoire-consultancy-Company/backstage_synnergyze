import {
  PlatformIOAuthorityContext,
  PlatformIOGovernancePorts,
  observePlatformIOGoverned,
} from './platformioGovernedObserver';
import {
  GenesisPlatformIOCandidate,
  projectPlatformIOObservationToGenesisCandidates,
} from './platformioGenesisProjection';
import {
  PlatformIOObservationRequest,
} from './platformioObservationAdapter';

export interface PlatformIOCandidateStore {
  upsertCandidate: (candidate: GenesisPlatformIOCandidate) => Promise<{
    candidateRef: string;
    created: boolean;
  }>;
}

export interface PlatformIOCandidateProjectionReceipt {
  eventType: 'platformio.genesis_candidate.projected';
  requestId: string;
  candidateRef: string;
  candidateKind: GenesisPlatformIOCandidate['kind'];
  lifecycleStatus: 'PROVISIONAL';
  canonicalObjectCreated: false;
  observedAt: string;
}

export interface PlatformIOGovernedProjectionPorts
  extends PlatformIOGovernancePorts {
  candidateStore: PlatformIOCandidateStore;
  recordProjectionEvidence: (
    receipt: PlatformIOCandidateProjectionReceipt,
  ) => Promise<void>;
  riverEvidenceRefFor: (requestId: string) => Promise<string>;
}

export async function observeAndProjectPlatformIO(
  requestId: string,
  request: PlatformIOObservationRequest,
  context: PlatformIOAuthorityContext,
  ports: PlatformIOGovernedProjectionPorts,
) {
  const governed = await observePlatformIOGoverned(
    requestId,
    request,
    context,
    ports,
  );

  const observedAt = (ports.now ?? (() => new Date()))().toISOString();
  const riverEvidenceRef = await ports.riverEvidenceRefFor(requestId);

  const candidates = projectPlatformIOObservationToGenesisCandidates(
    governed.observation,
    {
      requestId,
      wardenDecisionRef: governed.authority.decisionRef,
      riverEvidenceRef,
      observedAt,
      projectDir: request.projectDir,
    },
  );

  const stored = [];

  for (const candidate of candidates) {
    const result = await ports.candidateStore.upsertCandidate(candidate);

    await ports.recordProjectionEvidence({
      eventType: 'platformio.genesis_candidate.projected',
      requestId,
      candidateRef: result.candidateRef,
      candidateKind: candidate.kind,
      lifecycleStatus: 'PROVISIONAL',
      canonicalObjectCreated: false,
      observedAt,
    });

    stored.push({
      candidate,
      storeResult: result,
    });
  }

  return {
    authority: governed.authority,
    observation: governed.observation,
    candidates: stored,
    canonicalTruthEstablished: false as const,
    canonicalObjectCreated: false as const,
  };
}
