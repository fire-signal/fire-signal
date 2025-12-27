/**
 * URL Validator for Fire-Signal.
 *
 * Provides surgical validation errors with specific field information
 * and suggestions for fixing common issues.
 */

import { parseFSUrl, type FSParsedUrl } from './UrlParser';
import { FSValidationError, FSCredentialsError, FSParseError } from './errors';

/**
 * Validation error with contextual information.
 */
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
}

/**
 * Validation warning (non-blocking).
 */
export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

/**
 * Result of URL validation.
 */
export interface ValidationResult {
  valid: boolean;
  parsed?: FSParsedUrl;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Provider-specific validation rules.
 */
interface ProviderValidation {
  schemas: string[];
  validate: (parsed: FSParsedUrl) => {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  };
}

/**
 * SMTP/Email validation rules.
 */
const smtpValidation: ProviderValidation = {
  schemas: ['mailto', 'mailtos'],
  validate: (parsed) => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for unescaped @ in username
    if (
      parsed.username &&
      parsed.raw.includes('@') &&
      !parsed.raw.includes('%40')
    ) {
      const beforeAt = parsed.raw.split('@')[0];
      if (beforeAt && beforeAt.includes('@')) {
        errors.push({
          code: 'SMTP_UNESCAPED_AT',
          message: 'Username contains unescaped @ symbol',
          field: 'username',
          suggestion:
            'Encode @ as %40 in the username (e.g., user%40domain.com)',
        });
      }
    }

    // Check for missing 'to' parameter
    if (!parsed.params.to) {
      errors.push({
        code: 'SMTP_MISSING_TO',
        message: 'Missing required "to" parameter',
        field: 'to',
        suggestion: 'Add ?to=recipient@example.com to the URL',
      });
    }

    // Check for missing credentials
    if (!parsed.username || !parsed.password) {
      errors.push({
        code: 'SMTP_MISSING_CREDENTIALS',
        message: 'SMTP requires username and password',
        field: parsed.username ? 'password' : 'username',
        suggestion: 'Format: mailto://username:password@smtp.example.com',
      });
    }

    // Check for missing host
    if (!parsed.hostname) {
      errors.push({
        code: 'SMTP_MISSING_HOST',
        message: 'Missing SMTP server hostname',
        field: 'hostname',
        suggestion: 'Format: mailto://user:pass@smtp.gmail.com?to=...',
      });
    }

    // Warn about non-standard ports on mailto (should use mailtos for 465)
    if (parsed.schema === 'mailto' && parsed.port === 465) {
      warnings.push({
        code: 'SMTP_PORT_465_USE_TLS',
        message: 'Port 465 typically requires TLS',
        field: 'port',
      });
    }

    return { errors, warnings };
  },
};

/**
 * Discord validation rules.
 */
const discordValidation: ProviderValidation = {
  schemas: ['discord'],
  validate: (parsed) => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Discord URL format: discord://webhookId/webhookToken
    const webhookId = parsed.hostname;
    const webhookToken = parsed.segments[0];

    if (!webhookId) {
      errors.push({
        code: 'DISCORD_MISSING_WEBHOOK_ID',
        message: 'Missing webhook ID',
        field: 'webhookId',
        suggestion: 'Format: discord://WEBHOOK_ID/WEBHOOK_TOKEN',
      });
    } else if (!/^\d+$/.test(webhookId)) {
      warnings.push({
        code: 'DISCORD_INVALID_WEBHOOK_ID',
        message: 'Webhook ID should be numeric',
        field: 'webhookId',
      });
    }

    if (!webhookToken) {
      errors.push({
        code: 'DISCORD_MISSING_WEBHOOK_TOKEN',
        message: 'Missing webhook token',
        field: 'webhookToken',
        suggestion: 'Format: discord://WEBHOOK_ID/WEBHOOK_TOKEN',
      });
    }

    return { errors, warnings };
  },
};

/**
 * Telegram validation rules.
 */
