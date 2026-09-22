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
