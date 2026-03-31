import { Fragment } from 'react';
import type { ReactNode } from 'react';
import type { FlagsContext } from 'fire-signal';
import { useFlagDecision } from './hooks';
import type { UseFlagOptions } from './types';

export type FireFlagProps<T = unknown> = {
  flag: string;
  context?: FlagsContext;
  options?: UseFlagOptions;
  fallback?: ReactNode;
  children: (decision: {
    key: string;
    enabled: boolean;
    variantKey?: string;
    value?: T;
    reason?: string;
    fetchedAt: string;
  }) => ReactNode;
};

export function FireFlag<T = unknown>({
  flag,
  context = {},
  options = {},
  fallback = null,
  children,
}: FireFlagProps<T>) {
  const { loading, decision } = useFlagDecision<T>(flag, context, options);

  if (loading || !decision || !decision.enabled) {
    return <Fragment>{fallback}</Fragment>;
  }

  return <Fragment>{children(decision)}</Fragment>;
}
