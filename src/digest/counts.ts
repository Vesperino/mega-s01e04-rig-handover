import type { DigestRow } from './types.js';

export type NightCounts = { ok: number; retry: number; fail: number };

// Counts of run lines by status, summed over a night's rows.
export function nightCounts(rows: DigestRow[]): NightCounts {
  const c: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const r of rows) {
    c.retry += r.retries;
    c.fail += r.fails;
    c.ok += r.runs - r.retries - r.fails;
  }
  return c;
}
