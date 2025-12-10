/**
 * Stdin reading utility for CLI.
 */

/**
 * Reads body from stdin if not provided via arguments.
 * Returns immediately if body is already provided.
 *
 * @param body - Optional body from CLI arguments
 * @returns Body string (from argument or stdin)
 */
export async function readStdinIfEmpty(body?: string): Promise<string> {
  // If body is provided, use it
  if (body !== undefined && body !== null && body !== '') {
    return body;
  }

  // Check if stdin is a TTY (interactive terminal)
  // If it is, there's no piped input to read
  if (process.stdin.isTTY) {
    return '';
  }

  // Read from stdin
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk as Buffer | string));
  }

  return Buffer.concat(chunks).toString('utf8').trim();
}
