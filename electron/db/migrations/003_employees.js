module.exports = `
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  emp_code TEXT NOT NULL,
  prefix TEXT,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  gender TEXT,
  dob TEXT,
  doj TEXT NOT NULL,
  dol TEXT,
  department TEXT,
  designation TEXT,
  grade TEXT,
  cost_centre TEXT,
  location TEXT,
  employment_type TEXT NOT NULL DEFAULT 'permanent', -- permanent|contract|intern|probation|part_time
  status TEXT NOT NULL DEFAULT 'active', -- active|inactive|on_notice|separated|absconded
  notice_period_days INTEGER,
  probation_end_date TEXT,
  reporting_manager_id TEXT,
  is_director INTEGER NOT NULL DEFAULT 0,
  is_disabled INTEGER NOT NULL DEFAULT 0,
  resident_status TEXT NOT NULL DEFAULT 'resident',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  synced INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT,
  UNIQUE(company_id, emp_code)
);
CREATE INDEX IF NOT EXISTS idx_emp_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_emp_status  ON employees(company_id, status);
`;
