import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Fixtures live in a temp dir; runs/ is never read or written here.
const NORMAL = '2026-10-28';
const EMPTY = '2026-10-27';
const BAD = '2026-10-26';
const MISSING = '2026-10-25';

const normalLog = [
  '{"at":"2026-10-28T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"lane"}',
  '{"at":"2026-10-28T01:05:00+01:00","job":"digest/render","status":"ok","owner":null}',
  '{"at":"2026-10-28T02:00:00+01:00","job":"lane/sync","status":"retry","owner":"lane","error":"timeout"}',
  '{"at":"2026-10-28T03:00:00+01:00","job":"notes/backup","status":"fail","owner":"notes","error":"disk full"}',
  '',
].join('\n');

const badLog = [
  '{"at":"2026-10-26T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"lane"}',
  'this is not json',
  '{"at":"2026-10-26T03:00:00+01:00","job":"notes/backup","status":"ok","owner":"notes"}',
  '',
].join('\n');

type Night = { night: string; rows: Record<string, unknown>[]; badLines: number };
type NotFound = { error: string; night: string };

let runsDir = '';
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
  writeFileSync(join(runsDir, `${NORMAL}.jsonl`), normalLog, 'utf8');
  writeFileSync(join(runsDir, `${EMPTY}.jsonl`), '', 'utf8');
  writeFileSync(join(runsDir, `${BAD}.jsonl`), badLog, 'utf8');
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('GET /digest/:night', () => {
  it('200s a night with a file and renders its jobs in a table', async () => {
    const res = await app.request(`/digest/${NORMAL}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<table>');
    expect(html).toContain('<td>digest/render</td>');
    expect(html).toContain('<td>lane/sync</td>');
    expect(html).toContain('<td>disk full</td>');
    expect(html).not.toContain('nothing ran');
  });

  it('404s a night with no file', async () => {
    const res = await app.request(`/digest/${MISSING}`);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain(`no run log for ${MISSING}`);
  });

  it('200s the empty night with "nothing ran" and no table', async () => {
    const res = await app.request(`/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('nothing ran');
    expect(html).not.toContain('<table>');
  });

  it('200s a night with a bad line, keeps the good rows and says the line did not parse', async () => {
    const res = await app.request(`/digest/${BAD}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<td>lane/sync</td>');
    expect(html).toContain('<td>notes/backup</td>');
    expect(html).toContain('1 line did not parse');
  });
});

describe('GET /api/digest/:night', () => {
  it('200s a night with a file as { night, rows, badLines }', async () => {
    const res = await app.request(`/api/digest/${NORMAL}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body).toEqual({
      night: NORMAL,
      badLines: 0,
      rows: [
        {
          job: 'digest/render',
          owner: null,
          runs: 1,
          retries: 0,
          fails: 0,
          lastStatus: 'ok',
          lastError: null,
          firstAt: '2026-10-28T01:05:00+01:00',
          lastAt: '2026-10-28T01:05:00+01:00',
        },
        {
          job: 'lane/sync',
          owner: 'lane',
          runs: 2,
          retries: 1,
          fails: 0,
          lastStatus: 'retry',
          lastError: 'timeout',
          firstAt: '2026-10-28T01:00:00+01:00',
          lastAt: '2026-10-28T02:00:00+01:00',
        },
        {
          job: 'notes/backup',
          owner: 'notes',
          runs: 1,
          retries: 0,
          fails: 1,
          lastStatus: 'fail',
          lastError: 'disk full',
          firstAt: '2026-10-28T03:00:00+01:00',
          lastAt: '2026-10-28T03:00:00+01:00',
        },
      ],
    });
  });

  it('404s a night with no file as { error, night }', async () => {
    const res = await app.request(`/api/digest/${MISSING}`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no run log', night: MISSING } satisfies NotFound);
  });

  it('200s the empty night with no rows and no bad lines', async () => {
    const res = await app.request(`/api/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: EMPTY, rows: [], badLines: 0 } satisfies Night);
  });

  it('200s a night with a bad line, counts it and keeps the good rows', async () => {
    const res = await app.request(`/api/digest/${BAD}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['lane/sync', 'notes/backup']);
  });
});
