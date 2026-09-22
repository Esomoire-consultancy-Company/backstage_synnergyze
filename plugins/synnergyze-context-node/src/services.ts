import {
  ContextRequest,
  ContextTransitionEvent,
  RiverTransitionReceipt,
  WardenAuthorizationResult,
} from '@esomoire/backstage-plugin-synnergyze-context-common';

export interface WardenContextAuthorizer {
  authorize(input: {
    principal: string;
    request: ContextRequest;
  }): Promise<WardenAuthorizationResult>;
}

export interface RiverContextObserver {
  recordTransition(
    event: ContextTransitionEvent,
  ): Promise<RiverTransitionReceipt>;
}
