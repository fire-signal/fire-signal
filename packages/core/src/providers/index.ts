/**
 * Provider registry - exports all built-in providers.
 */

import { FSProvider } from './base/Provider';
import { SmtpProvider } from './email/SmtpProvider';
import { DiscordWebhookProvider } from './discord/DiscordWebhookProvider';
import { RocketChatWebhookProvider } from './rocketchat/RocketChatWebhookProvider';
import { SlackWebhookProvider } from './slack/SlackWebhookProvider';
import { TelegramBotProvider } from './telegram/TelegramBotProvider';
import { JsonWebhookProvider } from './http/JsonWebhookProvider';

// Export individual providers
export { SmtpProvider } from './email/SmtpProvider';
export { DiscordWebhookProvider } from './discord/DiscordWebhookProvider';
export { RocketChatWebhookProvider } from './rocketchat/RocketChatWebhookProvider';
export { SlackWebhookProvider } from './slack/SlackWebhookProvider';
export { TelegramBotProvider } from './telegram/TelegramBotProvider';
export { JsonWebhookProvider } from './http/JsonWebhookProvider';

/**
 * Creates instances of all built-in providers.
 *
 * @returns Array of provider instances
 */
export function createDefaultProviders(): FSProvider[] {
  return [
    new SmtpProvider(),
    new DiscordWebhookProvider(),
    new RocketChatWebhookProvider(),
    new SlackWebhookProvider(),
    new TelegramBotProvider(),
    new JsonWebhookProvider(),
  ];
}

/**
 * Provider schema to provider class mapping.
 */
export const PROVIDER_SCHEMAS = {
  mailto: SmtpProvider,
  mailtos: SmtpProvider,
  discord: DiscordWebhookProvider,
  rocketchat: RocketChatWebhookProvider,
  rocket: RocketChatWebhookProvider,
  slack: SlackWebhookProvider,
  tgram: TelegramBotProvider,
  telegram: TelegramBotProvider,
  json: JsonWebhookProvider,
  jsons: JsonWebhookProvider,
} as const;
