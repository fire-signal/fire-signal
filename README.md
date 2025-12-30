<p align="center">
  <img src="./assets/logo.png" alt="Fire-Signal" width="450" />
</p>
<p align="center">
  <strong>One call. Every channel. Zero hassle.</strong>
</p>

<p align="center">
  Stop juggling SDKs. Fire-Signal broadcasts your notifications to Discord, Rocket.Chat, Slack, Telegram, Email, and more — simultaneously.
</p>

<p align="center">
  <a href="https://github.com/fire-signal/fire-signal/actions"><img src="https://img.shields.io/github/actions/workflow/status/fire-signal/fire-signal/ci.yml?style=for-the-badge&label=CI" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/fire-signal"><img src="https://img.shields.io/npm/v/fire-signal?style=for-the-badge&color=ff6b35&label=npm" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/fire-signal"><img src="https://img.shields.io/npm/dm/fire-signal?style=for-the-badge&color=0d96f2&label=downloads" alt="downloads" /></a>
  <img src="https://img.shields.io/badge/Node-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="node" />
  <img src="https://img.shields.io/badge/TypeScript-Ready-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript" />
  <a href="https://github.com/fire-signal/fire-signal/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge" alt="license" /></a>
</p>

<br />

---

## 💡 The Problem

You're building an app and need to notify your team when:

- A deploy completes
- A payment fails
- A user signs up
- An error occurs in production

Some team members prefer **Discord**. Others use **Rocket.Chat**. Some like
**Slack**. Your ops team needs **email**. And you want real-time alerts on
**Telegram**.

**Without Fire-Signal:** You maintain 4+ different integrations, each with their
own API, error handling, and configuration.

**With Fire-Signal:** One line of code. All channels. Done.

---

## ⚡ Quick Example

```typescript
import { FireSignal } from 'fire-signal';

const fire = new FireSignal({
  urls: [
    'discord://webhookId/webhookToken',
    'tgram://botToken/chatId',
    'rocketchat://chat.company.com/webhookToken',
    'slack://T00000/B00000/XXXXXX',
    'mailto://user:pass@smtp.gmail.com?to=team@company.com',
  ],
});

// One call. Every channel.
await fire.send({
  title: '🚀 Deploy Successful',
  body: 'Production updated to v2.1.0',
});
```

---

## 📦 Installation

```bash
npm install fire-signal
```

<details>
<summary>Other package managers</summary>

```bash
pnpm add fire-signal
yarn add fire-signal
```

</details>

---

## ✨ Features

| Feature                        | Description                                                |
| ------------------------------ | ---------------------------------------------------------- |
| 📡 **Multi-channel broadcast** | Discord, Slack, Telegram, Email, Rocket.Chat, and webhooks |
| 🔗 **URL-based config**        | No complex setup — just `discord://webhook/token`          |
| 🏷️ **Tag-based routing**       | Send to specific audiences with tags                       |
| 📎 **Attachments**             | Send files via Email, Discord, and Telegram                |
| 💻 **CLI included**            | Integrate into shell scripts and CI/CD                     |
| 📁 **Config file support**     | Centralize channels in `~/.fire-signal.yml`                |
| ⚡ **TypeScript native**       | Full type safety and autocomplete                          |
| 🔧 **Extensible**              | Create custom providers in minutes                         |
| 🪶 **Lightweight**             | Minimal dependencies                                       |

---

## 🎯 Use Cases

### Welcome Email for New Users

```typescript
import { FireSignal } from 'fire-signal';

// Configure once with placeholder
const fire = new FireSignal();
fire.add('mailto://noreply%40myapp.com:password@smtp.myapp.com?to={email}', [
  'user',
]);

async function onUserSignup(user: User) {
  await fire.send(
    {
      title: 'Welcome to MyApp!',
      body: `Hi ${user.name}, thanks for signing up.`,
    },
    { tags: ['user'], params: { email: user.email } }
  );
}
```

### Multi-Team Notification System

Configure different channels for different teams using **tags** and
**placeholders**:

```typescript
import { FireSignal } from 'fire-signal';

// Single instance, multiple audiences
const fire = new FireSignal();

// Fixed channels (no placeholders)
fire.add('discord://sales-webhook/token', ['sales']);
fire.add('slack://T.../B.../XXX', ['sales', 'management']);
fire.add('tgram://bot/dev-chat', ['dev']);
fire.add('rocketchat://chat.company.com/webhook', ['dev', 'ops']);

// Dynamic channel (with placeholder)
fire.add('mailto://alerts%40company.com:pass@smtp.company.com?to={email}', [
  'email',
]);

// New sale? Notify sales team (fixed)
await fire.send(
  { title: '💰 New Sale', body: 'Order #1234 - $599.00' },
  { tags: ['sales'] }
);

// Deploy complete? Notify dev team (fixed)
await fire.send(
  { title: '🚀 Deployed', body: 'v2.1.0 is live on production' },
  { tags: ['dev'] }
);

// Email specific user (dynamic)
await fire.send(
  { title: '🎫 Ticket Update', body: 'Your ticket has been resolved.' },
  { tags: ['email'], params: { email: 'customer@example.com' } }
);
```

### E-commerce Order Flow

