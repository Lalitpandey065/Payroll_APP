module.exports = `
ALTER TABLE employees ADD COLUMN father_name TEXT DEFAULT '';

ALTER TABLE employee_statutory_config ADD COLUMN esi_limit REAL DEFAULT 21000;
ALTER TABLE employee_statutory_config ADD COLUMN pension_applicable TEXT DEFAULT 'No';
ALTER TABLE employee_statutory_config ADD COLUMN edli_applicable TEXT DEFAULT 'No';
ALTER TABLE employee_statutory_config ADD COLUMN lwf_applicable TEXT DEFAULT 'No';
ALTER TABLE employee_statutory_config ADD COLUMN pt_applicable TEXT DEFAULT 'No';

ALTER TABLE employee_salary ADD COLUMN salary_type TEXT DEFAULT 'Month';
ALTER TABLE employee_salary ADD COLUMN ot_type TEXT DEFAULT 'Salary';

ALTER TABLE employee_identity ADD COLUMN lwf_no TEXT DEFAULT '';
ALTER TABLE employee_identity ADD COLUMN ptax_no TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS dm_deductions (
  id TEXT PRIMARY KEY,
  emp_id TEXT NOT NULL UNIQUE REFERENCES employees(id),
  company_id TEXT NOT NULL,
  advance REAL DEFAULT 0,
  loan REAL DEFAULT 0,
  tds REAL DEFAULT 0,
  vol_pf REAL DEFAULT 0,
  vol_pf_percent REAL DEFAULT 0,
  food REAL DEFAULT 0,
  transport REAL DEFAULT 0,
  ded_03 REAL DEFAULT 0,
  ded_04 REAL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
)
`;
