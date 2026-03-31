import { describe, it, expect } from 'vitest';
import { FireSignal } from '../../src/core/FireSignal';

const host = process.env.FS_E2E_HOST;
const apiKey = process.env.FS_E2E_API_KEY;
const enabled = Boolean(host && apiKey);

describe('platform e2e contract (optional)', () => {
  it.skipIf(!enabled)(
    'calls track, identify, incident.report, and flags.evaluate against local platform',
    { timeout: 20000 },
    async () => {
      const fire = new FireSignal({ strictPlatformProvider: true });
      fire.add(`fire://${apiKey}@${host}`);

      const externalId = `sdk_e2e_${Date.now()}`;

      await expect(
        fire.track('sdk.e2e.track', {
          user: { id: externalId },
          properties: { source: 'vitest' },
        })
      ).resolves.toBe(true);

      await expect(
        fire.identify(externalId, {
          email: `${externalId}@example.com`,
          plan: 'FREE',
        })
      ).resolves.toBe(true);

      await expect(
        fire.incident.report({
          code: 'sdk_e2e_incident',
          fingerprint: `sdk:e2e:${externalId}`,
          severity: 'P3',
          message: 'sdk e2e incident',
        })
      ).resolves.toBe(true);

      const decision = await fire.flags.evaluate('sdk.e2e.flag', {
        user: { id: externalId },
      });

      expect(decision).toHaveProperty('enabled');
      expect(decision).toHaveProperty('variantKey');
    }
  );
});
