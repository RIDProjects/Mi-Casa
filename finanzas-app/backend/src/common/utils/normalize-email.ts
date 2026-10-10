import { ILike } from 'typeorm';

export const normalizeEmail = (email: string): string => email?.trim().toLowerCase();

// class-transformer helper: trims + lowercases string emails, leaves other values to the validators.
export const trimLowerCase = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normalizeEmail(value) : value;

// Case-insensitive exact match for emails stored before normalization existed.
// ILike without wildcards; `%`, `_` and `\` are escaped so they match literally.
export const emailMatch = (email: string) =>
  ILike(normalizeEmail(email).replace(/[\\%_]/g, (c) => `\\${c}`));
