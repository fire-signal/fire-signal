# @fire-signal/react-sdk

React SDK for Fire Platform features powered by `fire-signal`.

Use this package when you want a React-first developer experience for:

- Feature flags (`useFlag`, `useVariantValue`, `useFlagDecision`, `FireFlag`)
- Product events (`useTrack`)
- Customer identity (`useIdentify`)

---

## Installation

Install both packages:

```bash
npm install fire-signal @fire-signal/react-sdk
```

Other package managers:

```bash
pnpm add fire-signal @fire-signal/react-sdk
yarn add fire-signal @fire-signal/react-sdk
bun add fire-signal @fire-signal/react-sdk
```

---

## Quick Start

```tsx
import { FireProvider, useFlag } from '@fire-signal/react-sdk';

function CheckoutEntry() {
  const { enabled, loading } = useFlag('checkout.new-flow');
  if (loading) return null;
  return enabled ? <div>New checkout enabled</div> : <div>Classic checkout</div>;
}

export default function App() {
  return (
    <FireProvider
      publishableKey="fp_pub_xxx"
      user={{ id: 'user_123' }}
      company={{ id: 'acme_inc' }}
      traits={{ plan: 'PLUS', locale: 'pt-BR' }}
    >
      <CheckoutEntry />
    </FireProvider>
  );
}
```

Notes:

- In the common cloud setup, you only need `publishableKey`.
- `host` is optional and only needed when using a custom/self-hosted API host.

---

## Complete Applied Example (Next.js style)

### 1) Provider wrapper

```tsx
// app/providers.tsx
'use client';

import { FireProvider } from '@fire-signal/react-sdk';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FireProvider
      publishableKey={process.env.NEXT_PUBLIC_FIRE_PUBLISHABLE_KEY!}
      user={{ id: 'user_123' }}
      company={{ id: 'acme_inc' }}
      traits={{ plan: 'PLUS', country: 'BR' }}
    >
      {children}
    </FireProvider>
  );
}
```

### 2) Feature flag with business value

```tsx
// app/checkout/page.tsx
'use client';

import { useFlag, useVariantValue } from '@fire-signal/react-sdk';

export default function CheckoutPage() {
  const newFlow = useFlag('checkout.new-flow');
  const promo = useVariantValue<string>('checkout.promocode', {}, null);

  if (newFlow.loading) return null;

  return (
    <main>
      {promo.enabled && promo.value ? <p>Coupon: {promo.value}</p> : null}
      {newFlow.enabled ? <button>Continue (new)</button> : <button>Continue</button>}
    </main>
  );
}
```

### 3) Declarative flag rendering

```tsx
import { FireFlag } from '@fire-signal/react-sdk';

function PromoBanner() {
  return (
    <FireFlag<string>
      flag="checkout.promocode"
      fallback={<span>No promo available</span>}
    >
      {(decision) => <span>Promo: {decision.value}</span>}
    </FireFlag>
  );
}
```

### 4) Track and identify in UI flows

```tsx
import { useIdentify, useTrack } from '@fire-signal/react-sdk';

function LoginSuccessButton() {
  const identify = useIdentify();
  const track = useTrack();

  const onLoginSuccess = async () => {
    await identify('user_123', {
      email: 'ana@acme.com',
      plan: 'PLUS',
      locale: 'pt-BR',
    });

    await track('user.login_succeeded', {
      user: { id: 'user_123' },
      properties: { method: 'password' },
    });
  };

  return <button onClick={onLoginSuccess}>Simulate login success</button>;
}
```

---

## API Reference

## `FireProvider`

```tsx
<FireProvider
  publishableKey="fp_pub_xxx"
  host="api.fire-signal.com"
  strictPlatformProvider={false}
  user={{ id: 'user_123' }}
  company={{ id: 'acme_inc' }}
  traits={{ plan: 'PLUS' }}
>
  {children}
</FireProvider>
```

Props:

- `publishableKey` (required)
- `host` (optional)
- `strictPlatformProvider` (optional)
- `user`, `company`, `traits` (optional base context)

## `useFlag(flag, context?, options?)`

Returns:

- `enabled: boolean`
- `loading: boolean`
- `error?: Error`
- `decision?`
- `refetch()`

## `useVariantValue<T>(flag, context?, fallback?, options?)`

Returns:

- `value: T | undefined`
- `enabled: boolean`
- `loading: boolean`
- `error?: Error`
- `decision?`
- `refetch()`

## `useFlagDecision<T>(flag, context?, options?)`

Returns full decision payload with rule outcome and value.

## `FireFlag`

Declarative render component with `fallback` and decision render function.

## `useTrack()`

Returns a function `(eventName, payload?) => Promise<boolean>`.

## `useIdentify()`

Returns a function `(externalId, traits?) => Promise<boolean>`.

---

## Error Behavior

Platform APIs require a Fire Platform target configured by provider.

- default: warn and no-op
- strict mode: throw (set `strictPlatformProvider`)

---

## Backend and Core SDK

For backend usage (`track`, `identify`, `incident.report`, `flags.*`) and full core SDK docs, see:

- root package docs: `../../README.md`
- complete guide: `../../docs/SDK_COMPLETE_GUIDE.md`
