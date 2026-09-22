import {
  assertContextIsActive,
  parseContextRequest,
} from './validation';

describe('operating context validation', () => {
  it('accepts Admin with estate scope', () => {
    expect(
      parseContextRequest({
        role: 'admin',
        scope: {
          type: 'estate',
          estateRef: 'estate:default/alpha',
        },
      }),
    ).toEqual({
      role: 'admin',
      scope: {
        type: 'estate',
        estateRef: 'estate:default/alpha',
      },
    });
  });

  it('accepts Developer with company scope', () => {
    expect(
      parseContextRequest({
        role: 'developer',
        scope: {
          type: 'company',
          companyRef: 'company:default/voi-jeans',
          workspaceRef: 'workspace:default/retail',
        },
      }),
    ).toEqual({
      role: 'developer',
      scope: {
        type: 'company',
        companyRef: 'company:default/voi-jeans',
        workspaceRef: 'workspace:default/retail',
      },
    });
  });

  it('rejects Developer with estate scope', () => {
    expect(() =>
      parseContextRequest({
        role: 'developer',
        scope: {
          type: 'estate',
          estateRef: 'estate:default/alpha',
        },
      }),
    ).toThrow('developer context requires company scope');
  });

  it('rejects an expired active context', () => {
    expect(() =>
      assertContextIsActive(
        {
          principal: 'user:default/faiz',
          role: 'admin',
          scope: {
            type: 'estate',
            estateRef: 'estate:default/alpha',
          },
          spotlightRef: 'spotlight:alpha',
          wardenDecisionRef: 'warden:decision:1',
          authorityExpiresAt: '2026-01-01T00:00:00.000Z',
          riverSessionRef: 'river:session:1',
        },
        new Date('2026-09-22T00:00:00.000Z'),
      ),
    ).toThrow('operating context authority is expired or invalid');
  });
});
