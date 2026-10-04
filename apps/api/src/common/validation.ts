import { BadRequestException } from '@nestjs/common';
export function invalid(message: string): never {
  throw new BadRequestException({ code: 'INVALID_INPUT', message });
}
export function objectBody(input: unknown, allowed: string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('Send a JSON object.');
  const body = input as Record<string, unknown>;
  const extra = Object.keys(body).filter(key => !allowed.includes(key));
  if (extra.length) invalid(`Unsupported field(s): ${extra.join(', ')}.`);
  return body;
}
export function text(input: unknown, name: string, max = 200, trim = true): string {
  if (typeof input !== 'string') invalid(`${name} must be text.`);
  const value = trim ? input.trim() : input;
  if (!value || value.length > max) invalid(`${name} must contain 1 to ${max} characters.`);
  return value;
}
export function integer(input: unknown, name: string, min = 0, max = 100000): number {
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < min || input > max) invalid(`${name} must be an integer from ${min} to ${max}.`);
  return input;
}
export function isoDate(input: unknown): string {
  const value = text(input, 'requestedDate', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid('Use a date in YYYY-MM-DD format.');
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) invalid('The requested date is invalid.');
  return value;
}
