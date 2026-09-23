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

export type HandoffState =
  | 'NOT_READY'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED';

export type HandoffIdentity = {
  id: string;
  location: string;
  scope: string;
  producer: string;
  receiver: string;
};

export type HandoffEvidence = {
  upstream: Array<{ dependency: string; evidenceRef: string }>;
  wardenDecisionRef?: string;
  riverEvidenceRef?: string;
  // Supplied observations, never translated into canonical acceptance.
  externalEffects: Array<{
    provider: string;
    nativeState: string;
    evidenceRef: string;
  }>;
};

export type Handoff = HandoffIdentity & {
  state: HandoffState;
  evidence?: HandoffEvidence;
  decision?: {
    actor: string;
    outcome: 'ACCEPTED' | 'REJECTED';
    reason: string;
    contractRef: string;
  };
};

export type Evaluation = { passed: boolean; reason: string };

/** Installed by the receiver's trusted composition code, never by a producer. */
export interface AcceptanceContract {
  ref: string;
  receiver: string;
  location: string;
  scope: string;
  evaluate(handoff: Handoff): Promise<Evaluation>;
}

/** A reference alone is not authority; the adapter must check its exact binding. */
export interface WardenPort {
  evaluate(input: {
    decisionRef: string;
    actor: string;
    action: 'ACCEPT';
    contractRef: string;
    handoff: Handoff;
  }): Promise<Evaluation>;
}

/** Verify supplied evidence against this handoff; do not manufacture a receipt. */
export interface RiverPort {
  evaluate(input: {
    evidenceRef: string;
    contractRef: string;
    handoff: Handoff;
  }): Promise<Evaluation>;
}

export type HandoffServiceOptions = {
  contract: AcceptanceContract;
  warden: WardenPort;
  river: RiverPort;
};
