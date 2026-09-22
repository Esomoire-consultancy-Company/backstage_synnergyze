import { createExtensionPoint } from '@backstage/backend-plugin-api';
import {
  RiverContextObserver,
  WardenContextAuthorizer,
} from './services';

export interface SynnergyzeContextAuthorizationExtensionPoint {
  setAuthorizer(authorizer: WardenContextAuthorizer): void;
}

export interface SynnergyzeContextObservationExtensionPoint {
  setObserver(observer: RiverContextObserver): void;
}

export const synnergyzeContextAuthorizationExtensionPoint =
  createExtensionPoint<SynnergyzeContextAuthorizationExtensionPoint>({
    id: 'synnergyze-context.authorization',
  });

export const synnergyzeContextObservationExtensionPoint =
  createExtensionPoint<SynnergyzeContextObservationExtensionPoint>({
    id: 'synnergyze-context.observation',
  });
