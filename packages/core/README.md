# 🔥 Fire-Signal

**Unified notification library for Node/TypeScript.**

Send notifications to multiple platforms (Discord, Slack, Telegram, Email, Rocket.Chat, and more) through a single, unified API.

## Features

- 📦 **Multi-platform support** – Send to all configured channels or filter by tags
- 🔗 **URL-based configuration** – Simple URL schemas like `discord://`, `slack://`, `mailto://`
- ⚡ **Programmatic API** – Use as a TypeScript/JavaScript library
- 💻 **CLI tool** – `fire-signal` command for shell scripts and automation
- 📁 **Config file support** – YAML configuration with tags
- 🌍 **Environment variables** – Configure via `FIRE_SIGNAL_URLS`

## Installation

```bash
npm install @fire-signal/core
# or
pnpm add @fire-signal/core
# or
yarn add @fire-signal/core
```

## Quick Start

### Programmatic API

```typescript
import { FireSignal } from '@fire-signal/core';

const fs = new FireSignal({
  urls: [
    'discord://webhookId/webhookToken',
    'tgram://botToken/chatId',
    'mailto://user:pass@smtp.example.com?to=team@example.com',
  ],
});

// Send to ALL platforms
await fs.send({ title: 'Deploy Complete', body: 'v1.2.0 is now live!' });

// Send only to specific tags
await fs.send({ title: 'Alert', body: 'High CPU usage detected!' }, { tags: ['critical'] });
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

# Filter by tags (uses config file)
fire-signal -t "Alert" -b "Issue!" -g critical
```

## Supported Providers

| Provider    | Schema(s)                    | Description             |
| ----------- | ---------------------------- | ----------------------- |
| Discord     | `discord://`                 | Discord webhooks        |
| Slack       | `slack://`                   | Slack incoming webhooks |
| Telegram    | `tgram://`, `telegram://`    | Telegram Bot API        |
| Email       | `mailto://`, `mailtos://`    | SMTP via nodemailer     |
| Rocket.Chat | `rocketchat://`, `rocket://` | Rocket.Chat webhooks    |
| JSON        | `json://`, `jsons://`        | Generic JSON webhook    |

## URL Formats

### Discord

```
discord://webhookId/webhookToken?username=Bot&avatar_url=https://...
```

### Slack

```
slack://T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX?channel=#general
```

### Telegram

```
tgram://botToken/chatId?parse_mode=Markdown
```

### Email (SMTP)

```
mailto://user:pass@smtp.example.com?to=email@example.com&from=noreply@example.com
mailtos://user:pass@smtp.example.com:465?to=email@example.com  # TLS
```

### Rocket.Chat

```
rocketchat://hostname/webhookToken?channel=#general&alias=Bot
```

### Generic JSON Webhook

```
json://api.example.com/webhook?method=POST
jsons://api.example.com/webhook  # HTTPS
```

## Configuration File

Create `~/.fire-signal.yml`:

```yaml
urls:
  - url: 'discord://webhookId/webhookToken'
    tags: ['devteam', 'alerts']
  - url: 'tgram://botToken/chatId'
    tags: ['critical']
  - url: 'mailto://user:pass@smtp.example.com?to=team@example.com'
    tags: ['email', 'critical']
  - url: 'rocketchat://chat.example.com/webhookToken'
    tags: ['devteam']
```

Then use tags to filter:

```typescript
const fs = new FireSignal();
await fs.loadConfig();

// Send only to devteam
await fs.send({ title: 'Build Ready', body: 'PR passed' }, { tags: ['devteam'] });

// Send to critical channels only
await fs.send({ title: 'ALERT', body: 'Server down!' }, { tags: ['critical'] });

// Send to ALL configured URLs
await fs.send({ title: 'Update', body: 'New version available' });
```

## Environment Variables

| Variable                  | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `FIRE_SIGNAL_URLS`        | Comma/space separated notification URLs        |
| `FIRE_SIGNAL_CONFIG_PATH` | Additional config file paths (colon separated) |

## CLI Options

```
Usage: fire-signal [options] [urls...]

Unified notification CLI for Node/TypeScript

Arguments:
  urls                    Notification URLs to send to

Options:
  -V, --version           output the version number
  -t, --title <title>     Notification title/subject
  -b, --body <body>       Notification body; if absent, reads from stdin
  -g, --tag <tags...>     Tags to filter URLs
  -c, --config <paths...> Additional config file paths
  -v, --verbose           Enable verbose logging
  -q, --quiet             Suppress output except errors
  -h, --help              display help for command
```

## API Reference

### `FireSignal`

```typescript
interface FireSignalOptions {
  urls?: string[]; // Initial URLs
  providers?: FSProvider[]; // Custom providers
  logger?: LoggerFn; // Custom logger
  configPaths?: string[]; // Additional config paths
  skipDefaultProviders?: boolean; // Skip built-in providers
}

class FireSignal {
  constructor(options?: FireSignalOptions);
  add(urls: string | string[], tags?: string[]): void;
  loadConfig(): Promise<void>;
  send(message: FSMessage, options?: SendOptions): Promise<FSProviderResult[]>;
}
```

### `FSMessage`

```typescript
interface FSMessage {
  title?: string; // Notification title
  body: string; // Notification body (required)
  attachments?: FSAttachment[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}
```

## License

MIT