const telegramValidation: ProviderValidation = {
  schemas: ['tgram', 'telegram'],
  validate: (parsed) => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Telegram URL format: tgram://botToken/chatId
    const botToken = parsed.hostname;
    const chatId = parsed.segments[0];

    if (!botToken) {
      errors.push({
        code: 'TELEGRAM_MISSING_BOT_TOKEN',
        message: 'Missing bot token',
        field: 'botToken',
        suggestion: 'Get your bot token from @BotFather on Telegram',
      });
    }

    if (!chatId) {
      errors.push({
        code: 'TELEGRAM_MISSING_CHAT_ID',
        message: 'Missing chat ID',
        field: 'chatId',
        suggestion: 'Get your chat ID from @userinfobot on Telegram',
      });
    }

    // Validate parse_mode if provided
    const parseMode = parsed.params.parse_mode;
    if (parseMode && typeof parseMode === 'string') {
      const validModes = ['Markdown', 'MarkdownV2', 'HTML'];
      if (!validModes.includes(parseMode)) {
        warnings.push({
          code: 'TELEGRAM_INVALID_PARSE_MODE',
          message: `Invalid parse_mode: ${parseMode}`,
          field: 'parse_mode',
        });
      }
    }

    return { errors, warnings };
  },
};

/**
 * Slack validation rules.
 */
const slackValidation: ProviderValidation = {
  schemas: ['slack'],
  validate: (parsed) => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Slack URL format: slack://T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
    const teamId = parsed.hostname;
    const botId = parsed.segments[0];
    const token = parsed.segments[1];

    if (!teamId || !teamId.toUpperCase().startsWith('T')) {
      errors.push({
        code: 'SLACK_INVALID_TEAM_ID',
        message: 'Invalid or missing team ID (should start with T)',
        field: 'teamId',
        suggestion: 'Format: slack://TXXXXXXXX/BXXXXXXXX/TOKEN',
      });
    }

    if (!botId || !botId.toUpperCase().startsWith('B')) {
      errors.push({
        code: 'SLACK_INVALID_BOT_ID',
        message: 'Invalid or missing bot ID (should start with B)',
        field: 'botId',
        suggestion: 'Format: slack://TXXXXXXXX/BXXXXXXXX/TOKEN',
      });
    }

    if (!token) {
      errors.push({
        code: 'SLACK_MISSING_TOKEN',
        message: 'Missing webhook token',
        field: 'token',
        suggestion:
          'Get the full webhook URL from Slack → Apps → Incoming Webhooks',
      });
    }

    return { errors, warnings };
  },
};

/**
 * ntfy validation rules.
 */
const ntfyValidation: ProviderValidation = {
  schemas: ['ntfy', 'ntfys'],
  validate: (parsed) => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // ntfy URL format: ntfy://[user:pass@]host/topic
    const topic = parsed.segments[0] || parsed.path;

    if (!parsed.hostname) {
      errors.push({
        code: 'NTFY_MISSING_HOST',
        message: 'Missing ntfy server hostname',
        field: 'hostname',
        suggestion:
          'Use ntfy.sh for public or your own server: ntfy://ntfy.sh/topic',
      });
    }

    if (!topic) {
      errors.push({
        code: 'NTFY_MISSING_TOPIC',
        message: 'Missing topic name',
        field: 'topic',
        suggestion: 'Add a topic name: ntfy://ntfy.sh/my-topic',
      });
    }

    // Validate priority if provided
    const priority = parsed.params.priority;
    if (priority && typeof priority === 'string') {
      const validPriorities = [
        'min',
        'low',
        'default',
        'high',
        'urgent',
        '1',
        '2',
        '3',
        '4',
        '5',
      ];
      if (!validPriorities.includes(priority.toLowerCase())) {
        warnings.push({
          code: 'NTFY_INVALID_PRIORITY',
          message: `Invalid priority: ${priority}`,
          field: 'priority',
        });
      }
    }

    return { errors, warnings };
  },
};

/**
 * Rocket.Chat validation rules.
 */
