import {
  observePlatformIO,
  PlatformIOCommandResult,
  PlatformIOInvocation,
  PlatformIOObservationRequest,
} from './platformioObservationAdapter';

export interface PlatformIOAuthorityContext {
  principalId: string;
  digitalMeId?: string;
  matterId?: string;
  purpose: string;
  targetScope?: string;
}

export interface PlatformIOAuthorityDecision {
  decisionRef: string;
  allowed: boolean;
  expiresAt?: string;
  reason?: string;
}

export interface PlatformIOObservationReceipt {
  eventType: 'platformio.observation.completed';
  requestId: string;
  capabilityId: string;
  principalId: string;
  decisionRef: string;
  providerExitCode: number;
  providerObservedSuccess: boolean;
  observedAt: string;
}

export interface PlatformIOGovernancePorts {
  authorize: (
    request: PlatformIOObservationRequest,
    context: PlatformIOAuthorityContext,
  ) => Promise<PlatformIOAuthorityDecision>;
  run: (
    invocation: PlatformIOInvocation,
  ) => Promise<PlatformIOCommandResult>;
  recordEvidence: (receipt: PlatformIOObservationReceipt) => Promise<void>;
  now?: () => Date;
}

export async function observePlatformIOGoverned(
  requestId: string,
  request: PlatformIOObservationRequest,
  context: PlatformIOAuthorityContext,
  ports: PlatformIOGovernancePorts,
) {
  const decision = await ports.authorize(request, context);

  if (!decision.allowed) {
    throw new Error(
      `WARDEN_DENIED:${decision.decisionRef}:${decision.reason ?? 'DENIED'}`,
    );
  }

  if (decision.expiresAt) {
    const now = (ports.now ?? (() => new Date()))();
    if (new Date(decision.expiresAt).getTime() <= now.getTime()) {
      throw new Error(`WARDEN_DECISION_EXPIRED:${decision.decisionRef}`);
    }
  }

  const observation = await observePlatformIO(request, ports.run);

  await ports.recordEvidence({
    eventType: 'platformio.observation.completed',
    requestId,
    capabilityId: request.capabilityId,
    principalId: context.principalId,
    decisionRef: decision.decisionRef,
    providerExitCode: observation.providerExitCode,
    providerObservedSuccess: observation.ok,
    observedAt: (ports.now ?? (() => new Date()))().toISOString(),
  });

  return {
    authority: decision,
    observation,
    canonicalTruthEstablished: false as const,
  };
}
