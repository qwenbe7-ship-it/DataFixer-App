import type { CellValue } from '../domain/types';

const CANONICAL_NUMBER = /^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

function splitAllowedTokens(text: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let escaped = false;

  for (const char of text) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (inQuotes && char === '\\') {
      current += char;
      escaped = true;
      continue;
    }
    if (char === '"') {
      current += char;
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      tokens.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  tokens.push(current);
  return tokens;
}

export function parseCellLiteral(rawToken: string): CellValue {
  const token = rawToken.trim();
  if (token === 'null') return null;
  if (token === 'true') return true;
  if (token === 'false') return false;
  if (token.startsWith('"') && token.endsWith('"')) {
    try {
      const parsed = JSON.parse(token);
      if (typeof parsed === 'string') return parsed;
    } catch {
      return token;
    }
  }
  if (CANONICAL_NUMBER.test(token)) {
    const number = Number(token);
    if (Number.isFinite(number)) return number;
  }
  return token;
}

export function parseAllowedValues(text: string): CellValue[] {
  return splitAllowedTokens(text)
    .filter((token) => token.trim() !== '')
    .map(parseCellLiteral);
}

export function formatCellLiteral(value: CellValue): string {
  if (value === null) return 'null';
  if (typeof value !== 'string') return String(value);
  const needsQuotes =
    CANONICAL_NUMBER.test(value)
    || value === 'true'
    || value === 'false'
    || value === 'null'
    || value.includes(',')
    || value.includes('"')
    || value.includes('\\')
    || value.trim() !== value;
  return needsQuotes ? JSON.stringify(value) : value;
}

export function formatAllowedValues(values: CellValue[]): string {
  return values.map(formatCellLiteral).join(',');
}
