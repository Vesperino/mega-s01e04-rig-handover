// Plan morning-digest § 1. The contract section 2 builds against: the page, the JSON, the board
// link and the route tests all read a night through readNight and nothing else.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing at the edge.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job. Times keep the offset from the log, as written.
export type DigestRow = {
  job: string;
  owner: string | null; // null renders as "—"
  runs: number; // lines for this job
  retries: number; // lines with status "retry"
  fails: number; // lines with status "fail" (ok lines = runs - retries - fails)
  lastStatus: RunStatus;
  lastError: string | null; // most recent error on any line of this job
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse; counted, never thrown
};

// null when runs/<night>.jsonl does not exist (the routes answer 404). An empty file is a Night
// with no rows. Implemented as `readNight` in src/digest/read.ts.
export type ReadNight = (runsDir: string, night: string) => Night | null;