```typescript
import { FireSignal } from 'fire-signal';

const fire = new FireSignal();

// Internal channels (fixed)
fire.add('rocketchat://chat.company.com/webhookToken', ['warehouse']);
fire.add('discord://finance-webhook/token', ['finance']);
fire.add('tgram://bot/support-chat', ['support']);

// Customer emails (dynamic placeholder)
fire.add(
  'mailto://orders%40store.com:pass@smtp.store.com?to={customer_email}',
  ['customer']
);

// Order placed
async function onOrderCreated(order: Order, customer: Customer) {
  // Email customer (uses placeholder)
  await fire.send(
    {
      title: 'Order Confirmed',
      body: `Order #${order.id} - Total: $${order.total}`,
    },
    { tags: ['customer'], params: { customer_email: customer.email } }
  );

  // Notify warehouse (fixed channel)
  await fire.send(
    {
      title: '📦 New Order',
      body: `#${order.id} - ${order.items.length} items`,
    },
    { tags: ['warehouse'] }
  );
}

// Payment received
async function onPaymentReceived(payment: Payment) {
  await fire.send(
    {
      title: '💳 Payment',
      body: `$${payment.amount} for order #${payment.orderId}`,
    },
    { tags: ['finance'] }
  );
}
```

### CI/CD Pipeline Notifications

Use the CLI directly in your pipelines:

**GitHub Actions:**

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh

      - name: Notify Success
        if: success()
        run: |
          npx fire-signal \
            -t "✅ Deploy Successful" \
            -b "Commit: ${{ github.sha }}" \
            "${{ secrets.DISCORD_WEBHOOK }}"

      - name: Notify Failure
        if: failure()
        run: |
          npx fire-signal \
            -t "❌ Deploy Failed" \
            -b "Check: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}" \
            "${{ secrets.DISCORD_WEBHOOK }}"
```

**GitLab CI:**

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  script:
    - ./deploy.sh
  after_script:
    - |
      if [ "$CI_JOB_STATUS" = "success" ]; then
        npx fire-signal -t "✅ Deploy OK" -b "Pipeline #$CI_PIPELINE_ID" "$DISCORD_WEBHOOK"
      else
        npx fire-signal -t "❌ Deploy Failed" -b "Check $CI_PIPELINE_URL" "$DISCORD_WEBHOOK"
      fi
```

**Shell/Cron:**

```bash
npx fire-signal -t "🔄 Backup" -b "$(date)" "$NTFY_URL"
```

<details>
<summary><strong>Advanced: Programmatic notifications in build scripts</strong></summary>

```typescript
import { FireSignal } from 'fire-signal';

const fire = new FireSignal();
fire.add('discord://devops-webhook/token', ['build']);
fire.add('tgram://bot/releases-channel', ['release']);

await fire.send(
  { title: 'Build Started', body: `Branch: ${branch}` },
  { tags: ['build'] }
);
await fire.send(
  { title: '🚀 Released', body: `v${version} deployed` },
  { tags: ['release'] }
);
```

</details>

<details>
<summary><strong>SaaS Application Events</strong></summary>

```typescript
import { FireSignal } from 'fire-signal';

// Configure once at app startup
const fire = new FireSignal();

// User notifications (transactional emails)
fire.add('mailto://noreply%40saas.com:pass@smtp.saas.com?to={user_email}', [
  'user',
]);

// Internal team notifications
fire.add('rocketchat://chat.internal.com/webhook', ['engineering']);
fire.add('discord://sales-webhook/token', ['sales']);
fire.add('slack://T.../B.../support', ['support']);

// Usage throughout the app:

// User signed up
await fire.send(
  { title: 'Welcome!', body: 'Your 14-day trial has started.' },
  { tags: ['user'] }
);
await fire.send(
  { title: '👤 New Signup', body: `${user.email} from ${user.company}` },
  { tags: ['sales'] }
);

// User upgraded to paid
await fire.send(
  { title: 'Thank you!', body: 'Your subscription is now active.' },
  { tags: ['user'] }
);
await fire.send(
  { title: '🎉 New Customer', body: `${user.company} - $${plan.price}/mo` },
  { tags: ['sales'] }
);

// User requested support
await fire.send(
  { title: '🎫 Support Ticket', body: `${ticket.subject} from ${user.email}` },
  { tags: ['support'] }
);

