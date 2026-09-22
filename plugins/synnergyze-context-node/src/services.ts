import {
  ContextRequest,
  ContextTransitionEvent,
  OperatingContextOption,
  RiverTransitionReceipt,
  WardenAuthorizationResult,
} from '@esomoire/backstage-plugin-synnergyze-context-common';

export interface WardenContextAuthorizer {
  authorize(input: {
    principal: string;
    request: ContextRequest;
  }): Promise<WardenAuthorizationResult>;

  listEligibleContexts?(input: {
    principal: string;
  }): Promise<OperatingContextOption[]>;
}

export interface RiverContextObserver {
  recordTransition(
    event: ContextTransitionEvent,
  ): Promise<RiverTransitionReceipt>;
}
