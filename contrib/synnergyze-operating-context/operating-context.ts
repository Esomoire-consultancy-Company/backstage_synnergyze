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

export type OperatingContext = {
  /** Stable DigitalMe principal. */
  principal: string;
  role: OperatingRole;
  scope: OperatingScope;
  /** Canonical session Spotlight. */
  spotlightRef: string;
  /** Warden authorization decision governing this context. */
  wardenDecisionRef: string;
  /** ISO-8601 expiry for the Warden authorization. */
  authorityExpiresAt: string;
  /** River session/evidence lineage for this context. */
  riverSessionRef: string;
};

export type ContextRequest = {
  role: OperatingRole;
  scope: OperatingScope;
  spotlightRef?: string;
};

export function validateContextShape(
  context: OperatingContext,
  now = new Date(),
): void {
  if (!context.principal) {
    throw new Error('Operating context requires a DigitalMe principal');
  }

  if (!context.wardenDecisionRef) {
    throw new Error('Operating context requires a Warden decision reference');
  }

  if (!context.riverSessionRef) {
    throw new Error('Operating context requires a River session reference');
  }

  if (new Date(context.authorityExpiresAt).getTime() <= now.getTime()) {
    throw new Error('Operating context authority is expired');
  }

  if (context.role === 'admin' && context.scope.type !== 'estate') {
    throw new Error('Admin context requires estate scope');
  }

  if (context.role === 'developer' && context.scope.type !== 'company') {
    throw new Error('Developer context requires company scope');
  }
}
