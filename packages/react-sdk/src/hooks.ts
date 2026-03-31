import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FlagDecision, FlagsContext } from 'fire-signal';
import { evaluateWithProvider, useFireProvider } from './context';
import type { UseFlagDecisionResult, UseFlagOptions } from './types';

export function useFlagDecision<T = unknown>(
  flag: string,
  context: FlagsContext = {},
  options: UseFlagOptions = {}
): UseFlagDecisionResult<T> {
  const provider = useFireProvider();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [decision, setDecision] = useState<FlagDecision<T> | undefined>(
    undefined
  );

  const enabled = options.enabled ?? true;
  const refreshMs = options.refreshMs;

  const run = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(undefined);

    try {
      const result = await evaluateWithProvider<T>(provider, flag, context);
      setDecision(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [context, enabled, flag, provider]);

  useEffect(() => {
    void run();
  }, [run]);

  useEffect(() => {
    if (!enabled || !refreshMs || refreshMs <= 0) return;

    const timer = setInterval(() => {
      void run();
    }, refreshMs);

    return () => clearInterval(timer);
  }, [enabled, refreshMs, run]);

  return {
    loading,
    error,
    decision,
    refetch: run,
  };
}

export function useFlag(
  flag: string,
  context: FlagsContext = {},
  options: UseFlagOptions = {}
) {
  const { loading, error, decision, refetch } = useFlagDecision(
    flag,
    context,
    options
  );

  return {
    loading,
    error,
    enabled: !!decision?.enabled,
    decision,
    refetch,
  };
}

export function useVariantValue<T = unknown>(
  flag: string,
  context: FlagsContext = {},
  fallback?: T,
  options: UseFlagOptions = {}
) {
  const { loading, error, decision, refetch } = useFlagDecision<T>(
    flag,
    context,
    options
  );

  const value = useMemo(() => {
    if (!decision?.enabled) return fallback;
    return decision?.value ?? fallback;
  }, [decision?.enabled, decision?.value, fallback]);

  return {
    loading,
    error,
    enabled: !!decision?.enabled,
    value,
    decision,
    refetch,
  };
}
