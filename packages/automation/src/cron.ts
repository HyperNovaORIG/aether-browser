/**
 * Minimal 5-field POSIX-style cron parser (minute hour day month weekday).
 * Supports `*`, `*\/N`, comma lists, ranges and concrete numbers. Sufficient
 * for the MVP — full RFC-5545 RRULE support will arrive with the Pro tier.
 */

export interface CronExpression {
  minute: Set<number>;
  hour: Set<number>;
  day: Set<number>;
  month: Set<number>;
  weekday: Set<number>;
}

const RANGES = {
  minute: [0, 59],
  hour: [0, 23],
  day: [1, 31],
  month: [1, 12],
  weekday: [0, 6],
} as const;

export function parseCron(expression: string): CronExpression {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`cron expression must have 5 fields, got ${parts.length}: "${expression}"`);
  }
  const [m, h, d, mo, w] = parts;
  return {
    minute: parseField(m, ...RANGES.minute),
    hour: parseField(h, ...RANGES.hour),
    day: parseField(d, ...RANGES.day),
    month: parseField(mo, ...RANGES.month),
    weekday: parseField(w, ...RANGES.weekday),
  };
}

export function matches(expr: CronExpression, date: Date): boolean {
  return (
    expr.minute.has(date.getMinutes()) &&
    expr.hour.has(date.getHours()) &&
    expr.day.has(date.getDate()) &&
    expr.month.has(date.getMonth() + 1) &&
    expr.weekday.has(date.getDay())
  );
}

export function nextRun(expression: string, from: Date = new Date()): Date {
  const expr = parseCron(expression);
  const candidate = new Date(from.getTime());
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);
  for (let i = 0; i < 60 * 24 * 366 * 4; i++) {
    if (matches(expr, candidate)) return candidate;
    candidate.setMinutes(candidate.getMinutes() + 1);
  }
  throw new Error(`No cron match within 4 years for "${expression}"`);
}

function parseField(field: string, min: number, max: number): Set<number> {
  const result = new Set<number>();
  for (const part of field.split(",")) {
    if (part === "*") {
      for (let i = min; i <= max; i++) result.add(i);
      continue;
    }
    const stepMatch = part.match(/^(\*|\d+(?:-\d+)?)\/(\d+)$/);
    if (stepMatch) {
      const [, range, stepStr] = stepMatch;
      const step = Number(stepStr);
      const [start, end] =
        range === "*" ? [min, max] : range.includes("-") ? range.split("-").map(Number) : [Number(range), max];
      for (let i = start; i <= end; i += step) result.add(i);
      continue;
    }
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      for (let i = start; i <= end; i++) result.add(i);
      continue;
    }
    result.add(Number(part));
  }
  return result;
}
