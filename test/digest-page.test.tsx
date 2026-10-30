import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

async function page(path: string) {
  const res = await createApp(config).request(path);
  return { status: res.status, html: await res.text() };
}

function rowOf(html: string, job: string): string {
  const m = html.match(new RegExp(`<tr[^>]*>(?:(?!</tr>).)*<td>${job}</td>(?:(?!</tr>).)*</tr>`, 's'));
  if (!m) throw new Error(`no row for ${job}`);
  return m[0];
}

describe('GET /digest/:night', () => {
  it('renders every job, with — for a missing owner', async () => {
    const { status, html } = await page('/digest/2026-10-28');
    expect(status).toBe(200);
    for (const job of ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs']) {
      expect(html).toContain(`<td>${job}</td>`);
    }
    expect(rowOf(html, 'digest/render')).toContain('<td>—</td>');
    expect(html).toContain('<td>digest/render</td><td>—</td>');
  });

  it('marks retries >= 3 and fails, and leaves clean rows alone', async () => {
    const { html } = await page('/digest/2026-10-28');
    expect(rowOf(html, 'fixtures/refresh')).toContain('<tr class="warn">');
    expect(rowOf(html, 'fixtures/refresh')).toContain('<td class="warn">3</td>');
    expect(rowOf(html, 'notes/backup')).toContain('<tr class="warn">');
    expect(rowOf(html, 'notes/backup')).toContain('<td class="warn">fail</td>');
    expect(rowOf(html, 'rig/rotate-logs')).not.toContain('warn');
  });

  it('404s a night with no file', async () => {
    const { status, html } = await page('/digest/2099-01-01');
    expect(status).toBe(404);
    expect(html).toContain('no run log for 2099-01-01');
  });
});
