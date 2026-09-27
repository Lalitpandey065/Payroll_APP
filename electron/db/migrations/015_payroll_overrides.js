module.exports = `
CREATE TABLE IF NOT EXISTS payroll_overrides (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES payroll_runs(id),
  emp_id TEXT NOT NULL REFERENCES employees(id),
  override_type TEXT NOT NULL, -- bonus|incentive|advance_recovery|loan_deduction|arrear|custom_earning|custom_deduction
  label TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0, -- positive=earning, negative=deduction
  is_taxable INTEGER NOT NULL DEFAULT 0,
  is_shown_on_payslip INTEGER NOT NULL DEFAULT 1,
  is_pf_wage INTEGER NOT NULL DEFAULT 0,
  is_esi_wage INTEGER NOT NULL DEFAULT 0,
  remarks TEXT,
  added_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
