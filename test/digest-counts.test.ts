import { describe, expect, it } from 'vitest';
import { nightCounts } from '../src/digest/counts.js';
import type { DigestRow } from '../src/digest/types.js';

const row = (runs: number, retries: number, fails: number): DigestRow => ({
  job: 'j', owner: null, runs, retries, fails, lastStatus: 'ok', lastError: null, firstAt: 'a', lastAt: 'b',
});

describe('nightCounts', () => {
  it('counts run lines by status across rows', () => {
    expect(nightCounts([row(5, 2, 1), row(6, 2, 0)])).toEqual({ ok: 6, retry: 4, fail: 1 });
  });
  it('is zero for no rows', () => {
    expect(nightCounts([])).toEqual({ ok: 0, retry: 0, fail: 0 });
  });
});
