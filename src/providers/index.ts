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
import { NtfyProvider } from './ntfy/NtfyProvider';
import { GotifyProvider } from './gotify/GotifyProvider';
import { GoogleChatProvider } from './gchat/GoogleChatProvider';
import { MattermostProvider } from './mattermost/MattermostProvider';
import { MSTeamsProvider } from './msteams/MSTeamsProvider';
import { OneSignalProvider } from './onesignal/OneSignalProvider';
import { PushoverProvider } from './pushover/PushoverProvider';
import { TwilioProvider } from './twilio/TwilioProvider';

// Export individual providers
export { SmtpProvider } from './email/SmtpProvider';
export { DiscordWebhookProvider } from './discord/DiscordWebhookProvider';
export { RocketChatWebhookProvider } from './rocketchat/RocketChatWebhookProvider';
export { SlackWebhookProvider } from './slack/SlackWebhookProvider';
export { TelegramBotProvider } from './telegram/TelegramBotProvider';
export { JsonWebhookProvider } from './http/JsonWebhookProvider';
export { NtfyProvider } from './ntfy/NtfyProvider';
export { GotifyProvider } from './gotify/GotifyProvider';
export { GoogleChatProvider } from './gchat/GoogleChatProvider';
export { MattermostProvider } from './mattermost/MattermostProvider';
export { MSTeamsProvider } from './msteams/MSTeamsProvider';
export { OneSignalProvider } from './onesignal/OneSignalProvider';
export { PushoverProvider } from './pushover/PushoverProvider';
export { TwilioProvider } from './twilio/TwilioProvider';

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
    new NtfyProvider(),
    new GotifyProvider(),
    new GoogleChatProvider(),
    new MattermostProvider(),
    new MSTeamsProvider(),
    new OneSignalProvider(),
    new PushoverProvider(),
    new TwilioProvider(),
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
  ntfy: NtfyProvider,
  ntfys: NtfyProvider,
  gotify: GotifyProvider,
  gotifys: GotifyProvider,
  gchat: GoogleChatProvider,
  googlechat: GoogleChatProvider,
  mmost: MattermostProvider,
  mmosts: MattermostProvider,
  msteams: MSTeamsProvider,
  onesignal: OneSignalProvider,
  pover: PushoverProvider,
  pushover: PushoverProvider,
  twilio: TwilioProvider,
} as const;
