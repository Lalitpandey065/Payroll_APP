module.exports = `
CREATE TABLE IF NOT EXISTS employee_investment_declaration (
  id TEXT PRIMARY KEY,
  emp_id TEXT NOT NULL REFERENCES employees(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  fin_year TEXT NOT NULL,
  declaration_date TEXT,
  is_final INTEGER NOT NULL DEFAULT 0,
  -- 80C (max 150000)
  epf_employee REAL NOT NULL DEFAULT 0,
  ppf REAL NOT NULL DEFAULT 0,
  elss REAL NOT NULL DEFAULT 0,
  lic_premium REAL NOT NULL DEFAULT 0,
  nsc REAL NOT NULL DEFAULT 0,
  home_loan_principal REAL NOT NULL DEFAULT 0,
  tuition_fees REAL NOT NULL DEFAULT 0,
  sukanya_samriddhi REAL NOT NULL DEFAULT 0,
  other_80c REAL NOT NULL DEFAULT 0,
  total_80c REAL NOT NULL DEFAULT 0,
  -- 80D
  medical_insurance_self REAL NOT NULL DEFAULT 0,
  medical_insurance_parents REAL NOT NULL DEFAULT 0,
  preventive_health_checkup REAL NOT NULL DEFAULT 0,
  total_80d REAL NOT NULL DEFAULT 0,
  -- HRA
  rent_paid_annual REAL NOT NULL DEFAULT 0,
  rent_city_type TEXT NOT NULL DEFAULT 'non_metro',
  is_renting INTEGER NOT NULL DEFAULT 0,
  hra_exemption REAL NOT NULL DEFAULT 0,
  -- LTA
  lta_claimed REAL NOT NULL DEFAULT 0,
  -- Other
  section_80e REAL NOT NULL DEFAULT 0,
  section_80g REAL NOT NULL DEFAULT 0,
  section_80gg REAL NOT NULL DEFAULT 0,
  section_24b REAL NOT NULL DEFAULT 0,
  nps_80ccd REAL NOT NULL DEFAULT 0,
  total_deductions REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(emp_id, fin_year)
);
`;
