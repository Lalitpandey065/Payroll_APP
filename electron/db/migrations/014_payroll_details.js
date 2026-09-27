module.exports = `
CREATE TABLE IF NOT EXISTS payroll_details (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES payroll_runs(id),
  emp_id TEXT NOT NULL REFERENCES employees(id),
  -- snapshots
  emp_code TEXT NOT NULL,
  emp_name TEXT NOT NULL,
  department TEXT,
  designation TEXT,
  structure_id TEXT NOT NULL,
  ctc REAL NOT NULL DEFAULT 0,
  pan TEXT,
  uan TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  tds_regime TEXT,
  -- attendance
  working_days INTEGER NOT NULL DEFAULT 0,
  present_days REAL NOT NULL DEFAULT 0,
  paid_leave_days REAL NOT NULL DEFAULT 0,
  lop_days REAL NOT NULL DEFAULT 0,
  ot_hours REAL NOT NULL DEFAULT 0,
  -- earnings
  basic REAL NOT NULL DEFAULT 0,
  hra REAL NOT NULL DEFAULT 0,
  da REAL NOT NULL DEFAULT 0,
  conveyance REAL NOT NULL DEFAULT 0,
  medical_allowance REAL NOT NULL DEFAULT 0,
  special_allowance REAL NOT NULL DEFAULT 0,
  lta REAL NOT NULL DEFAULT 0,
  ot_amount REAL NOT NULL DEFAULT 0,
  other_earnings_json TEXT,
  gross_salary REAL NOT NULL DEFAULT 0,
  -- deductions
  lop_deduction REAL NOT NULL DEFAULT 0,
  pf_employee REAL NOT NULL DEFAULT 0,
  pf_employer REAL NOT NULL DEFAULT 0,
  eps_contribution REAL NOT NULL DEFAULT 0,
  edli_contribution REAL NOT NULL DEFAULT 0,
  esi_employee REAL NOT NULL DEFAULT 0,
  esi_employer REAL NOT NULL DEFAULT 0,
  tds REAL NOT NULL DEFAULT 0,
  pt REAL NOT NULL DEFAULT 0,
  lwf_employee REAL NOT NULL DEFAULT 0,
  lwf_employer REAL NOT NULL DEFAULT 0,
  advance_recovery REAL NOT NULL DEFAULT 0,
  other_deductions_json TEXT,
  total_deductions REAL NOT NULL DEFAULT 0,
  net_salary REAL NOT NULL DEFAULT 0,
  -- YTD
  ytd_gross REAL NOT NULL DEFAULT 0,
  ytd_pf_employee REAL NOT NULL DEFAULT 0,
  ytd_esi_employee REAL NOT NULL DEFAULT 0,
  ytd_tds REAL NOT NULL DEFAULT 0,
  ytd_pt REAL NOT NULL DEFAULT 0,
  ytd_net REAL NOT NULL DEFAULT 0,
  -- flags (snapshot)
  is_pf_deducted INTEGER NOT NULL DEFAULT 0,
  is_esi_deducted INTEGER NOT NULL DEFAULT 0,
  is_tds_deducted INTEGER NOT NULL DEFAULT 0,
  is_pt_deducted INTEGER NOT NULL DEFAULT 0,
  esi_ceiling_crossed INTEGER NOT NULL DEFAULT 0,
  -- full breakdown
  components_json TEXT NOT NULL,
  computation_log TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(run_id, emp_id)
);
CREATE INDEX IF NOT EXISTS idx_details_run ON payroll_details(run_id);
CREATE INDEX IF NOT EXISTS idx_details_emp ON payroll_details(emp_id);
`;
