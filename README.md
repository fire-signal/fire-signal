<p align="center">
  <img src="https://em-content.zobj.net/source/apple/391/fire_1f525.png" alt="Fire-Signal" width="80" />
</p>

<h1 align="center">Fire-Signal</h1>

<p align="center">
  <strong>One call. Every channel. Zero hassle.</strong>
</p>

<p align="center">
  Stop juggling SDKs. Fire-Signal broadcasts your notifications to Discord, Rocket.Chat, Slack, Telegram, Email, and more — simultaneously.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/fire-signal"><img src="https://img.shields.io/npm/v/fire-signal?style=for-the-badge&color=ff6b35&label=npm" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/fire-signal"><img src="https://img.shields.io/npm/dm/fire-signal?style=for-the-badge&color=0d96f2&label=downloads" alt="downloads" /></a>
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

```typescript
import { FireSignal } from 'fire-signal';

const fire = new FireSignal();

fire.add('discord://devops-webhook/token', ['build']);
fire.add('tgram://bot/releases-channel', ['release']);
fire.add(
  'mailto://team%40company.com:pass@smtp.gmail.com?to=devs@company.com',
  ['release']
);

// Build stages
await fire.send(
  { title: '🔨 Build Started', body: `Branch: ${branch}` },
  { tags: ['build'] }
);
await fire.send(
  { title: '✅ Tests Passed', body: '47 tests, 0 failures' },
  { tags: ['build'] }
);
await fire.send(
  { title: '🚀 Released', body: `v${version} deployed to production` },
  { tags: ['release'] }
);
```

### SaaS Application Events

```typescript
import { FireSignal } from 'fire-signal';

// Configure once at app startup
const notifications = new FireSignal();

// User notifications (transactional emails)
notifications.add(
  'mailto://noreply%40saas.com:pass@smtp.saas.com?to={{user_email}}',
  ['user']
);

// Internal team notifications
notifications.add('rocketchat://chat.internal.com/webhook', ['engineering']);
notifications.add('discord://sales-webhook/token', ['sales']);
notifications.add('slack://T.../B.../support', ['support']);

// Usage throughout the app:

// User signed up
await notifications.send(
  { title: 'Welcome!', body: 'Your 14-day trial has started.' },
  { tags: ['user'] }
);
await notifications.send(
  { title: '👤 New Signup', body: `${user.email} from ${user.company}` },
  { tags: ['sales'] }
);

// User upgraded to paid
await notifications.send(
  { title: 'Thank you!', body: 'Your subscription is now active.' },
  { tags: ['user'] }
);
await notifications.send(
  { title: '🎉 New Customer', body: `${user.company} - $${plan.price}/mo` },
  { tags: ['sales'] }
);

// User requested support
await notifications.send(
  { title: '🎫 Support Ticket', body: `${ticket.subject} from ${user.email}` },
  { tags: ['support'] }
);

// Error in production
await notifications.send(
  { title: '🐛 Error', body: `${error.message}\n${error.stack}` },
  { tags: ['engineering'] }
);
```

### Rich HTML Emails with Templates

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

---

## 🏗️ Framework Integration

### NestJS

```typescript
// notifications.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { FireSignal } from 'fire-signal';

@Injectable()
export class NotificationsService implements OnModuleInit {
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
// lib/notifications.ts
import { FireSignal } from 'fire-signal';

export const notifications = new FireSignal();

// Configure channels
notifications.add(process.env.DISCORD_WEBHOOK!, ['internal']);
notifications.add(process.env.ROCKET_CHAT_WEBHOOK!, ['internal', 'sales']);
notifications.add(process.env.SMTP_URL!, ['user']);
```

```typescript
// app/api/webhooks/stripe/route.ts
import { notifications } from '@/lib/notifications';

export async function POST(req: Request) {
  const event = await req.json();

  if (event.type === 'payment_intent.succeeded') {
    // Notify sales team
    await notifications.send(
      {
        title: '💰 Payment Received',
        body: `$${event.data.object.amount / 100} from ${event.data.object.customer}`,
      },
      { tags: ['sales'] }
    );
  }

  if (event.type === 'payment_intent.failed') {
    // Alert on all internal channels
    await notifications.send(
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
// lib/notifications.ts
import { FireSignal } from 'fire-signal';

export const fire = new FireSignal();

fire.add(process.env.DISCORD_WEBHOOK, ['dev']);
fire.add(process.env.SLACK_WEBHOOK, ['business']);
fire.add(process.env.SMTP_URL, ['user']);
```

