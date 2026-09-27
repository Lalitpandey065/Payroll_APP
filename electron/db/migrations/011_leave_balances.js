module.exports = `
CREATE TABLE IF NOT EXISTS leave_balances (
  id TEXT PRIMARY KEY,
  emp_id TEXT NOT NULL REFERENCES employees(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id),
  fin_year TEXT NOT NULL,
  opening_balance REAL NOT NULL DEFAULT 0,
  accrued REAL NOT NULL DEFAULT 0,
  taken REAL NOT NULL DEFAULT 0,
  lop_days REAL NOT NULL DEFAULT 0,
  encashed REAL NOT NULL DEFAULT 0,
  closing_balance REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(emp_id, leave_type_id, fin_year)
);
`;
