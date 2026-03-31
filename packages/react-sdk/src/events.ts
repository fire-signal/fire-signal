import { useCallback } from 'react';
import type { IdentifyTraits, TrackPayload } from 'fire-signal';
import { useFireProvider } from './context';

export function useTrack() {
  const { fire } = useFireProvider();

  return useCallback(
    async (eventName: string, payload: TrackPayload = {}) => {
      return fire.track(eventName, payload, { tags: ['platform'] });
    },
    [fire]
  );
}

export function useIdentify() {
  const { fire } = useFireProvider();

  return useCallback(
    async (externalId: string, traits: IdentifyTraits = {}) => {
      return fire.identify(externalId, traits, { tags: ['platform'] });
    },
    [fire]
  );
}
