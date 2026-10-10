import { BadRequestException } from '@nestjs/common';

function parseIntParam(raw: string | undefined, name: string, min: number, max: number): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (!/^\d+$/.test(String(raw))) throw new BadRequestException(`${name} inválido`);
  const value = parseInt(String(raw), 10);
  if (value < min || value > max) throw new BadRequestException(`${name} fuera de rango (${min}-${max})`);
  return value;
}

/** Validates the `year`/`month` query params; missing values fall back to the current month. */
export function parsePeriod(year?: string, month?: string, now: Date = new Date()): { year: number; month: number } {
  return {
    year: parseIntParam(year, 'year', 1970, 9999) ?? now.getFullYear(),
    month: parseIntParam(month, 'month', 1, 12) ?? now.getMonth() + 1,
  };
}
