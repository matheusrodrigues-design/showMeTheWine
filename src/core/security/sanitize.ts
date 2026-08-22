/**
 * Sanitização defensiva no client (não substitui validação Zod no servidor).
 * Reduz risco de prompt injection e payloads malformados.
 */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const PROMPT_INJECTION_PATTERNS =
  /(ignore\s+(all|previous|above)\s+instructions|system\s*:|assistant\s*:|<\/?\s*script|javascript:)/gi;

export function sanitizeUserText(input: string, maxLength = 200): string {
  return input
    .replace(CONTROL_CHARS, '')
    .replace(PROMPT_INJECTION_PATTERNS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function normalizeWineQuery(input: string): string {
  return sanitizeUserText(input, 200).toLowerCase();
}
