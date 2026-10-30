import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads runs/2026-10-28.jsonl: 5 jobs, 1 bad line', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night).not.toBeNull();
    expect(night!.badLines).toBe(1);
    expect(night!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts runs, retries, last status and last error per job', () => {
    const rows = readNight('runs', '2026-10-28')!.rows;
    const byJob = Object.fromEntries(rows.map((r) => [r.job, r]));
    expect(byJob['fixtures/refresh']).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(byJob['lane/sync']).toMatchObject({ runs: 8, retries: 1, lastStatus: 'ok', firstAt: '2026-10-28T23:00:06+01:00', lastAt: '2026-10-29T05:00:04+01:00' });
    expect(byJob['notes/backup']).toMatchObject({ runs: 1, lastStatus: 'fail', lastError: 'quota exceeded' });
    expect(byJob['digest/render']).toMatchObject({ owner: null, runs: 1, lastError: null });
  });

  it('a missing night is null, an empty one has no rows, a bad name is null', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    expect(readNight(dir, '2026-01-02')).toBeNull();
    expect(readNight(dir, '2026-01-01')).toEqual({ night: '2026-01-01', rows: [], badLines: 0 });
  });

  it('a night that is not YYYY-MM-DD is null, even when the path exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    mkdirSync(join(dir, 'runs'));
    writeFileSync(join(dir, 'secret.jsonl'), '{"at":"x","job":"a","status":"ok","owner":null}\n');
    expect(readNight(join(dir, 'runs'), '../secret')).toBeNull();
  });

  it('counts lines with a bad shape as bad, keeps the rest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(
      join(dir, '2026-01-01.jsonl'),
      [
        '{"at":"2026-01-01T01:00:00+01:00","job":"a","status":"ok","owner":"x"}',
        '{"at":"2026-01-01T01:00:00+01:00","job":"b","status":"done","owner":"x"}',
        '[1,2]',
        '{"at":"2026-01-01T01',
        '{"at":"2026-01-01T02:00:00+01:00","job":"c","status":"retry","owner":"x","error":"first"}',
        '{"at":"2026-01-01T02:01:00+01:00","job":"c","status":"fail","owner":"x","error":"second"}',
      ].join('\n'),
    );
    const n = readNight(dir, '2026-01-01')!;
    expect(n.badLines).toBe(3);
    expect(n.rows.map((r) => r.job)).toEqual(['a', 'c']);
    expect(n.rows[1]).toMatchObject({ lastStatus: 'fail', lastError: 'second' });
  });
});
