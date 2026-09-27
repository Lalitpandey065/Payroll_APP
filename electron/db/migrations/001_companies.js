module.exports = `
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  pan TEXT NOT NULL UNIQUE,
  tan TEXT,
  cin TEXT,
  gstin TEXT,
  industry_type TEXT DEFAULT 'services',
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_code TEXT NOT NULL,
  pincode TEXT,
  phone TEXT,
  email TEXT,
  logo_path TEXT,
  fin_year_start_month INTEGER NOT NULL DEFAULT 4,
  working_days_per_week INTEGER NOT NULL DEFAULT 6,
  working_hours_per_day INTEGER NOT NULL DEFAULT 8,
  payroll_cycle TEXT NOT NULL DEFAULT 'monthly',
  payroll_run_day INTEGER NOT NULL DEFAULT 28,
  -- STATUTORY FLAGS (Layer 1)
  is_pf_registered INTEGER NOT NULL DEFAULT 0,
  pf_reg_number TEXT,
  pf_establishment_id TEXT,
  is_esi_registered INTEGER NOT NULL DEFAULT 0,
  esi_code TEXT,
  is_pt_applicable INTEGER NOT NULL DEFAULT 0,
  pt_reg_number TEXT,
  is_tds_deductor INTEGER NOT NULL DEFAULT 0,
  is_lwf_applicable INTEGER NOT NULL DEFAULT 0,
  is_gratuity_applicable INTEGER NOT NULL DEFAULT 1,
  is_bonus_applicable INTEGER NOT NULL DEFAULT 0,
  -- CLOUD
  cloud_sync_enabled INTEGER NOT NULL DEFAULT 0,
  supabase_company_id TEXT,
  -- AUDIT
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT,
  synced INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_companies_pan ON companies(pan);
`;
