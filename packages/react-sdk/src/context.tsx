import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { FireSignal, type FlagsContext, type FlagDecision } from 'fire-signal';

type InternalContextValue = {
  fire: FireSignal;
  baseContext: FlagsContext;
};

const FireReactContext = createContext<InternalContextValue | null>(null);

export type FireProviderProps = {
  children: ReactNode;
  publishableKey: string;
  host?: string;
  strictPlatformProvider?: boolean;
  user?: { id: string };
  company?: { id: string };
  traits?: Record<string, unknown>;
};

export function FireProvider({
  children,
  publishableKey,
  host,
  strictPlatformProvider = false,
  user,
  company,
  traits,
}: FireProviderProps) {
  const fire = useMemo(() => {
    const instance = new FireSignal({
      strictPlatformProvider,
    });

    const fireUrl = host
      ? `fire://${publishableKey}@${host}`
      : `fire://${publishableKey}`;

    instance.add(fireUrl, ['platform']);
    return instance;
  }, [host, publishableKey, strictPlatformProvider]);

  const baseContext = useMemo<FlagsContext>(
    () => ({ user, company, traits }),
    [company, traits, user]
  );

  const value = useMemo(
    () => ({ fire, baseContext }),
    [fire, baseContext]
  );

  return (
    <FireReactContext.Provider value={value}>{children}</FireReactContext.Provider>
  );
}

export function useFireProvider() {
  const ctx = useContext(FireReactContext);
  if (!ctx) {
    throw new Error('useFireProvider must be used inside <FireProvider>');
  }
  return ctx;
}

export async function evaluateWithProvider<T = unknown>(
  ctx: InternalContextValue,
  flag: string,
  override: FlagsContext = {}
): Promise<FlagDecision<T>> {
  const mergedContext: FlagsContext = {
    user: override.user || ctx.baseContext.user,
    company: override.company || ctx.baseContext.company,
    traits: {
      ...(ctx.baseContext.traits || {}),
      ...(override.traits || {}),
    },
  };

  return ctx.fire.flags.evaluate<T>(flag, mergedContext, { tags: ['platform'] });
}
