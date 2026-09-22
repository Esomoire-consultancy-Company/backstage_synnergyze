import { createPermission } from '@backstage/plugin-permission-common';

/**
 * Read company or Estate billing information through Synnergyze.
 *
 * This permission is definitive at R0.3 because billing resources are served
 * by the Synnergyze billing surface rather than the Backstage catalog.
 */
export const synnergyzeBillingReadPermission = createPermission({
  name: 'synnergyze.billing.read',
  attributes: {
    action: 'read',
  },
});
