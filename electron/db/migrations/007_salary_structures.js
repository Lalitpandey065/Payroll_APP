module.exports = `
CREATE TABLE IF NOT EXISTS salary_structures (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  description TEXT,
  is_ctc_based INTEGER NOT NULL DEFAULT 1,
  default_ctc REAL NOT NULL DEFAULT 0,
  applicable_employment_types TEXT, -- JSON array
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  synced INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_structures_company ON salary_structures(company_id);
`;
