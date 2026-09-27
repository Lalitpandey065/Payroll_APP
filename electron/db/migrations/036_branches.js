module.exports = `
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  epf_status TEXT DEFAULT 'No',
  epf_coverage_date TEXT DEFAULT '',
  epf_state TEXT DEFAULT '',
  epf_district TEXT DEFAULT '',
  epf_number TEXT DEFAULT '',
  epf_office_address TEXT DEFAULT '',
  esi_status TEXT DEFAULT 'No',
  esi_coverage_date TEXT DEFAULT '',
  esic_number TEXT DEFAULT '',
  esic_office_address TEXT DEFAULT '',
  lwf_status TEXT DEFAULT 'No',
  lwf_coverage_date TEXT DEFAULT '',
  prof_tax_status TEXT DEFAULT 'No',
  prof_tax_coverage_date TEXT DEFAULT '',
  state TEXT DEFAULT '',
  ot_percentage REAL DEFAULT 0,
  ot_allowances TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, name)
);
CREATE INDEX IF NOT EXISTS idx_branch_company ON branches(company_id);
`;
