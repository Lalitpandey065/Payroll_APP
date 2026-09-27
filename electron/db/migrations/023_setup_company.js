module.exports = `
CREATE TABLE IF NOT EXISTS setup_company (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE REFERENCES companies(id),
  telephone TEXT,
  email TEXT,
  state_code TEXT,
  logo_path TEXT,
  fy_start INTEGER NOT NULL DEFAULT 2026,
  fy_close INTEGER NOT NULL DEFAULT 2027,
  epf_status INTEGER NOT NULL DEFAULT 1,
  epf_coverage_date TEXT,
  fps_status INTEGER NOT NULL DEFAULT 1,
  fps_coverage_date TEXT,
  edli_status INTEGER NOT NULL DEFAULT 1,
  edli_coverage_date TEXT,
  esi_status INTEGER NOT NULL DEFAULT 1,
  esi_coverage_date TEXT,
  lwf_status INTEGER NOT NULL DEFAULT 0,
  lwf_coverage_date TEXT,
  pt_status INTEGER NOT NULL DEFAULT 0,
  pt_coverage_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT
);
`;
