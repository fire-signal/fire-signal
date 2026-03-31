import type { FlagDecision, FlagsContext } from 'fire-signal';
import type { ReactNode } from 'react';

export type FireIdentity = {
  id: string;
};

export type FireProviderContext = {
  user?: FireIdentity;
  company?: FireIdentity;
  traits?: Record<string, unknown>;
};

export type FireProviderProps = {
  children: ReactNode;
  publishableKey: string;
  host?: string;
  strictPlatformProvider?: boolean;
  user?: FireIdentity;
  company?: FireIdentity;
  traits?: Record<string, unknown>;
};

export type UseFlagOptions = {
  enabled?: boolean;
  refreshMs?: number;
};

export type UseFlagDecisionResult<T = unknown> = {
  loading: boolean;
  error?: Error;
  decision?: FlagDecision<T>;
  refetch: () => Promise<void>;
};

export type FireFlagRenderProps<T = unknown> = FlagDecision<T>;

export type FireFlagProps<T = unknown> = {
  flag: string;
  context?: FlagsContext;
  options?: UseFlagOptions;
  fallback?: ReactNode;
  children: (decision: FireFlagRenderProps<T>) => ReactNode;
};
