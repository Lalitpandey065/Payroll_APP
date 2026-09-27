module.exports = `
CREATE TABLE IF NOT EXISTS setup_epf (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE REFERENCES companies(id),
  -- EPF Office Details
  epf_state TEXT,
  epf_district TEXT,
  epf_number TEXT,
  epf_office TEXT,
  epf_office_address TEXT,
  -- Wage Ceilings
  fps_wage REAL NOT NULL DEFAULT 15000,
  fps_amount REAL NOT NULL DEFAULT 1250,
  edli_wage REAL NOT NULL DEFAULT 15000,
  -- Contribution Rates
  epf_ac01_pct REAL NOT NULL DEFAULT 12.00,    -- EPF Employee A/C-01
  fps_ac10_pct REAL NOT NULL DEFAULT 8.33,     -- FPS/EPS A/C-10
  eps_ac01_pct REAL NOT NULL DEFAULT 3.67,     -- Employer EPF A/C-01 (12 - 8.33)
  admin_ac02_pct REAL NOT NULL DEFAULT 0.50,   -- Admin charges A/C-02
  edli_ac21_pct REAL NOT NULL DEFAULT 0.50,    -- EDLI A/C-21
  edli_ac22_pct REAL NOT NULL DEFAULT 0.00,    -- EDLI A/C-22
  -- Calculation Options
  epf_calc_on_full INTEGER NOT NULL DEFAULT 1, -- 1=Yes (calc on full wage, not capped)
  fps_calc_full INTEGER NOT NULL DEFAULT 1,    -- 1=Yes
  -- Signatory
  auth_signatory TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT
);
`;
