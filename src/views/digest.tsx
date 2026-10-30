import type { DigestRow, Night } from '../digest/types.js';

const dash = '—';

function warnIf(on: boolean): string | undefined {
  return on ? 'warn' : undefined;
}

function Row({ row }: { row: DigestRow }) {
  const retriesWarn = row.retries >= 3;
  const failWarn = row.fails > 0 || row.lastStatus === 'fail';
  return (
    <tr class={warnIf(retriesWarn || failWarn)}>
      <td>{row.job}</td>
      <td>{row.owner ?? dash}</td>
      <td>{row.runs}</td>
      <td class={warnIf(retriesWarn)}>{row.retries}</td>
      <td class={warnIf(failWarn)}>{row.fails}</td>
      <td class={warnIf(failWarn)}>{row.lastStatus}</td>
      <td>{row.lastError ?? dash}</td>
      <td>{row.firstAt}</td>
      <td>{row.lastAt}</td>
    </tr>
  );
}

export function DigestPage({ night }: { night: Night }) {
  return (
    <>
      <h1>digest · {night.night}</h1>
      {night.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>fails</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {night.rows.map((row) => (
              <Row row={row} />
            ))}
          </tbody>
        </table>
      )}
      {night.badLines > 0 && (
        <p class="mute">
          {night.badLines} {night.badLines === 1 ? 'line did' : 'lines did'} not parse
        </p>
      )}
    </>
  );
}

export function DigestMissing({ night }: { night: string }) {
  return (
    <>
      <h1>digest · {night}</h1>
      <p class="warn">no run log for {night}</p>
    </>
  );
}
