/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

export type OperatingContextOption = {
  id: string;
  label: string;
  spotlightRef?: string;
} & (
  | {
      role: 'admin';
      scope: EstateScope;
    }
  | {
      role: 'developer';
      scope: CompanyScope;
    }
);

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
