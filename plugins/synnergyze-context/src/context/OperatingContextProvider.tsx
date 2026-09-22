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

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useApi } from '@backstage/frontend-plugin-api';
import {
  ContextRequest,
  OperatingContext,
  OperatingContextOption,
  WardenAuthorizationResult,
  synnergyzeContextApiRef,
} from '../api';

type OperatingContextState = {
  context?: OperatingContext;
  loading: boolean;
  error?: string;
  options: OperatingContextOption[];
  optionsLoading: boolean;
  optionsDiscoveryAvailable?: boolean;
  optionsError?: string;
  refresh(): Promise<void>;
  refreshOptions(): Promise<void>;
  resolve(request: ContextRequest): Promise<WardenAuthorizationResult>;
  transition(request: ContextRequest): Promise<OperatingContext>;
};

const OperatingContextReactContext =
  createContext<OperatingContextState | undefined>(undefined);

export function OperatingContextProvider({
  children,
}: PropsWithChildren) {
  const api = useApi(synnergyzeContextApiRef);
  const [context, setContext] = useState<OperatingContext>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [options, setOptions] = useState<OperatingContextOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsDiscoveryAvailable, setOptionsDiscoveryAvailable] =
    useState<boolean>();
  const [optionsError, setOptionsError] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      const next = await api.getActiveContext();
      setContext(next);
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load context');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!context) {
      return undefined;
    }

    const expiresAt = Date.parse(context.authorityExpiresAt);
    if (!Number.isFinite(expiresAt)) {
      return undefined;
    }

    const delay = Math.max(0, expiresAt - Date.now()) + 100;
    const timer = window.setTimeout(() => {
      void refresh();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [context, refresh]);

  const refreshOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const result = await api.listEligibleContexts();
      setOptions(result.options);
      setOptionsDiscoveryAvailable(result.discoveryAvailable);
      setOptionsError(undefined);
    } catch (e) {
      setOptions([]);
      setOptionsDiscoveryAvailable(undefined);
      setOptionsError(
        e instanceof Error ? e.message : 'Unable to load eligible contexts',
      );
    } finally {
      setOptionsLoading(false);
    }
  }, [api]);

  const resolve = useCallback(
    (request: ContextRequest) => api.resolveContext(request),
    [api],
  );

  const transition = useCallback(
    async (request: ContextRequest) => {
      const next = await api.transitionContext(request);
      setContext(next);
      setError(undefined);
      return next;
    },
    [api],
  );

  const value = useMemo(
    () => ({
      context,
      loading,
      error,
      options,
      optionsLoading,
      optionsDiscoveryAvailable,
      optionsError,
      refresh,
      refreshOptions,
      resolve,
      transition,
    }),
    [
      context,
      loading,
      error,
      options,
      optionsLoading,
      optionsDiscoveryAvailable,
      optionsError,
      refresh,
      refreshOptions,
      resolve,
      transition,
    ],
  );

  return (
    <OperatingContextReactContext.Provider value={value}>
      {children}
    </OperatingContextReactContext.Provider>
  );
}

export function useOperatingContext(): OperatingContextState {
  const value = useContext(OperatingContextReactContext);
  if (!value) {
    throw new Error(
      'useOperatingContext must be used within OperatingContextProvider',
    );
  }
  return value;
}
