<p align="center">
  <img src="https://raw.githubusercontent.com/fire-signal/fire-signal/main/docs/logo.svg" alt="Fire-Signal" width="200" />
</p>

<h1 align="center">🔥 Fire-Signal</h1>

<p align="center">
  <strong>Unified notification library for Node.js and TypeScript</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@fire-signal/core"><img src="https://img.shields.io/npm/v/@fire-signal/core?style=flat-square&color=orange" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@fire-signal/core"><img src="https://img.shields.io/npm/dm/@fire-signal/core?style=flat-square&color=blue" alt="npm downloads" /></a>
  <a href="https://github.com/fire-signal/fire-signal/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square" alt="node version" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/typescript-%3E%3D5.0-blue?style=flat-square" alt="typescript" /></a>
</p>

<p align="center">
  Send notifications to <strong>Discord</strong>, <strong>Slack</strong>, <strong>Telegram</strong>, <strong>Email</strong>, <strong>Rocket.Chat</strong>, and more through a single, unified API.
</p>

---

## ✨ Features

- 📦 **Multi-platform** – Send to all configured channels or filter by tags
- 🔗 **URL-based config** – Simple schemas like `discord://`, `slack://`, `tgram://`
- ⚡ **TypeScript first** – Full type safety and IntelliSense support
- 💻 **CLI included** – `fire-signal` command for shell scripts
- 📁 **YAML config** – Configure channels with tags in `~/.fire-signal.yml`
- 🌍 **ENV support** – Set URLs via `FIRE_SIGNAL_URLS`
- 🔧 **Extensible** – Create custom providers easily

## 📦 Installation

```bash
# npm
npm install @fire-signal/core

# pnpm
pnpm add @fire-signal/core

# yarn
yarn add @fire-signal/core
```

## 🚀 Quick Start

### Programmatic API

```typescript
import { FireSignal } from '@fire-signal/core';

const fire = new FireSignal({
  urls: [
    'discord://1234567890/abcdefghijk',
    'tgram://123456789:AABBccDDeeFF/987654321',
    'mailto://user:pass@smtp.example.com?to=team@example.com',
  ],
});

// Send to ALL platforms
await fire.send({ title: 'Deploy Complete', body: 'v1.2.0 is now live!' });

// Send only to specific tags
await fire.send({ title: 'Alert', body: 'High CPU usage detected!' }, { tags: ['critical'] });
```

### CLI Usage

```bash
# Send to specific URLs
fire-signal -t "Build Complete" -b "PR #123 merged" discord://id/token

# Use environment variable
export FIRE_SIGNAL_URLS="discord://id/token slack://T.../B.../XXX"
fire-signal -t "Deploy" -b "Done!"

# Read body from stdin
echo "Task completed successfully" | fire-signal -t "Automation"

# Filter by tags
fire-signal -t "Alert" -b "Issue!" -g critical
```

## 📡 Supported Providers

| Provider    | Schema(s)                    | Description             |
| ----------- | ---------------------------- | ----------------------- |
| Discord     | `discord://`                 | Discord webhooks        |
| Slack       | `slack://`                   | Slack incoming webhooks |
| Telegram    | `tgram://`, `telegram://`    | Telegram Bot API        |
| Email       | `mailto://`, `mailtos://`    | SMTP via nodemailer     |
| Rocket.Chat | `rocketchat://`, `rocket://` | Rocket.Chat webhooks    |
| JSON        | `json://`, `jsons://`        | Generic JSON webhook    |

## 🔗 URL Formats

<details>
<summary><strong>Discord</strong></summary>

```
discord://webhookId/webhookToken?username=Bot&avatar_url=https://...
```

| Parameter      | Description                 |
| -------------- | --------------------------- |
| `webhookId`    | Webhook ID (numeric)        |
| `webhookToken` | Webhook token               |
| `username`     | Bot display name            |
| `avatar_url`   | Avatar URL                  |
| `tts`          | Text-to-speech (true/false) |

</details>

<details>
<summary><strong>Telegram</strong></summary>

```
tgram://botToken/chatId?parse_mode=Markdown
```

| Parameter                  | Description                      |
| -------------------------- | -------------------------------- |
| `botToken`                 | Full bot token (e.g., `123:ABC`) |
| `chatId`                   | Chat ID (negative for groups)    |
| `parse_mode`               | HTML, Markdown, or MarkdownV2    |
| `disable_web_page_preview` | Disable link previews            |
| `disable_notification`     | Send silently                    |

</details>

<details>
<summary><strong>Slack</strong></summary>

```
slack://T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX?channel=#general
```

