import {
  PLATFORMIO_EFFECT_CAPABILITIES_ADMITTED,
  PLATFORMIO_OBSERVATION_CAPABILITIES,
  PLATFORMIO_PROVIDER_ID,
  getPlatformIOCapability,
} from './platformioProviderContract';

describe('PlatformIO Provider Adapter R0.1 contract', () => {
  it('registers the canonical provider id', () => {
    expect(PLATFORMIO_PROVIDER_ID).toBe('PROVIDER-PLATFORMIO-001');
  });

  it('admits exactly eight observation capabilities', () => {
    expect(PLATFORMIO_OBSERVATION_CAPABILITIES).toHaveLength(8);
  });

  it('keeps every admitted capability non-effect-producing', () => {
    expect(
      PLATFORMIO_OBSERVATION_CAPABILITIES.every(
        capability =>
          capability.effectProducing === false &&
          capability.authorityRequired === true &&
          capability.evidenceRequired === true,
      ),
    ).toBe(true);
  });

  it('does not admit effect-producing PlatformIO capabilities in R0.1', () => {
    expect(PLATFORMIO_EFFECT_CAPABILITIES_ADMITTED).toBe(false);
  });

  it('does not expose an arbitrary CLI passthrough', () => {
    expect(getPlatformIOCapability('platformio.device.list')?.actionClass).toBe(
      'OBSERVE',
    );
    expect(getPlatformIOCapability('platformio.exec')).toBeUndefined();
  });
});