```typescript
// routes/users.ts
import { fire } from '../lib/notifications';

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

**Attachment Support by Provider:**

| Provider        | Attachments | Notes                               |
| --------------- | ----------- | ----------------------------------- |
| **Email**       | ✅ Full     | Via nodemailer (any file type)      |
| **Discord**     | ✅ Full     | Via multipart form-data             |
| **Telegram**    | ✅ Full     | Via sendDocument API                |
| **Slack**       | ❌ Limited  | Webhook doesn't support file upload |
| **Rocket.Chat** | ❌ Limited  | Webhook doesn't support file upload |

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

## 📡 Supported Channels

| Channel     | Schema                      |
| ----------- | --------------------------- |
| Discord     | `discord://`                |
| Telegram    | `tgram://` `telegram://`    |
| Rocket.Chat | `rocketchat://` `rocket://` |
| Slack       | `slack://`                  |
| Email       | `mailto://` `mailtos://`    |
| Webhook     | `json://` `jsons://`        |
| ntfy        | `ntfy://` `ntfys://`        |
| Gotify      | `gotify://` `gotifys://`    |
| Google Chat | `gchat://` `googlechat://`  |

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

## 🔗 URL Formats

<details>
<summary><strong>Discord</strong></summary>

```
discord://webhookId/webhookToken?username=Bot&avatar_url=...
```

Get your webhook URL from Discord → Server Settings → Integrations → Webhooks

</details>

<details>
<summary><strong>Telegram</strong></summary>

```
tgram://botToken/chatId?parse_mode=Markdown
```

1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Get your chat ID from [@userinfobot](https://t.me/userinfobot)
3. For groups, use negative chat IDs

</details>

<details>
<summary><strong>Rocket.Chat</strong></summary>

```
rocketchat://chat.example.com/webhookToken?channel=#general
```

</details>

<details>
<summary><strong>Slack</strong></summary>

```
slack://T00000000/B00000000/XXXXXXXX?channel=#alerts
```

Create an Incoming Webhook in your Slack workspace settings

</details>

<details>
<summary><strong>Email (SMTP)</strong></summary>

```
mailto://user:pass@smtp.gmail.com?to=team@company.com
mailtos://user:pass@smtp.gmail.com:465?to=team@company.com
```

**Note:** Encode `@` in username as `%40`

Example:
`mailto://alerts%40company.com:password@smtp.gmail.com?to=team@company.com`

</details>

<details>
<summary><strong>Generic Webhook</strong></summary>

```
json://api.example.com/webhook
jsons://api.example.com/webhook   # HTTPS
```

Sends JSON payload with `title`, `body`, `tags`, and `metadata`

</details>

<details>
<summary><strong>ntfy</strong></summary>

```
ntfy://ntfy.sh/my-topic?priority=high&tags=fire
ntfys://ntfy.sh/my-topic    # HTTPS
ntfy://user:pass@my-server.com/topic   # With auth
```

**Query Parameters:**

- `priority`: min, low, default, high, urgent
- `tags`: Comma-separated emoji tags (e.g., warning,skull)
- `click`: URL to open when clicked
- `attach`: Attachment URL
- `icon`: Notification icon URL
- `email`: Email for notification
- `delay`: Delay before sending (e.g., 30min, 2h)

</details>

<details>
<summary><strong>Gotify</strong></summary>

```
gotify://my-server.com/appToken?priority=5
gotifys://my-server.com/appToken   # HTTPS
```

**Query Parameters:**

- `priority`: 1-10 (default 5)

Create an Application in Gotify to get the token.

</details>

<details>
<summary><strong>Google Chat</strong></summary>

```
gchat://SPACE_ID/KEY/TOKEN
```

Get your webhook URL from Google Chat:

1. Open a space → Apps & Integrations → Webhooks → Create webhook
2. Copy the URL:
   `https://chat.googleapis.com/v1/spaces/SPACE/messages?key=KEY&token=TOKEN`
3. Convert to: `gchat://SPACE/KEY/TOKEN`

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
  -c, --config <paths...>  Additional config paths
  -v, --verbose            Debug output
  -q, --quiet              Errors only
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
  urls?: string[];
  providers?: FSProvider[];
  skipDefaultProviders?: boolean;
});

fire.add(urls: string | string[], tags?: string[]);
await fire.loadConfig();
await fire.send(message: FSMessage, options?: { tags?: string[] });
```

```typescript
interface FSMessage {
  title?: string;
  body: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
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
