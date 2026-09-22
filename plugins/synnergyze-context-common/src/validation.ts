import {
  ContextRequest,
  OperatingContext,
  OperatingScope,
} from './types';

function requireString(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

function parseScope(value: unknown): OperatingScope {
  if (!value || typeof value !== 'object') {
    throw new Error('scope must be an object');
  }

  const scope = value as Record<string, unknown>;

  if (scope.type === 'estate') {
    requireString(scope.estateRef, 'scope.estateRef');
    return {
      type: 'estate',
      estateRef: scope.estateRef,
    };
  }

  if (scope.type === 'company') {
    requireString(scope.companyRef, 'scope.companyRef');

    if (scope.workspaceRef !== undefined) {
      requireString(scope.workspaceRef, 'scope.workspaceRef');
    }

    if (scope.projectRef !== undefined) {
      requireString(scope.projectRef, 'scope.projectRef');
    }

    return {
      type: 'company',
      companyRef: scope.companyRef,
      ...(scope.workspaceRef ? { workspaceRef: scope.workspaceRef } : {}),
      ...(scope.projectRef ? { projectRef: scope.projectRef } : {}),
    };
  }

  throw new Error('scope.type must be estate or company');
}

export function parseContextRequest(value: unknown): ContextRequest {
  if (!value || typeof value !== 'object') {
    throw new Error('context request must be an object');
  }

  const input = value as Record<string, unknown>;

  if (input.role !== 'admin' && input.role !== 'developer') {
    throw new Error('role must be admin or developer');
  }

  const scope = parseScope(input.scope);

  if (input.role === 'admin' && scope.type !== 'estate') {
    throw new Error('admin context requires estate scope');
  }

  if (input.role === 'developer' && scope.type !== 'company') {
    throw new Error('developer context requires company scope');
  }

  if (input.spotlightRef !== undefined) {
    requireString(input.spotlightRef, 'spotlightRef');
  }

  return {
    role: input.role,
    scope,
    ...(input.spotlightRef ? { spotlightRef: input.spotlightRef } : {}),
  };
}

export function assertContextIsActive(
  context: OperatingContext,
  now = new Date(),
): void {
  requireString(context.principal, 'principal');
  requireString(context.spotlightRef, 'spotlightRef');
  requireString(context.wardenDecisionRef, 'wardenDecisionRef');
  requireString(context.riverSessionRef, 'riverSessionRef');
  requireString(context.authorityExpiresAt, 'authorityExpiresAt');

  const expiry = Date.parse(context.authorityExpiresAt);
  if (!Number.isFinite(expiry) || expiry <= now.getTime()) {
    throw new Error('operating context authority is expired or invalid');
  }

  if (context.role === 'admin' && context.scope.type !== 'estate') {
    throw new Error('admin context requires estate scope');
  }

  if (context.role === 'developer' && context.scope.type !== 'company') {
    throw new Error('developer context requires company scope');
  }
}
