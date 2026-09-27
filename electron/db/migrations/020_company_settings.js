module.exports = `
CREATE TABLE IF NOT EXISTS company_settings (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  key TEXT NOT NULL,
  value TEXT,
  value_type TEXT NOT NULL DEFAULT 'string',
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id, key)
);
`;
