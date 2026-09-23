import {
  assertSignalEnvelope,
  OBSERVATION_SURFACES,
  SOURCE_DOMAINS,
  type SignalEnvelope,
} from './sourceTaxonomy';

describe('Synnergyze source taxonomy', () => {
  it('keeps telecom distinct from mobile', () => {
    expect(SOURCE_DOMAINS).toContain('TELECOM');
    expect(SOURCE_DOMAINS).toContain('MOBILE');
  });

  it('treats POS as an observation surface', () => {
    expect(OBSERVATION_SURFACES).toContain('POS_TERMINAL');
    expect(SOURCE_DOMAINS).not.toContain('POS_TERMINAL' as never);
  });

  it('accepts a provider-neutral payment observation', () => {
    const envelope: SignalEnvelope = {
      id: 'sig-001',
      domain: 'PAYMENTS',
      surface: 'POS_TERMINAL',
      signal: 'AUTHORIZATION_APPROVED',
      signalClass: 'TRANSACTION',
      provider: {
        id: 'provider-native-payment-system',
        executionClass: 'PROVIDER_NATIVE',
        providerReceiptRef: 'receipt-001',
      },
      wardenDecisionRef: 'warden-decision-001',
      riverEvidenceRefs: ['river:evidence:001'],
      observedAt: '2026-09-23T10:00:00.000Z',
      schemaVersion: 'synnergyze.signal.r0.1',
    };

    expect(() => assertSignalEnvelope(envelope)).not.toThrow();
  });

  it('rejects an invalid surface', () => {
    const envelope = {
      id: 'sig-002',
      domain: 'TELECOM',
      surface: 'UNKNOWN_SURFACE',
      signal: 'ESIM_PROFILE_ACTIVATED',
      signalClass: 'EVENT',
      provider: {
        id: 'carrier',
        executionClass: 'PROVIDER_NATIVE_REMOTE',
      },
      riverEvidenceRefs: [],
      observedAt: '2026-09-23T10:00:00.000Z',
      schemaVersion: 'synnergyze.signal.r0.1',
    } as unknown as SignalEnvelope;

    expect(() => assertSignalEnvelope(envelope)).toThrow(
      'Unsupported observation surface',
    );
  });
});
