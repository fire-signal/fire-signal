/**
 * HTTP error utilities for fire-signal.
 */

/**
 * Human-readable descriptions for common HTTP status codes.
 */
const HTTP_ERROR_DESCRIPTIONS: Record<number, string> = {
  400: 'Bad Request - Invalid payload or parameters',
  401: 'Unauthorized - Token expired or invalid credentials',
  403: 'Forbidden - Access denied or insufficient permissions',
  404: 'Not Found - Webhook URL is invalid or deleted',
  405: 'Method Not Allowed - Incorrect HTTP method',
  408: 'Request Timeout - Server took too long to respond',
  429: 'Too Many Requests - Rate limited, slow down',
  500: 'Internal Server Error - Server-side issue',
  502: 'Bad Gateway - Upstream server error',
  503: 'Service Unavailable - Server is down or overloaded',
  504: 'Gateway Timeout - Server did not respond in time',
};

/**
 * Gets a human-readable description for an HTTP status code.
 *
 * @param status - HTTP status code
 * @param responseText - Optional response body text
 * @returns Descriptive error message including the status code
 */
export function getHttpErrorDescription(
  status: number,
  responseText?: string
): string {
  const description =
    HTTP_ERROR_DESCRIPTIONS[status] ?? `Unknown Error (HTTP ${status})`;
  const codePrefix = `[${status}]`;

  if (responseText && responseText.trim()) {
    return `${codePrefix} ${description}\nDetails: ${responseText.substring(0, 200)}`;
  }

  return `${codePrefix} ${description}`;
}
