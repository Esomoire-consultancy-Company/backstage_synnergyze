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
  useRef,
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

function sameContext(
  left: OperatingContext | undefined,
  right: OperatingContext | undefined,
): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.principal === right.principal &&
    left.role === right.role &&
    JSON.stringify(left.scope) === JSON.stringify(right.scope) &&
    left.spotlightRef === right.spotlightRef &&
    left.wardenDecisionRef === right.wardenDecisionRef &&
    left.authorityExpiresAt === right.authorityExpiresAt &&
    left.riverSessionRef === right.riverSessionRef
  );
}

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
  const contextRequestVersion = useRef(0);
  const optionsRequestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const requestVersion = ++contextRequestVersion.current;

    try {
      const next = await api.getActiveContext();
      if (requestVersion !== contextRequestVersion.current) {
        return;
      }

      setContext(previous => (sameContext(previous, next) ? previous : next));
      setError(undefined);
    } catch (e) {
      if (requestVersion !== contextRequestVersion.current) {
        return;
      }

      setError(e instanceof Error ? e.message : 'Unable to load context');
    } finally {
      if (requestVersion === contextRequestVersion.current) {
        setLoading(false);
      }
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
    const requestVersion = ++optionsRequestVersion.current;
    setOptionsLoading(true);

    try {
      const result = await api.listEligibleContexts();
      if (requestVersion !== optionsRequestVersion.current) {
        return;
      }

      setOptions(result.options);
      setOptionsDiscoveryAvailable(result.discoveryAvailable);
      setOptionsError(undefined);
    } catch (e) {
      if (requestVersion !== optionsRequestVersion.current) {
        return;
      }

      setOptions([]);
      setOptionsDiscoveryAvailable(undefined);
      setOptionsError(
        e instanceof Error ? e.message : 'Unable to load eligible contexts',
      );
    } finally {
      if (requestVersion === optionsRequestVersion.current) {
        setOptionsLoading(false);
      }
    }
  }, [api]);

  const resolve = useCallback(
    (request: ContextRequest) => api.resolveContext(request),
    [api],
  );

  const transition = useCallback(
    async (request: ContextRequest) => {
      // Invalidate refreshes that started before this transition.
      contextRequestVersion.current += 1;

      const next = await api.transitionContext(request);

      // Invalidate refreshes that may have started while transition was pending.
      contextRequestVersion.current += 1;
      setContext(previous => (sameContext(previous, next) ? previous : next));
      setError(undefined);
      setLoading(false);
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
