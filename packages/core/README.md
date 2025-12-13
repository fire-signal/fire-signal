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
- 🔧 **Provider-specific URL parsing** – Each provider handles its own URL format

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
    'discord://1234567890/abcdefghijk',
    'tgram://123456789:AABBccDDeeFF/987654321',
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

- `webhookId`: Discord webhook ID (numeric)
- `webhookToken`: Discord webhook token
- `username`: (optional) Bot display name
- `avatar_url`: (optional) Avatar URL
- `tts`: (optional) Text-to-speech (true/false)

### Telegram

```
tgram://botToken/chatId?parse_mode=Markdown
```

- `botToken`: Full bot token (e.g., `123456789:AABBccDDeeFF`)
- `chatId`: Chat/group/channel ID (can be negative for groups)
- `parse_mode`: (optional) HTML, Markdown, or MarkdownV2
- `disable_web_page_preview`: (optional) true/false
- `disable_notification`: (optional) true/false

### Slack

```
slack://T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX?channel=#general
```

- Format: `slack://teamId/botId/token`
- `channel`: (optional) Override channel
- `username`: (optional) Bot username
- `icon_emoji`: (optional) Emoji icon (e.g., `:robot:`)
- `icon_url`: (optional) Icon URL

### Email (SMTP)

```
mailto://user:pass@smtp.example.com?to=email@example.com
mailtos://user:pass@smtp.example.com:465?to=email@example.com
```

- `mailto://`: SMTP (port 587 default)
- `mailtos://`: SMTP with TLS (port 465 default)
- `to`: (required) Recipient email(s)
- `from`: (optional) Sender email
- `cc`: (optional) CC recipients
- `bcc`: (optional) BCC recipients

### Rocket.Chat

```
rocketchat://hostname/webhookToken?channel=#general&alias=Bot
```

- `hostname`: Rocket.Chat server hostname
- `webhookToken`: Webhook token
- `channel`: (optional) Channel to post to
- `alias`: (optional) Bot alias
- `avatar`: (optional) Avatar URL
- `emoji`: (optional) Emoji avatar

### Generic JSON Webhook

```
json://api.example.com/webhook?method=POST
jsons://api.example.com/webhook
```

- `json://`: HTTP
- `jsons://`: HTTPS
- `method`: (optional) HTTP method (default: POST)
- `content_type`: (optional) Content-Type header

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
  urls                     Notification URLs to send to

Options:
  -V, --version            output the version number
  -t, --title <title>      Notification title/subject
  -b, --body <body>        Notification body; if absent, reads from stdin
  -g, --tag <tags...>      Tags to filter URLs
  -c, --config <paths...>  Additional config file paths
  -v, --verbose            Enable verbose logging
  -q, --quiet              Suppress output except errors
  -h, --help               display help for command
```

## API Reference

### `FireSignal`

```typescript
interface FireSignalOptions {
  urls?: string[];
  providers?: FSProvider[];
  logger?: LoggerFn;
  configPaths?: string[];
  skipDefaultProviders?: boolean;
}

class FireSignal {
  constructor(options?: FireSignalOptions);
  registerProvider(provider: FSProvider): void;
  add(urls: string | string[], tags?: string[]): void;
  loadConfig(): Promise<void>;
  getUrls(): string[];
  getEntries(): TaggedUrl[];
  getProvider(schema: string): FSProvider | undefined;
  send(message: FSMessage, options?: SendOptions): Promise<FSProviderResult[]>;
}
```

### `FSMessage`

```typescript
interface FSMessage {
  title?: string;
  body: string;
  attachments?: FSAttachment[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}
```

### `FSProvider`

```typescript
interface FSProvider {
  id: string;
  schemas: string[];
  parseUrl(raw: string): FSParsedUrl;
  send(message: FSMessage, ctx: FSProviderContext): Promise<FSProviderResult>;
}
```

## Custom Providers

You can create custom providers by extending `BaseProvider`:

```typescript
import { BaseProvider, FSProviderContext, FSProviderResult, FSParsedUrl } from '@fire-signal/core';
import type { FSMessage } from '@fire-signal/core';

class MyCustomProvider extends BaseProvider {
  readonly id = 'custom';
  readonly schemas = ['custom'];

  parseUrl(raw: string): FSParsedUrl {
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

  async send(message: FSMessage, ctx: FSProviderContext): Promise<FSProviderResult> {
    // Your custom logic here
    return this.success({ sent: true });
  }
}

// Register your provider
const fs = new FireSignal({
  providers: [new MyCustomProvider()],
  urls: ['custom://my-service/endpoint'],
});
```

## License

MIT
