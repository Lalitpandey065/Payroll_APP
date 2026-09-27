module.exports = `
CREATE TABLE IF NOT EXISTS designations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  profile TEXT DEFAULT '',
  category TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, name)
);
CREATE INDEX IF NOT EXISTS idx_desig_company ON designations(company_id);
`;
