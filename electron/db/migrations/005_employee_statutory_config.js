module.exports = `
-- LAYER 2: Per-employee statutory flags
CREATE TABLE IF NOT EXISTS employee_statutory_config (
  id TEXT PRIMARY KEY,
  emp_id TEXT NOT NULL UNIQUE REFERENCES employees(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  -- PF
  is_pf_enabled INTEGER NOT NULL DEFAULT 1,
  pf_contribution_type TEXT NOT NULL DEFAULT 'statutory', -- statutory|voluntary|nil
  voluntary_pf_pct REAL NOT NULL DEFAULT 0,
  is_pf_er_contribution INTEGER NOT NULL DEFAULT 1,
  pf_joining_date TEXT,
  pf_exemption_reason TEXT,
  -- ESI
  is_esi_enabled INTEGER NOT NULL DEFAULT 1,
  esi_joining_date TEXT,
  esi_dispensary TEXT,
  esi_exemption_reason TEXT,
  -- TDS
  is_tds_enabled INTEGER NOT NULL DEFAULT 1,
  tds_regime TEXT NOT NULL DEFAULT 'new', -- old|new
  tds_declaration_submitted INTEGER NOT NULL DEFAULT 0,
  tds_no_deduction_cert INTEGER NOT NULL DEFAULT 0,
  -- PT
  is_pt_enabled INTEGER NOT NULL DEFAULT 1,
  pt_state_override TEXT,
  pt_exemption_reason TEXT,
  -- OT
  is_ot_applicable INTEGER NOT NULL DEFAULT 0,
  ot_multiplier REAL NOT NULL DEFAULT 1.5,
  ot_calc_basis TEXT NOT NULL DEFAULT 'basic', -- basic|gross
  -- Gratuity
  is_gratuity_applicable INTEGER NOT NULL DEFAULT 1,
  gratuity_eligible_from TEXT,
  -- Bonus
  is_bonus_applicable INTEGER NOT NULL DEFAULT 0,
  bonus_eligibility_start TEXT,
  -- LWF
  is_lwf_enabled INTEGER NOT NULL DEFAULT 0,
  -- Advance
  is_advance_recovery_active INTEGER NOT NULL DEFAULT 0,
  advance_outstanding REAL NOT NULL DEFAULT 0,
  advance_monthly_deduction REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_estatutory_company ON employee_statutory_config(company_id);
`;
