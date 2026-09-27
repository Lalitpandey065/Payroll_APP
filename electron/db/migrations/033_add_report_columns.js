module.exports = `
  ALTER TABLE payroll_details ADD COLUMN basic_earned REAL NOT NULL DEFAULT 0;
  ALTER TABLE payroll_details ADD COLUMN hra_earned REAL NOT NULL DEFAULT 0;
  ALTER TABLE payroll_details ADD COLUMN convey_earned REAL NOT NULL DEFAULT 0;
  ALTER TABLE payroll_details ADD COLUMN spl_all_earned REAL NOT NULL DEFAULT 0;
  ALTER TABLE payroll_details ADD COLUMN ot_earned REAL NOT NULL DEFAULT 0;
  ALTER TABLE payroll_details ADD COLUMN gross_earned REAL NOT NULL DEFAULT 0;
  ALTER TABLE payroll_details ADD COLUMN net_pay REAL NOT NULL DEFAULT 0;
  ALTER TABLE payroll_details ADD COLUMN epf_employee REAL NOT NULL DEFAULT 0;
  ALTER TABLE payroll_details ADD COLUMN esic_employee REAL NOT NULL DEFAULT 0;
  ALTER TABLE payroll_details ADD COLUMN prof_tax REAL NOT NULL DEFAULT 0;
  ALTER TABLE payroll_details ADD COLUMN advance REAL NOT NULL DEFAULT 0;
  ALTER TABLE payroll_details ADD COLUMN loan REAL NOT NULL DEFAULT 0;
  ALTER TABLE payroll_details ADD COLUMN food REAL NOT NULL DEFAULT 0;
  ALTER TABLE payroll_details ADD COLUMN vol_epf REAL NOT NULL DEFAULT 0;
`;
