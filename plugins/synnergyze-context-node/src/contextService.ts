import {
  createServiceFactory,
  createServiceRef,
} from '@backstage/backend-plugin-api';
import {
  assertContextIsActive,
  OperatingContext,
} from '@esomoire/backstage-plugin-synnergyze-context-common';

export interface SynnergyzeOperatingContextService {
  get(principal: string): Promise<OperatingContext | undefined>;
  set(context: OperatingContext): Promise<void>;
  clear(principal: string): Promise<void>;
}

class DefaultSynnergyzeOperatingContextService
  implements SynnergyzeOperatingContextService
{
  readonly #contexts = new Map<string, OperatingContext>();

  async get(principal: string): Promise<OperatingContext | undefined> {
    const context = this.#contexts.get(principal);
    if (!context) {
      return undefined;
    }

    try {
      assertContextIsActive(context);
      return context;
    } catch {
      this.#contexts.delete(principal);
      return undefined;
    }
  }

  async set(context: OperatingContext): Promise<void> {
    assertContextIsActive(context);
    this.#contexts.set(context.principal, { ...context });
  }

  async clear(principal: string): Promise<void> {
    this.#contexts.delete(principal);
  }
}

export const synnergyzeOperatingContextServiceRef =
  createServiceRef<SynnergyzeOperatingContextService>({
    id: 'synnergyze.operating-context',
    scope: 'root',
    defaultFactory: async service =>
      createServiceFactory({
        service,
        deps: {},
        async factory() {
          return new DefaultSynnergyzeOperatingContextService();
        },
      }),
  });