| Parameter    | Description                  |
| ------------ | ---------------------------- |
| `channel`    | Override channel             |
| `username`   | Bot username                 |
| `icon_emoji` | Emoji icon (e.g., `:robot:`) |
| `icon_url`   | Icon URL                     |

</details>

<details>
<summary><strong>Email (SMTP)</strong></summary>

```
mailto://user:pass@smtp.example.com?to=email@example.com
mailtos://user:pass@smtp.example.com:465?to=email@example.com
```

| Schema       | Description             |
| ------------ | ----------------------- |
| `mailto://`  | SMTP (port 587 default) |
| `mailtos://` | SMTP + TLS (port 465)   |

| Parameter | Description        |
| --------- | ------------------ |
| `to`      | Recipient email(s) |
| `from`    | Sender email       |
| `cc`      | CC recipients      |
| `bcc`     | BCC recipients     |

</details>

<details>
<summary><strong>Rocket.Chat</strong></summary>

```
rocketchat://hostname/webhookToken?channel=#general&alias=Bot
```

| Parameter | Description     |
| --------- | --------------- |
| `channel` | Channel to post |
| `alias`   | Bot alias       |
| `avatar`  | Avatar URL      |
| `emoji`   | Emoji avatar    |

</details>

<details>
<summary><strong>Generic JSON</strong></summary>

```
json://api.example.com/webhook
jsons://api.example.com/webhook   # HTTPS
```

| Parameter      | Description                 |
| -------------- | --------------------------- |
| `method`       | HTTP method (default: POST) |
| `content_type` | Content-Type header         |

</details>

## 📁 Configuration File

Create `~/.fire-signal.yml`:

```yaml
urls:
  - url: 'discord://webhookId/webhookToken'
    tags: ['devteam', 'alerts']
  - url: 'tgram://botToken/chatId'
    tags: ['critical']
  - url: 'mailto://user:pass@smtp.example.com?to=team@example.com'
    tags: ['email', 'critical']
```

```typescript
const fire = new FireSignal();
await fire.loadConfig();

// Send only to devteam
await fire.send({ title: 'Build Ready', body: 'PR passed' }, { tags: ['devteam'] });

// Send to critical channels
await fire.send({ title: 'ALERT', body: 'Server down!' }, { tags: ['critical'] });

// Send to ALL
await fire.send({ title: 'Update', body: 'New version available' });
```

## 🌍 Environment Variables

| Variable                  | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `FIRE_SIGNAL_URLS`        | Comma/space separated notification URLs        |
| `FIRE_SIGNAL_CONFIG_PATH` | Additional config file paths (colon separated) |

## 💻 CLI Reference

```
Usage: fire-signal [options] [urls...]

Arguments:
  urls                     Notification URLs

Options:
  -V, --version            Version number
  -t, --title <title>      Notification title
  -b, --body <body>        Notification body (or stdin)
  -g, --tag <tags...>      Filter by tags
  -c, --config <paths...>  Additional config paths
  -v, --verbose            Verbose logging
  -q, --quiet              Errors only
  -h, --help               Help
```

## 📖 API Reference

### FireSignal

```typescript
const fire = new FireSignal({
  urls: string[];              // Initial URLs
  providers: FSProvider[];     // Custom providers
  logger: LoggerFn;            // Custom logger
  configPaths: string[];       // Config paths
  skipDefaultProviders: boolean; // Skip built-ins
});

fire.add(urls, tags?);         // Add URLs
await fire.loadConfig();       // Load config
await fire.send(message, opts); // Send notification
```

### FSMessage

```typescript
interface FSMessage {
  title?: string;
  body: string;
  attachments?: FSAttachment[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}
```

## 🔧 Custom Providers

```typescript
import { BaseProvider } from '@fire-signal/core';

class MyProvider extends BaseProvider {
  readonly id = 'custom';
  readonly schemas = ['custom'];

  parseUrl(raw: string) {
    const schema = this.extractSchema(raw);
    const afterSchema = raw.slice(`${schema}://`.length);
    const [pathPart, queryPart] = afterSchema.split('?');
    const segments = (pathPart ?? '').split('/').filter(Boolean);

    return {
      schema,
      hostname: segments[0],
      segments: segments.slice(1),
      path: segments.slice(1).join('/'),
      params: this.parseQueryParams(queryPart ?? ''),
      raw,
    };
  }

  async send(message, ctx) {
    // Your logic here
    return this.success({ sent: true });
  }
}

const fire = new FireSignal({
  providers: [new MyProvider()],
  urls: ['custom://my-service/endpoint'],
});
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

## 📄 License

MIT © Fire-Signal Contributors
