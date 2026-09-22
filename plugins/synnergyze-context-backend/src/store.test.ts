import { OperatingContext } from '@esomoire/backstage-plugin-synnergyze-context-common';
import { InMemoryOperatingContextStore } from './store';

const activeContext = (): OperatingContext => ({
  principal: 'user:default/faiz',
  role: 'developer',
  scope: {
    type: 'company',
    companyRef: 'company:default/voi-jeans',
  },
  spotlightRef: 'spotlight:voi-jeans',
  wardenDecisionRef: 'warden:decision:001',
  authorityExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  riverSessionRef: 'river:session:001',
});

describe('InMemoryOperatingContextStore', () => {
  it('stores and returns an active context', async () => {
    const store = new InMemoryOperatingContextStore();
    const context = activeContext();

    await store.set(context);

    await expect(store.get(context.principal)).resolves.toEqual(context);
  });

  it('clears a context', async () => {
    const store = new InMemoryOperatingContextStore();
    const context = activeContext();

    await store.set(context);
    await store.clear(context.principal);

    await expect(store.get(context.principal)).resolves.toBeUndefined();
  });

  it('drops a context after its authority expires', async () => {
    const store = new InMemoryOperatingContextStore();
    const context = activeContext();

    await store.set(context);
    context.authorityExpiresAt = new Date(Date.now() - 1_000).toISOString();

    await expect(store.get(context.principal)).resolves.toBeUndefined();
  });
});
