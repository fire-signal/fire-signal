<p align="center">
  <img src="https://em-content.zobj.net/source/apple/391/fire_1f525.png" alt="Fire-Signal" width="80" />
</p>

<h1 align="center">Fire-Signal</h1>

<p align="center">
  <strong>One call. Every channel. Zero hassle.</strong>
</p>

<p align="center">
  Stop juggling SDKs. Fire-Signal broadcasts your notifications to Discord, Slack, Telegram, Email, and more — simultaneously.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@fire-signal/core"><img src="https://img.shields.io/npm/v/@fire-signal/core?style=for-the-badge&color=ff6b35&label=npm" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/@fire-signal/core"><img src="https://img.shields.io/npm/dm/@fire-signal/core?style=for-the-badge&color=0d96f2&label=downloads" alt="downloads" /></a>
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

Some team members prefer **Discord**. Others use **Slack**. Your ops team needs **email**. And you want real-time alerts on **Telegram**.

**Without Fire-Signal:** You maintain 4+ different integrations, each with their own API, error handling, and configuration.

**With Fire-Signal:** One line of code. All channels. Done.

---

## ⚡ Quick Example

```typescript
import { FireSignal } from '@fire-signal/core';

const fire = new FireSignal({
  urls: [
    'discord://1234567890/abcdefghijk',
    'tgram://123456789:AABBccDD/987654321',
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
npm install @fire-signal/core
```

<details>
<summary>Other package managers</summary>

```bash
pnpm add @fire-signal/core
yarn add @fire-signal/core
```

</details>

---

## 🏗️ Framework Integration

### NestJS

```typescript
// notifications.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { FireSignal } from '@fire-signal/core';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private fire: FireSignal;

  onModuleInit() {
    this.fire = new FireSignal({
      urls: [process.env.DISCORD_WEBHOOK, process.env.TELEGRAM_BOT_URL],
    });
  }

  async notifyTeam(title: string, body: string) {
    await this.fire.send({ title, body });
  }

  async alertCritical(message: string) {
    await this.fire.send({ title: '🚨 CRITICAL', body: message }, { tags: ['oncall'] });
  }
}
```

```typescript
// notifications.module.ts
@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

### Next.js (App Router)

```typescript
// lib/fire-signal.ts
import { FireSignal } from '@fire-signal/core';

export const fire = new FireSignal({
  urls: [process.env.DISCORD_WEBHOOK!, process.env.SLACK_WEBHOOK!],
});
```

```typescript
// app/api/webhooks/stripe/route.ts
import { fire } from '@/lib/fire-signal';

export async function POST(req: Request) {
  const event = await req.json();

  if (event.type === 'payment_intent.succeeded') {
    await fire.send({
      title: '💰 Payment Received',
      body: `$${event.data.object.amount / 100} from ${event.data.object.customer}`,
    });
  }

  return Response.json({ received: true });
}
```

### Express

```typescript
// lib/notifications.ts
import { FireSignal } from '@fire-signal/core';

export const fire = new FireSignal({
  urls: process.env.FIRE_SIGNAL_URLS?.split(',') || [],
});
```

```typescript
// routes/users.ts
import { fire } from '../lib/notifications';

router.post('/signup', async (req, res) => {
  const user = await createUser(req.body);

  await fire.send({
    title: '👤 New User',
    body: `${user.name} (${user.email}) just signed up!`,
  });

  res.json(user);
});
```

### Fastify

```typescript
// plugins/fire-signal.ts
import fp from 'fastify-plugin';
import { FireSignal } from '@fire-signal/core';

export default fp(async (fastify) => {
  const fire = new FireSignal({
    urls: [fastify.config.DISCORD_WEBHOOK],
  });

  fastify.decorate('fire', fire);
});
```

```typescript
// routes/orders.ts
fastify.post('/orders', async (request, reply) => {
  const order = await createOrder(request.body);

  await fastify.fire.send({
    title: '🛒 New Order',
    body: `Order #${order.id} - $${order.total}`,
  });

  return order;
});
```

### Node.js Scripts / CI/CD

```bash
# In your CI pipeline
npm install -g @fire-signal/core

# After deploy
fire-signal -t "✅ Deploy Complete" -b "Deployed to production" \
  discord://webhook/token \
  tgram://bot/chat
```

```typescript
// scripts/backup.ts
import { FireSignal } from '@fire-signal/core';

const fire = new FireSignal({ urls: [process.env.ALERTS_WEBHOOK!] });

async function runBackup() {
  try {
    await performBackup();
    await fire.send({ title: '✅ Backup Complete', body: `Size: ${size}MB` });
  } catch (error) {
    await fire.send({ title: '❌ Backup Failed', body: error.message });
    process.exit(1);
  }
}
```

---

## ✨ Features

| Feature                        | Description                                                |
| ------------------------------ | ---------------------------------------------------------- |
| 📡 **Multi-channel broadcast** | Discord, Slack, Telegram, Email, Rocket.Chat, and webhooks |
| 🔗 **URL-based config**        | No complex setup — just `discord://webhook/token`          |
| 🏷️ **Tag-based routing**       | Send critical alerts only to on-call channels              |
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
| Slack       | `slack://`                  |
| Email       | `mailto://` `mailtos://`    |
| Rocket.Chat | `rocketchat://` `rocket://` |
| Webhook     | `json://` `jsons://`        |

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

For Gmail, use an App Password (not your regular password)

</details>

<details>
<summary><strong>Rocket.Chat</strong></summary>

```
rocketchat://chat.example.com/webhookToken?channel=#general
```

</details>

<details>
<summary><strong>Generic Webhook</strong></summary>

```
json://api.example.com/webhook
jsons://api.example.com/webhook   # HTTPS
```

Sends JSON payload with `title`, `body`, `tags`, and `metadata`

</details>

---

## 📁 Configuration File

Create `~/.fire-signal.yml`:

```yaml
urls:
  - url: 'discord://webhookId/webhookToken'
    tags: ['team', 'deploys']

  - url: 'tgram://botToken/chatId'
    tags: ['critical', 'oncall']

  - url: 'mailto://user:pass@smtp.gmail.com?to=ops@company.com'
    tags: ['critical']
```

```typescript
const fire = new FireSignal();
await fire.loadConfig();

// Only team channels
await fire.send({ body: 'Build passed' }, { tags: ['team'] });

// Only critical (Telegram + Email)
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
fire-signal -t "Deploy" -b "Done!" discord://id/token

# From env
export FIRE_SIGNAL_URLS="discord://id/token tgram://bot/chat"
fire-signal -t "Alert" -b "Check logs"

# Pipe
echo "Build completed" | fire-signal -t "CI"

# Tags
fire-signal -t "Critical" -b "Error!" -g oncall
```

---

## 🔧 Custom Providers

```typescript
import { BaseProvider } from '@fire-signal/core';

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

Contributions welcome! Please open an issue first to discuss what you'd like to change.

---

## 📄 License

[MIT](LICENSE)

---

<p align="center">
  Made with 🔥 by the Fire-Signal contributors
</p>
