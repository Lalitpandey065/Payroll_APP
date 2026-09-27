module.exports = `
CREATE TABLE IF NOT EXISTS setup_esi (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE REFERENCES companies(id),
  -- ESIC Registration
  esic_number TEXT,
  esic_office TEXT,
  esic_office_address TEXT,
  -- Wage & Rates
  esic_wage_ceiling REAL NOT NULL DEFAULT 21000,
  employee_pct REAL NOT NULL DEFAULT 0.75,
  employer_pct REAL NOT NULL DEFAULT 3.25,
  -- Employer / Signatory Details
  employer_name TEXT,
  employer_designation TEXT,
  employer_address TEXT,
  auth_signatory TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT
);
`;