// Error in production
await fire.send(
  { title: '🐛 Error', body: `${error.message}\n${error.stack}` },
  { tags: ['engineering'] }
);
```

</details>

<details>
<summary><strong>Rich HTML Emails with Templates</strong></summary>

For professional emails with images and styling, use template engines like
**Handlebars** or **MJML**:

```typescript
// templates/order-confirmation.ts
export const orderTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    .container { max-width: 600px; margin: 0 auto; font-family: Arial; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
    .button { background: #4F46E5; color: white; padding: 12px 24px; 
              text-decoration: none; border-radius: 4px; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://mycompany.com/logo.png" alt="Logo" width="150" />
    </div>
    <div style="padding: 20px;">
      <h1>Olá {{name}}!</h1>
      <p>Seu pedido <strong>#{{orderId}}</strong> foi confirmado.</p>
      <p>Total: <strong>R$ {{total}}</strong></p>
      <p style="text-align: center; margin-top: 20px;">
        <a class="button" href="https://mycompany.com/pedido/{{orderId}}">Ver Pedido</a>
      </p>
    </div>
  </div>
</body>
</html>
`;
```

```typescript
import Handlebars from 'handlebars';
import { orderTemplate } from './templates/order-confirmation';
import { FireSignal } from 'fire-signal';

const fire = new FireSignal();
fire.add('mailto://orders%40company.com:pass@smtp.gmail.com?to={email}', [
  'customer',
]);

// Compile template with data
const html = Handlebars.compile(orderTemplate)({
  name: 'João Silva',
  orderId: '12345',
  total: '299,90',
});

// Send rich HTML email
await fire.send(
  { title: 'Pedido Confirmado', body: html },
  { tags: ['customer'], params: { email: customer.email } }
);
```

> **💡 Tip:** Images must use public URLs (`https://...`) or base64 data URLs.
> Local file paths don't work in emails.

> **💡 Tip:** For responsive emails, consider using [MJML](https://mjml.io/)
> which compiles to email-safe HTML.

</details>

---

## 🏗️ Framework Integration

### NestJS

```typescript
// fire.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { FireSignal } from 'fire-signal';

@Injectable()
export class FireService implements OnModuleInit {
  private fire: FireSignal;

  onModuleInit() {
    this.fire = new FireSignal();

    // User notifications
    this.fire.add(process.env.SMTP_URL, ['user']);

    // Team notifications
    this.fire.add(process.env.DISCORD_WEBHOOK, ['team']);
    this.fire.add(process.env.SLACK_WEBHOOK, ['team', 'sales']);
    this.fire.add(process.env.TELEGRAM_BOT_URL, ['critical']);
  }

  async notifyUser(email: string, title: string, body: string) {
    await this.fire.send({ title, body }, { tags: ['user'] });
  }

  async notifyTeam(title: string, body: string) {
    await this.fire.send({ title, body }, { tags: ['team'] });
  }

  async alertCritical(message: string) {
    await this.fire.send(
      { title: '🚨 CRITICAL', body: message },
      { tags: ['critical'] }
    );
  }
}
```

### Next.js (App Router)

```typescript
// lib/fire.ts
import { FireSignal } from 'fire-signal';

export const fire = new FireSignal();

// Configure channels
fire.add(process.env.DISCORD_WEBHOOK!, ['internal']);
fire.add(process.env.ROCKET_CHAT_WEBHOOK!, ['internal', 'sales']);
fire.add(process.env.SMTP_URL!, ['user']);
```

```typescript
// app/api/webhooks/stripe/route.ts
import { fire } from '@/lib/fire';

export async function POST(req: Request) {
  const event = await req.json();

  if (event.type === 'payment_intent.succeeded') {
    // Notify sales team
    await fire.send(
      {
        title: '💰 Payment Received',
        body: `$${event.data.object.amount / 100} from ${event.data.object.customer}`,
      },
      { tags: ['sales'] }
    );
  }

  if (event.type === 'payment_intent.failed') {
    // Alert on all internal channels
    await fire.send(
      {
        title: '❌ Payment Failed',
        body: `Customer: ${event.data.object.customer}`,
      },
      { tags: ['internal'] }
    );
  }

  return Response.json({ received: true });
}
```

### Express

```typescript
// lib/fire.ts
import { FireSignal } from 'fire-signal';

export const fire = new FireSignal();

fire.add(process.env.DISCORD_WEBHOOK, ['dev']);
fire.add(process.env.SLACK_WEBHOOK, ['business']);
fire.add(process.env.SMTP_URL, ['user']);
```

```typescript
// routes/users.ts
import { fire } from '../lib/fire';

router.post('/signup', async (req, res) => {
  const user = await createUser(req.body);

  // Welcome email to user
  await fire.send(
    { title: 'Welcome!', body: `Hi ${user.name}, your account is ready.` },
    { tags: ['user'] }
  );

  // Notify business team
  await fire.send(
    { title: '👤 New User', body: `${user.name} (${user.email})` },
    { tags: ['business'] }
  );

  res.json(user);
});
```

### Node.js Scripts / CI/CD

```bash
# After deploy
fire-signal -t "✅ Deploy Complete" -b "v2.0.0 deployed" discord://webhook/token

# Filter by tags from config
fire-signal -t "🚨 Alert" -b "Check logs" -g critical
```

---

## 📎 Attachments

Send files with your notifications (supported by Email, Discord, and Telegram):

```typescript
import { readFileSync } from 'fs';
import { FireSignal } from 'fire-signal';

const fire = new FireSignal({
  urls: [
    'mailto://user:pass@smtp.gmail.com?to=team@company.com',
    'discord://webhookId/webhookToken',
    'tgram://botToken/chatId',
  ],
});

// Attach a file from URL
await fire.send({
  title: 'Monthly Report',
  body: 'Please find the attached report.',
  attachments: [{ url: 'https://example.com/report.pdf', name: 'report.pdf' }],
});

// Attach a local file (Buffer)
await fire.send({
  title: 'Invoice',
  body: 'Your invoice is attached.',
  attachments: [
    {
      content: readFileSync('./invoice.pdf'),
      name: 'invoice.pdf',
      contentType: 'application/pdf',
    },
  ],
});

// Multiple attachments
await fire.send({
  title: 'Project Files',
  body: 'Here are the files.',
  attachments: [
    { content: readFileSync('./doc.pdf'), name: 'doc.pdf' },
    { url: 'https://example.com/image.png', name: 'image.png' },
  ],
});
```

> **Note:** Attachments are supported by Email, Discord, and Telegram. Other
> providers may support URL references only.

---

## 📡 Supported Providers

| Provider        | Scheme                      | Auth         | Attachments | Formatting     | Limitations     | Example                          |
| --------------- | --------------------------- | ------------ | ----------- | -------------- | --------------- | -------------------------------- |
| **Discord**     | `discord://`                | Webhook URL  | ✅ Full     | Markdown       | 2000 char limit | `discord://webhookId/token`      |
| **Telegram**    | `tgram://` `telegram://`    | Bot Token    | ✅ Full     | Markdown/HTML  | 4096 char limit | `tgram://botToken/chatId`        |
| **Rocket.Chat** | `rocketchat://` `rocket://` | Webhook      | ❌          | Markdown       | -               | `rocketchat://host/token`        |
| **Slack**       | `slack://`                  | Webhook      | ❌          | Markdown       | -               | `slack://T.../B.../XXX`          |
| **Email**       | `mailto://` `mailtos://`    | SMTP         | ✅ Full     | HTML           | Encode @ as %40 | `mailto://user:pass@smtp...`     |
| **Webhook**     | `json://` `jsons://`        | Optional     | ❌          | JSON           | -               | `json://api.example.com/hook`    |
| **ntfy**        | `ntfy://` `ntfys://`        | Optional     | URL only    | Plain          | -               | `ntfy://ntfy.sh/topic`           |
| **Gotify**      | `gotify://` `gotifys://`    | App Token    | ❌          | Markdown       | -               | `gotify://host/token`            |
| **Google Chat** | `gchat://` `googlechat://`  | Webhook      | ❌          | Simple HTML    | -               | `gchat://SPACE/KEY/TOKEN`        |
| **Mattermost**  | `mmost://` `mmosts://`      | Webhook      | ❌          | Markdown       | -               | `mmost://host/HOOK_ID`           |
| **MS Teams**    | `msteams://`                | Webhook      | ❌          | Adaptive Cards | -               | `msteams://tenant.webhook...`    |
| **OneSignal**   | `onesignal://`              | API Key      | ❌          | Plain          | -               | `onesignal://APP@KEY/`           |
| **Pushover**    | `pover://` `pushover://`    | User+API Key | ❌          | HTML optional  | -               | `pover://USER@TOKEN/`            |
| **Twilio**      | `twilio://`                 | Account SID  | ❌          | Plain (SMS)    | -               | `twilio://SID:Token@+1.../+1...` |

**Legend:**

- ✅ Full = Supports file attachments (Buffer or URL)
- ❌ = No attachment support via webhook
- URL only = Attachments via URL reference only

---

## 🔧 Query Parameters

Query parameters allow you to customize notification behavior per-provider. They
can be used in two ways:

### Static Values

```typescript
// Pushover with high priority and custom sound
fire.add('pover://user@token/?priority=1&sound=cosmic');

// ntfy with priority and tags
fire.add('ntfy://ntfy.sh/alerts?priority=high&tags=warning,server');

// Gotify with priority level
fire.add('gotifys://gotify.example.com/token?priority=8');
```

### Dynamic Placeholders

Use `{key}` placeholders that get replaced by values from `data`:

```typescript
fire.add('ntfy://ntfy.sh/alerts?tags={severity}');
fire.add('pover://user@token/?sound={alert_sound}');

fire.send({
  title: 'Server Alert',
  body: 'CPU usage exceeded 90%',
  data: {
    severity: 'urgent,server',
    alert_sound: 'siren',
  },
});
```

Placeholders work in any part of the URL: path segments, query param values,
etc.

---

## 📋 Logging & Error Handling

### Log Levels

```typescript
const fire = new FireSignal({
  logLevel: 'info', // 'silent' | 'error' | 'warn' | 'info' | 'debug'
});
```

**CLI:**

```bash
fire-signal --log-level debug -t "Test" -b "With debug output" "ntfy://..."
fire-signal -v ...  # Same as --log-level debug
fire-signal -q ...  # Same as --log-level silent
```

### Error Fallback (onError)

Automatically notify a fallback channel when a provider fails:

```typescript
const fire = new FireSignal({
  onError: {
    fallbackTags: ['monitoring'], // Required: tags to send error to
    // Optional: custom message format
    // message: (error, ctx) => `Custom: ${error.message}`,
    // Optional: external callback (e.g., Sentry)
    // callback: async (error, ctx) => await sentry.captureException(error),
  },
});

fire.add('rocketchat://main-server/webhook', ['main']);
fire.add('tgram://bot/monitoring-chat', ['monitoring']);

// If RocketChat fails, Telegram receives the error notification
await fire.send({ title: 'Alert', body: 'Message' }, { tags: ['main'] });
```

**Error Messages:** Fire-Signal provides human-readable HTTP error messages:

```
[404] Not Found - Webhook URL is invalid or deleted
[401] Unauthorized - Token expired or invalid credentials
[504] Gateway Timeout - Server did not respond in time
```

---

## ⏱️ Timeouts & Retries

<details>
<summary><strong>CLI Options</strong></summary>

```bash
# Custom timeout (10 seconds instead of default 30s)
fire-signal --timeout 10000 -t "Quick" -b "Message" ntfy://...

# Retry on failures (3 retries with exponential backoff)
fire-signal --retries 3 -t "Important" -b "Message" discord://...
```

</details>

<details>
<summary><strong>Understanding Exponential Backoff</strong></summary>

With `--retries 3` and default settings:

- 1st retry: waits 1 second
- 2nd retry: waits 2 seconds
- 3rd retry: waits 4 seconds

Defaults: `timeout: 30s`, `retryDelay: 1s`, `backoffMultiplier: 2`,
`maxDelay: 30s`

Retryable HTTP codes: `429`, `500`, `502`, `503`, `504`

</details>

---

## 📦 Providers

<details>
<summary><strong>Discord</strong></summary>

**URL Format:**

```
discord://webhookId/webhookToken
```

**Query Parameters:**

| Parameter    | Description                       |
| ------------ | --------------------------------- |
| `username`   | Override webhook username         |
| `avatar_url` | Override webhook avatar           |
| `tts`        | Text-to-speech (`true` / `false`) |

**Features:**

| Feature     | Supported | Notes                                   |
| ----------- | :-------: | --------------------------------------- |
| Title       |    ✅     | Displayed as bold text                  |
| Attachments |    ✅     | Files upload via multipart              |
| Actions     |    ✅     | Rendered as clickable links in an Embed |

**Example:**

```typescript
fire.add('discord://123456789/AbCdEfGhI?username=Deploy%20Bot');

await fire.send({
  title: 'Deployment Complete',
  body: 'Version 2.0.1 deployed to production.',
  actions: [
    { label: 'View Logs', url: 'https://logs.example.com' },
    {
      label: 'Rollback',
      url: 'https://deploy.example.com/rollback',
      style: 'danger',
    },
  ],
});
```

**Setup:**

1. Go to Discord → Server Settings → Integrations → Webhooks
2. Create a webhook and copy the URL
3. Extract `webhookId` and `webhookToken` from:
   `https://discord.com/api/webhooks/{webhookId}/{webhookToken}`

</details>

<details>
<summary><strong>Telegram</strong></summary>

**URL Format:**

```
tgram://botToken/chatId
telegram://botToken/chatId
```

**Query Parameters:**

| Parameter                  | Description                              |
| -------------------------- | ---------------------------------------- |
| `parse_mode`               | `HTML`, `Markdown`, or `MarkdownV2`      |
| `disable_web_page_preview` | Disable link previews (`true` / `false`) |
| `disable_notification`     | Send silently (`true` / `false`)         |

**Features:**

| Feature     | Supported | Notes                               |
| ----------- | :-------: | ----------------------------------- |
| Title       |    ✅     | Displayed as bold text (Markdown)   |
| Attachments |    ✅     | Sent via `sendDocument` API         |
| Actions     |    ✅     | Rendered as Inline Keyboard buttons |

**Example:**

```typescript
fire.add('tgram://123456:ABC-DEF/987654321?parse_mode=Markdown');

await fire.send({
  title: 'Order Shipped',
  body: 'Your order #12345 has been shipped!',
  actions: [{ label: 'Track Order', url: 'https://track.example.com/12345' }],
});
```

**Setup:**

1. Create a bot with [@BotFather](https://t.me/BotFather), get the token
2. Get your chat ID from [@userinfobot](https://t.me/userinfobot)
3. For groups, use the negative chat ID (e.g., `-1001234567890`)

</details>

<details>
<summary><strong>Rocket.Chat</strong></summary>

**URL Format:**

```
rocketchat://host/webhookToken
rocketchats://host/webhookToken   # HTTPS
```

**Query Parameters:**

| Parameter  | Description                   |
| ---------- | ----------------------------- |
| `channel`  | Override channel (`#general`) |
| `username` | Override bot username         |
| `avatar`   | Override bot avatar URL       |

**Features:**

| Feature     | Supported | Notes                      |
| ----------- | :-------: | -------------------------- |
| Title       |    ✅     | Displayed as bold text     |
| Attachments |    ❌     | Not supported via webhooks |
| Actions     |    ❌     | Not supported via webhooks |

**Example:**

```typescript
fire.add('rocketchats://chat.company.com/abc123?channel=%23devops');

await fire.send({
  title: 'Build Complete',
  body: 'Frontend build succeeded.',
});
```

**Setup:**

1. Go to Rocket.Chat → Administration → Integrations → Incoming Webhooks
2. Create a webhook and copy the token
3. Use: `rocketchat://host/token`

</details>

<details>
<summary><strong>Slack</strong></summary>

**URL Format:**

```
slack://T00000000/B00000000/XXXXXXXXXXXXXXXX
```

**Query Parameters:**

| Parameter    | Description                   |
| ------------ | ----------------------------- |
| `channel`    | Override channel (`#general`) |
| `username`   | Override bot username         |
| `icon_emoji` | Emoji icon (e.g., `:robot:`)  |
| `icon_url`   | URL to icon image             |

**Features:**

| Feature     | Supported | Notes                               |
| ----------- | :-------: | ----------------------------------- |
| Title       |    ✅     | Displayed as bold text              |
| Attachments |    ❌     | Not supported via Incoming Webhooks |
| Actions     |    ✅     | Rendered as Block Kit buttons       |

**Example:**

```typescript
fire.add('slack://T12345678/B87654321/xyzABC123?channel=%23alerts');

await fire.send({
  title: 'New Support Ticket',
  body: 'Ticket #5678 requires attention.',
  actions: [
    {
      label: 'View Ticket',
      url: 'https://support.example.com/5678',
      style: 'primary',
    },
    {
      label: 'Ignore',
      url: 'https://support.example.com/5678/close',
      style: 'danger',
    },
  ],
});
```

**Setup:**

1. Go to Slack → Apps → Incoming Webhooks
2. Create a webhook for your workspace
3. Extract `T.../B.../XXX` from the webhook URL

</details>

<details>
<summary><strong>Email (SMTP)</strong></summary>

**URL Format:**

```
mailto://user:pass@smtp.host.com?to=recipient@example.com
mailtos://user:pass@smtp.host.com:465?to=recipient@example.com   # TLS
```

**Query Parameters:**

| Parameter | Description                         |
| --------- | ----------------------------------- |
| `to`      | Recipient email(s), comma-separated |
| `cc`      | CC recipient(s)                     |
| `bcc`     | BCC recipient(s)                    |
| `from`    | Override sender name                |
| `name`    | Display name for sender             |

**Features:**

| Feature     | Supported | Notes                     |
| ----------- | :-------: | ------------------------- |
| Title       |    ✅     | Used as email subject     |
| Attachments |    ✅     | Sent as email attachments |
| Actions     |    ❌     | Not supported             |

**Example:**

```typescript
fire.add(
  'mailtos://alerts%40company.com:password@smtp.gmail.com:465?to=team@company.com'
);

await fire.send({
  title: 'Weekly Report',
  body: '<h1>Sales Report</h1><p>Revenue increased by 15%.</p>',
  attachments: [
    { name: 'report.pdf', url: 'https://reports.example.com/weekly.pdf' },
  ],
});
```

**Setup:**

1. Encode `@` in username as `%40`
2. Use `mailtos://` for TLS (port 465 or 587)
3. For Gmail, enable "Less secure apps" or use App Passwords

</details>

<details>
<summary><strong>Generic Webhook (JSON)</strong></summary>

**URL Format:**

```
json://api.example.com/webhook
jsons://api.example.com/webhook   # HTTPS
```

**Features:**

| Feature     | Supported | Notes                    |
| ----------- | :-------: | ------------------------ |
| Title       |    ✅     | Included in JSON payload |
| Attachments |    ❌     | Not supported            |
| Actions     |    ❌     | Not supported            |

**Payload Structure:**

The webhook receives a JSON payload with the following structure:

```json
{
  "title": "Message Title",
  "body": "Message body",
  "tags": ["tag1", "tag2"],
  "metadata": { "key": "value" }
}
```

> **Note:** `tags` comes from `SendOptions.tags`, not from the message itself.

**Example:**

```typescript
fire.add('jsons://api.example.com/notifications/webhook', ['alerts']);

await fire.send(
  {
    title: 'Custom Event',
    body: 'Something happened!',
    metadata: { eventId: 123, severity: 'high' },
  },
  { tags: ['alerts'] }
);
// Payload sent: { title: "Custom Event", body: "...", tags: ["alerts"], metadata: {...} }
```

</details>

<details>
<summary><strong>ntfy</strong></summary>

**URL Format:**

```
ntfy://ntfy.sh/my-topic
ntfys://ntfy.sh/my-topic          # HTTPS
ntfy://user:pass@server.com/topic # With auth
```

**Query Parameters:**

| Parameter  | Description                                       |
| ---------- | ------------------------------------------------- |
| `priority` | `min`, `low`, `default`, `high`, `urgent`         |
| `tags`     | Comma-separated emoji tags (e.g., `warning,fire`) |
| `click`    | URL to open when notification is clicked          |
| `attach`   | URL to attachment                                 |
| `icon`     | Notification icon URL                             |
| `email`    | Email address for email notifications             |
| `delay`    | Delay before sending (e.g., `30min`, `2h`)        |

**Features:**

| Feature     | Supported | Notes                               |
| ----------- | :-------: | ----------------------------------- |
| Title       |    ✅     | Sent as notification title          |
| Attachments |    ✅     | Via `attach` query param or content |
| Actions     |    ❌     | Not supported via fire-signal       |

**Example:**

```typescript
fire.add('ntfys://ntfy.sh/my-alerts?priority=high&tags=warning');

await fire.send({
  title: 'Server Alert',
  body: 'CPU usage exceeded 90%.',
});
```

**Setup:**

1. Use `ntfy.sh` or self-host your own server
2. Subscribe to the topic using the ntfy app
3. Use the topic name in the URL

</details>

<details>
<summary><strong>Gotify</strong></summary>

**URL Format:**

```
gotify://my-server.com/appToken
gotifys://my-server.com/appToken   # HTTPS
```

**Query Parameters:**

| Parameter  | Description                |
| ---------- | -------------------------- |
| `priority` | 1-10, higher = more urgent |

**Features:**

| Feature     | Supported | Notes                      |
| ----------- | :-------: | -------------------------- |
| Title       |    ✅     | Sent as notification title |
| Attachments |    ❌     | Not supported              |
| Actions     |    ❌     | Not supported              |

**Example:**

```typescript
fire.add('gotifys://push.example.com/AbCdEfGh?priority=8');

await fire.send({
  title: 'Security Alert',
  body: 'Suspicious login detected.',
});
```

**Setup:**

1. Self-host Gotify or use a hosted instance
2. Create an Application in Settings → Applications
3. Copy the app token

</details>

<details>
<summary><strong>Google Chat</strong></summary>

**URL Format:**

```
gchat://SPACE_ID/KEY/TOKEN
```

**Features:**

| Feature     | Supported | Notes                         |
| ----------- | :-------: | ----------------------------- |
| Title       |    ✅     | Displayed as bold text        |
| Attachments |    ❌     | Not supported via webhooks    |
| Actions     |    ❌     | Not supported via fire-signal |

**Example:**

```typescript
fire.add('gchat://spaces%2FAAAA/keys%2Fbbbb/tokens%2Fcccc');

await fire.send({
  title: 'Calendar Reminder',
  body: 'Team standup in 15 minutes.',
});
```

**Setup:**

1. Open a Google Chat space → Settings → Apps & Integrations → Webhooks
2. Create a webhook and copy the URL:
   `https://chat.googleapis.com/v1/spaces/SPACE/messages?key=KEY&token=TOKEN`
3. Convert to: `gchat://SPACE/KEY/TOKEN` (URL-encode slashes as `%2F`)

</details>

<details>
<summary><strong>Mattermost</strong></summary>

**URL Format:**

```
mmost://host/HOOK_ID
mmosts://host/HOOK_ID    # HTTPS
```

**Query Parameters:**

| Parameter  | Description                            |
| ---------- | -------------------------------------- |
| `channel`  | Override channel (`#general`, `@user`) |
| `username` | Override webhook username              |
| `icon_url` | Override webhook icon                  |

**Features:**

| Feature     | Supported | Notes                         |
| ----------- | :-------: | ----------------------------- |
| Title       |    ✅     | Displayed as bold text        |
| Attachments |    ❌     | Not supported via webhooks    |
| Actions     |    ❌     | Not supported via fire-signal |

**Example:**

```typescript
fire.add('mmosts://chat.company.com/abc123def?channel=%23devops');

await fire.send({
  title: 'Deployment Notice',
  body: 'Backend v3.2.0 deployed to staging.',
});
```

**Setup:**

1. Go to Mattermost → Integrations → Incoming Webhooks
2. Create a webhook and copy the hook ID
3. Use: `mmost://host/HOOK_ID`

</details>

<details>
<summary><strong>MS Teams</strong></summary>

**URL Format:**

```
msteams://tenant.webhook.office.com/webhookb2/GUID@GUID/IncomingWebhook/GUID/GUID
```

**Query Parameters:**

| Parameter     | Description                        |
| ------------- | ---------------------------------- |
| `theme_color` | Hex color for card accent (no `#`) |

**Features:**

| Feature     | Supported | Notes                               |
| ----------- | :-------: | ----------------------------------- |
| Title       |    ✅     | Displayed as card title             |
| Attachments |    ❌     | Not supported via Incoming Webhooks |
| Actions     |    ✅     | Rendered as OpenUri buttons         |

**Example:**

```typescript
fire.add(
  'msteams://tenant.webhook.office.com/webhookb2/abc@def/IncomingWebhook/ghi/jkl?theme_color=FF0000'
);

await fire.send({
  title: 'Incident Alert',
  body: 'Service degradation detected in production.',
  actions: [
    { label: 'View Dashboard', url: 'https://grafana.example.com/d/prod' },
    {
      label: 'Acknowledge',
      url: 'https://incidents.example.com/123/ack',
      style: 'primary',
    },
  ],
});
```

**Setup:**

1. Go to MS Teams → Channel settings → Connectors → Incoming Webhook
2. Create a webhook and copy the URL
3. Replace `https://` with `msteams://`

</details>

<details>
<summary><strong>OneSignal</strong></summary>

**URL Format:**

```
onesignal://APP_ID@REST_API_KEY/
onesignal://APP_ID@REST_API_KEY/{player_id}/
onesignal://APP_ID@REST_API_KEY/#Segment%20Name/
onesignal://APP_ID@REST_API_KEY/@{external_user_id}/
```

**Path Targets:**

| Target        | Description                           |
| ------------- | ------------------------------------- |
| `{player_id}` | Target by OneSignal player ID         |
| `#{segment}`  | Target by segment (URL-encode spaces) |
| `@{user_id}`  | Target by external user ID            |
| `{email}`     | Target by email address               |

**Query Parameters:**

| Parameter  | Description                          |
| ---------- | ------------------------------------ |
| `subtitle` | iOS subtitle                         |
| `language` | 2-char language code (default: `en`) |
| `image`    | `yes`/`no` to include icon           |

**Features:**

| Feature     | Supported | Notes                         |
| ----------- | :-------: | ----------------------------- |
| Title       |    ✅     | Sent as notification title    |
| Attachments |    ❌     | Not supported                 |
| Actions     |    ❌     | Not supported via fire-signal |

**Example:**

```typescript
fire.add('onesignal://abc123@def456/#Active%20Users');

await fire.send({
  title: 'New Feature',
  body: 'Check out our new dashboard!',
});
```

**Setup:**

Get credentials from: OneSignal Dashboard → Settings → Keys & IDs

</details>

<details>
<summary><strong>Pushover</strong></summary>

**URL Format:**

```
pover://USER_KEY@API_TOKEN/
pover://USER_KEY@API_TOKEN/{device}/
```

**Path Targets:**

| Target     | Description               |
| ---------- | ------------------------- |
| `{device}` | Target specific device(s) |

**Query Parameters:**

| Parameter  | Description                    |
| ---------- | ------------------------------ |
| `priority` | -2 (lowest) to 2 (emergency)   |
| `sound`    | Notification sound             |
| `url`      | Supplementary URL              |
| `html`     | `yes`/`no` for HTML formatting |
| `ttl`      | Time to live in seconds        |

**Features:**

| Feature     | Supported | Notes                         |
| ----------- | :-------: | ----------------------------- |
| Title       |    ✅     | Sent as notification title    |
| Attachments |    ✅     | Image attachments supported   |
| Actions     |    ❌     | Not supported via fire-signal |

**Example:**

```typescript
fire.add('pover://userKey123@appToken456?priority=1&sound=cosmic');

await fire.send({
  title: 'Urgent Alert',
  body: 'Server CPU at 100%!',
});
```

**Setup:**

Get credentials from: Pushover Dashboard

</details>

<details>
<summary><strong>Twilio (SMS & WhatsApp)</strong></summary>

**URL Format:**

```
twilio://AccountSID:AuthToken@+1FromPhone/+1ToPhone
twilio://AccountSID:AuthToken@+1FromPhone/+1Phone1/+1Phone2
twilio://AccountSID:AuthToken@+1FromPhone/w:+1ToWhatsApp
```

**Path Targets:**

| Target       | Description                       |
| ------------ | --------------------------------- |
| `/+1Phone`   | SMS recipient (with country code) |
| `/w:+1Phone` | WhatsApp recipient (`w:` prefix)  |

Multiple recipients supported via path segments.

**Features:**

| Feature     | Supported | Notes                               |
| ----------- | :-------: | ----------------------------------- |
| Title       |    ❌     | SMS/WhatsApp doesn't support titles |
| Attachments |    ✅     | MMS/WhatsApp media supported        |
| Actions     |    ❌     | Not supported                       |

**Example:**

```typescript
fire.add('twilio://ACXXXX:authToken@+15551234567/+15559876543');

await fire.send({
  body: 'Your verification code is 123456.',
});
```

**Setup:**

1. Get credentials from: Twilio Console → Account Info
2. Use your Twilio phone number as `@+1FromPhone`
3. Add recipient numbers as path segments

</details>

---

## 📁 Configuration File

Create `~/.fire-signal.yml`:

```yaml
urls:
  # Sales team
  - url: 'discord://sales-webhook/token'
    tags: ['sales']
  - url: 'slack://T.../B.../XXX'
    tags: ['sales', 'management']

  # Dev team
  - url: 'tgram://bot/dev-chat'
    tags: ['dev']
  - url: 'rocketchat://chat.company.com/webhook'
    tags: ['dev', 'ops']

  # Critical alerts (everyone)
  - url: 'mailto://alerts%40company.com:pass@smtp.gmail.com?to=oncall@company.com'
    tags: ['critical']
```

```typescript
const fire = new FireSignal();
await fire.loadConfig();

// Only sales team
await fire.send({ body: 'New lead!' }, { tags: ['sales'] });

// Only dev team
await fire.send({ body: 'Build passed' }, { tags: ['dev'] });

// Critical (email)
await fire.send({ body: 'Server down!' }, { tags: ['critical'] });
```

---

## 🌍 Environment Variables

```bash
# Space or comma separated URLs
FIRE_SIGNAL_URLS="discord://... tgram://... slack://..."

# Additional config file paths
FIRE_SIGNAL_CONFIG_PATH="/etc/fire-signal.yml:~/.fire-signal.yml"
```

---

## 💻 CLI

```bash
fire-signal -t "Title" -b "Body" [urls...]

Options:
  -t, --title <title>      Notification title
  -b, --body <body>        Notification body (or pipe from stdin)
  -g, --tag <tags...>      Filter by tags
  --tags <tags>            Alias for -g/--tag
  -c, --config <paths...>  Additional config paths
  -v, --verbose            Debug output
  -q, --quiet              Errors only
  --dry-run                Show payload without sending
  --json                   Output results as JSON
  --timeout <ms>           Request timeout (default: 30000)
  --retries <n>            Retry attempts (default: 0)
  --validate               Validate URLs without sending
```

Examples:

```bash
# Direct
fire-signal -t "Deploy" -b "Done" discord://id/token

# From env
export FIRE_SIGNAL_URLS="discord://id/token tgram://bot/chat"
fire-signal -t "Alert" -b "Check logs"

# Pipe
echo "Build completed" | fire-signal -t "CI"

# Tags (from config)
fire-signal -t "Critical" -b "Error" -g critical

# Dry run (preview without sending)
fire-signal --dry-run -t "Test" -b "Body" ntfy://ntfy.sh/test

# JSON output (for scripting)
fire-signal --json -t "Deploy" -b "Done" ntfy://ntfy.sh/test | jq .

# Validate URLs
fire-signal --validate 'ntfy://ntfy.sh/test' 'discord://123/abc'
```

---

## 🔧 Custom Providers

```typescript
import { BaseProvider } from 'fire-signal';

class PagerDutyProvider extends BaseProvider {
  readonly id = 'pagerduty';
  readonly schemas = ['pagerduty'];

  parseUrl(raw: string) {
    // Parse pagerduty://routing-key
  }

  async send(message, ctx) {
    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      body: JSON.stringify({
        routing_key: ctx.parsed.hostname,
        event_action: 'trigger',
        payload: { summary: message.body, severity: 'critical' },
      }),
    });
    return this.success();
  }
}

const fire = new FireSignal({
  providers: [new PagerDutyProvider()],
  urls: ['pagerduty://your-routing-key'],
});
```

---

## 📖 API Reference

```typescript
const fire = new FireSignal({
  // Destinations to send to (e.g. ['discord://webhook', 'slack://token'])
  urls?: string[];

  // Custom logic (only if you created a custom provider class)
  // Note: Built-in providers (Discord, Slack, etc.) are loaded automatically.
  providers?: FSProvider[];

  skipDefaultProviders?: boolean;
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
  logger?: (message: string, level: string) => void;
  onError?: {
    fallbackTags?: string[];
    message?: (error: Error, context: FSErrorContext) => string;
    callback?: (error: Error, context: FSErrorContext) => void;
  };
});

fire.add(urls: string | string[], tags?: string[]);
await fire.loadConfig();
await fire.send(message: FSMessage, options?: SendOptions);
```

```typescript
interface FSMessage {
  title?: string;
  body: string;
  attachments?: FSAttachment[];
  actions?: FSAction[];
  metadata?: Record<string, unknown>;
}

interface SendOptions {
  tags?: string[];
  params?: Record<string, string>;
}

interface FSAction {
  label: string;
  url: string;
  style?: 'primary' | 'secondary' | 'danger';
}

interface FSAttachment {
  name: string;
  content?: Buffer;
  url?: string;
  contentType?: string;
}
```

---

## 🤝 Contributing

Contributions welcome! Please open an issue first to discuss what you'd like to
change.

---

## 📄 License

[MIT](LICENSE)

---

<p align="center">
  Made with 🔥 by the Fire-Signal contributors
</p>
