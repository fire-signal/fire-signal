import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FireProvider,
  FireFlag,
  useFlag,
  useIdentify,
  useTrack,
  useVariantValue,
} from '../src';

const addMock = vi.fn();
const evaluateMock = vi.fn();
const trackMock = vi.fn();
const identifyMock = vi.fn();

vi.mock('fire-signal', () => {
  class FireSignal {
    flags = {
      evaluate: evaluateMock,
    };

    add = addMock;

    track = trackMock;

    identify = identifyMock;

    constructor(_options?: unknown) {}
  }

  return { FireSignal };
});

function FlagProbe() {
  const { enabled, loading } = useFlag('checkout.new-flow');
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="enabled">{String(enabled)}</span>
    </div>
  );
}

function VariantProbe() {
  const { value } = useVariantValue<string>('checkout.promocode');
  return <span data-testid="value">{value || 'none'}</span>;
}

function EventProbe() {
  const track = useTrack();
  const identify = useIdentify();

  React.useEffect(() => {
    void identify('user_123', { plan: 'PLUS' });
    void track('checkout.started', { properties: { amount: 20 } });
  }, [identify, track]);

  return <span data-testid="events">ok</span>;
}

describe('@fire-signal/react-sdk', () => {
  beforeEach(() => {
    addMock.mockClear();
    evaluateMock.mockReset();
    trackMock.mockClear();
    identifyMock.mockClear();

    evaluateMock.mockResolvedValue({
      key: 'checkout.new-flow',
      enabled: true,
      value: '30OFF',
      fetchedAt: new Date().toISOString(),
    });
  });

  it('creates provider with default fire URL from publishable key', () => {
    render(
      <FireProvider publishableKey="fp_pub_123">
        <div>ready</div>
      </FireProvider>
    );

    expect(addMock).toHaveBeenCalledWith('fire://fp_pub_123', ['platform']);
  });

  it('evaluates flag via useFlag and returns enabled', async () => {
    render(
      <FireProvider publishableKey="fp_pub_123">
        <FlagProbe />
      </FireProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('enabled').textContent).toBe('true');
    });

    expect(evaluateMock).toHaveBeenCalledWith(
      'checkout.new-flow',
      expect.any(Object),
      { tags: ['platform'] }
    );
  });

  it('renders FireFlag children when enabled', async () => {
    render(
      <FireProvider publishableKey="fp_pub_123">
        <FireFlag<string> flag="checkout.promocode" fallback={<span>fallback</span>}>
          {(decision) => <span>{decision.value}</span>}
        </FireFlag>
      </FireProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('30OFF')).toBeTruthy();
    });
  });

  it('supports variant helper and event helpers', async () => {
    render(
      <FireProvider publishableKey="fp_pub_123">
        <VariantProbe />
        <EventProbe />
      </FireProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('value').textContent).toBe('30OFF');
    });

    expect(identifyMock).toHaveBeenCalledWith(
      'user_123',
      { plan: 'PLUS' },
      { tags: ['platform'] }
    );
    expect(trackMock).toHaveBeenCalledWith(
      'checkout.started',
      { properties: { amount: 20 } },
      { tags: ['platform'] }
    );
  });
});
