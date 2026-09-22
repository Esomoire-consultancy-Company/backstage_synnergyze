export interface Config {
  synnergyze?: {
    context?: {
      warden?: {
        baseUrl?: string;
        authorizePath?: string;
        optionsPath?: string;
        /**
         * Optional backend-only bearer token.
         * @visibility secret
         */
        bearerToken?: string;
      };
      river?: {
        baseUrl?: string;
        transitionPath?: string;
        /**
         * Optional backend-only bearer token.
         * @visibility secret
         */
        bearerToken?: string;
      };
    };
  };
}
