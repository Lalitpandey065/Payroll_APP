module.exports = `
-- LAYER 3: Per-component statutory flags
CREATE TABLE IF NOT EXISTS salary_components (
  id TEXT PRIMARY KEY,
  structure_id TEXT NOT NULL REFERENCES salary_structures(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,           -- BASIC | HRA | DA | SA | CONV | MED | LTA | OT | PF_EMP etc.
  component_type TEXT NOT NULL, -- earning | deduction | employer_contribution | informational
  calc_type TEXT NOT NULL,      -- fixed | pct_basic | pct_ctc | pct_gross | formula | statutory
  calc_value TEXT,              -- number or formula string referencing other component codes
  statutory_type TEXT,          -- pf_employee|pf_employer|esi_employee|esi_employer|tds|pt|gratuity|bonus
  -- STATUTORY FLAGS (Layer 3)
  is_pf_wage INTEGER NOT NULL DEFAULT 0,    -- 1 = Basic YES, HRA NO
  is_esi_wage INTEGER NOT NULL DEFAULT 0,   -- 1 = most earnings YES
  is_taxable INTEGER NOT NULL DEFAULT 1,    -- 1 = included in TDS computation
  is_exempted INTEGER NOT NULL DEFAULT 0,   -- 1 = has tax exemption (HRA, LTA)
  exemption_type TEXT,                       -- hra|lta|conveyance|medical
  exemption_limit REAL NOT NULL DEFAULT 0,
  -- COMPUTATION FLAGS
  is_pro_rated INTEGER NOT NULL DEFAULT 1,  -- 1 = reduced on LOP
  is_ot_included INTEGER NOT NULL DEFAULT 0,
  is_arrear_applicable INTEGER NOT NULL DEFAULT 1,
  -- DISPLAY FLAGS
  is_shown_on_payslip INTEGER NOT NULL DEFAULT 1,
  is_included_in_ctc INTEGER NOT NULL DEFAULT 1,
  display_label TEXT,
  display_order INTEGER NOT NULL DEFAULT 10,
  min_value REAL NOT NULL DEFAULT 0,
  max_value REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_components_structure ON salary_components(structure_id);
`;
