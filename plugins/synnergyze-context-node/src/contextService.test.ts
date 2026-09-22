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

import { synnergyzeOperatingContextServiceRef } from './contextService';

// The service implementation is exercised indirectly by the backend broker.
// This test protects the stable root-scoped service identifier used by policy modules.
describe('synnergyzeOperatingContextServiceRef', () => {
  it('uses the canonical service id', () => {
    expect(synnergyzeOperatingContextServiceRef.id).toBe(
      'synnergyze.operating-context',
    );
  });
});
