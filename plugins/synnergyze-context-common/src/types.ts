export type OperatingRole = 'admin' | 'developer';

export type EstateScope = {
  type: 'estate';
  estateRef: string;
};

export type CompanyScope = {
  type: 'company';
  companyRef: string;
  workspaceRef?: string;
  projectRef?: string;
};

export type OperatingScope = EstateScope | CompanyScope;

export type ContextRequest = {
  role: OperatingRole;
  scope: OperatingScope;
  spotlightRef?: string;
};

export type WardenContextDecision = {
  decisionRef: string;
  principal: string;
  role: OperatingRole;
  scope: OperatingScope;
  spotlightRef: string;
  authorityExpiresAt: string;
};

export type WardenAuthorizationResult =
  | {
      authorized: true;
      decision: WardenContextDecision;
    }
  | {
      authorized: false;
      reason: string;
    };

export type OperatingContext = {
  principal: string;
  role: OperatingRole;
  scope: OperatingScope;
  spotlightRef: string;
  wardenDecisionRef: string;
  authorityExpiresAt: string;
  riverSessionRef: string;
};

export type ContextTransitionEvent = {
  eventId: string;
  eventType: 'synnergyze.context.transitioned';
  occurredAt: string;
  principal: string;
  previousContext?: OperatingContext;
  decision: WardenContextDecision;
};

export type RiverTransitionReceipt = {
  riverSessionRef: string;
};
