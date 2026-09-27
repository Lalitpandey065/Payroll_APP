module.exports = `
CREATE TABLE IF NOT EXISTS setup_overtime (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE REFERENCES companies(id),
  -- Calculation Settings
  calculation_setting TEXT NOT NULL DEFAULT 'Grand',   -- Grand | Shift
  calculation_type TEXT NOT NULL DEFAULT 'Salary',     -- Salary | Daily | Hourly
  overtime_paid_pct REAL NOT NULL DEFAULT 2.00,        -- OT multiplier (2x for factory)
  -- Display in Salary Slip
  hours_print_in_salary INTEGER NOT NULL DEFAULT 1,    -- 1=Yes
  hours_heading TEXT NOT NULL DEFAULT 'OT.HR',
  amount_print_in_salary INTEGER NOT NULL DEFAULT 1,
  amount_heading TEXT NOT NULL DEFAULT 'OT.AMT',
  -- Statutory on OT
  epf_on_ot INTEGER NOT NULL DEFAULT 0,                -- 1=Yes, 0=No
  esi_on_ot INTEGER NOT NULL DEFAULT 1,
  esi_limit_on_ot INTEGER NOT NULL DEFAULT 1,          -- Apply ESI ceiling on OT wage
  -- Calculation Method
  special_calculation INTEGER NOT NULL DEFAULT 0,
  time_period_calculation TEXT NOT NULL DEFAULT 'Day', -- Day | Month
  hours_per_day REAL NOT NULL DEFAULT 8.00,
  wages_calculation TEXT NOT NULL DEFAULT 'Gross',     -- Gross | Basic
  -- Deductions in Net Pay (whether these are shown in net pay breakdown)
  epf_in_netpay INTEGER NOT NULL DEFAULT 0,
  esi_in_netpay INTEGER NOT NULL DEFAULT 0,
  lwf_in_netpay INTEGER NOT NULL DEFAULT 0,
  pt_in_netpay INTEGER NOT NULL DEFAULT 0,
  -- Allowances included in OT wage base (JSON array of component codes)
  ot_allowances_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT
);
`;