const rocketChatValidation: ProviderValidation = {
  schemas: ['rocketchat', 'rocket'],
  validate: (parsed) => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!parsed.hostname) {
      errors.push({
        code: 'ROCKETCHAT_MISSING_HOST',
        message: 'Missing Rocket.Chat server hostname',
        field: 'hostname',
        suggestion: 'Format: rocketchat://chat.example.com/webhookToken',
      });
    }

    const webhookToken = parsed.segments[0];
    if (!webhookToken) {
      errors.push({
        code: 'ROCKETCHAT_MISSING_TOKEN',
        message: 'Missing webhook token',
        field: 'webhookToken',
        suggestion: 'Get the webhook token from Administration → Integrations',
      });
    }

    return { errors, warnings };
  },
};

/**
 * Generic webhook validation rules.
 */
const webhookValidation: ProviderValidation = {
  schemas: ['json', 'jsons'],
  validate: (parsed) => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!parsed.hostname) {
      errors.push({
        code: 'WEBHOOK_MISSING_HOST',
        message: 'Missing webhook hostname',
        field: 'hostname',
        suggestion: 'Format: json://api.example.com/webhook',
      });
    }

    return { errors, warnings };
  },
};

/**
 * All provider validations.
 */
const providerValidations: ProviderValidation[] = [
  smtpValidation,
  discordValidation,
  telegramValidation,
  slackValidation,
  ntfyValidation,
  rocketChatValidation,
  webhookValidation,
];

/**
 * Validates a fire-signal URL with surgical error messages.
 *
 * @param url - The URL to validate
 * @returns Validation result with parsed URL, errors, and warnings
 */
export function validateFSUrl(url: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Basic validation
  if (!url || typeof url !== 'string') {
    return {
      valid: false,
      errors: [
        {
          code: 'URL_EMPTY',
          message: 'URL must be a non-empty string',
          suggestion: 'Provide a valid notification URL',
        },
      ],
      warnings: [],
    };
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return {
      valid: false,
      errors: [
        {
          code: 'URL_EMPTY',
          message: 'URL is empty or whitespace only',
        },
      ],
      warnings: [],
    };
  }

  // Try to parse the URL
  let parsed: FSParsedUrl;
  try {
    parsed = parseFSUrl(trimmed);
  } catch (err) {
    if (err instanceof FSParseError) {
      return {
        valid: false,
        errors: [
          {
            code: 'URL_PARSE_ERROR',
            message: err.message,
            suggestion: 'Check the URL format: schema://[user:pass@]host/path',
          },
        ],
        warnings: [],
      };
    }
    throw err;
  }

  // Find provider-specific validation
  const providerValidation = providerValidations.find((pv) =>
    pv.schemas.includes(parsed.schema.toLowerCase())
  );

  if (providerValidation) {
    const result = providerValidation.validate(parsed);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  } else {
    // Unknown schema - just warn
    warnings.push({
      code: 'UNKNOWN_SCHEMA',
      message: `Unknown schema: ${parsed.schema}`,
      field: 'schema',
    });
  }

  return {
    valid: errors.length === 0,
    parsed,
    errors,
    warnings,
  };
}

/**
 * Throws appropriate error if URL validation fails.
 *
 * @param url - The URL to validate
 * @returns Parsed URL if valid
 * @throws FSValidationError or FSCredentialsError if invalid
 */
export function validateAndParseFSUrl(url: string): FSParsedUrl {
  const result = validateFSUrl(url);

  if (!result.valid) {
    const firstError = result.errors[0]!;

    // Throw specific error types based on error code
    if (
      firstError.code.includes('MISSING_CREDENTIALS') ||
      firstError.code.includes('MISSING_TOKEN')
    ) {
      const schema = result.parsed?.schema ?? 'unknown';
      throw new FSCredentialsError(firstError.message, schema, [
        firstError.field ?? 'credentials',
      ]);
    }

    throw new FSValidationError(
      firstError.message,
      firstError.field ?? 'url',
      url,
      firstError.suggestion
    );
  }

  return result.parsed!;
}

/**
 * Checks if URL is valid without throwing.
 */
export function isValidUrl(url: string): boolean {
  return validateFSUrl(url).valid;
}
