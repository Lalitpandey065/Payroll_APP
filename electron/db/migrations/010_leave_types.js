module.exports = `
CREATE TABLE IF NOT EXISTS leave_types (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  code TEXT NOT NULL,  -- PL|SL|CL|LWP|ML
  name TEXT NOT NULL,
  is_paid INTEGER NOT NULL DEFAULT 1,
  is_carry_forward_allowed INTEGER NOT NULL DEFAULT 0,
  max_carry_forward_days REAL NOT NULL DEFAULT 0,
  accrual_type TEXT NOT NULL DEFAULT 'annual',
  annual_entitlement REAL NOT NULL DEFAULT 0,
  encashable INTEGER NOT NULL DEFAULT 0,
  include_in_lop INTEGER NOT NULL DEFAULT 0,
  gender_specific TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
