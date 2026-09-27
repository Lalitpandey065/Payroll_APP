module.exports = `
CREATE TABLE IF NOT EXISTS setup_factory (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE REFERENCES companies(id),
  -- Factory Registration
  factory_license_number TEXT,
  district TEXT,
  manager_name TEXT,
  manager_address TEXT,
  nature_of_work TEXT,
  factory_start_date TEXT,
  factory_close_date TEXT,
  -- Wage Configuration
  wage_for_calculation REAL NOT NULL DEFAULT 0,    -- Wage used for calculations
  wage_limit REAL NOT NULL DEFAULT 0,              -- Wage upper limit
  minimum_wage REAL NOT NULL DEFAULT 0,            -- State minimum wage
  -- Compliance / Facilities Flags (Yes=1/No=0)
  safety_officer_required INTEGER NOT NULL DEFAULT 1,
  safety_officer_appointed INTEGER NOT NULL DEFAULT 0,
  ambulance_room INTEGER NOT NULL DEFAULT 0,
  canteen_provided INTEGER NOT NULL DEFAULT 0,
  canteen_managed INTEGER NOT NULL DEFAULT 0,
  rest_room_provided INTEGER NOT NULL DEFAULT 0,
  lunch_room_provided INTEGER NOT NULL DEFAULT 0,
  creches_provided INTEGER NOT NULL DEFAULT 0,
  welfare_officer_required INTEGER NOT NULL DEFAULT 1,
  welfare_officer_appointed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT
);
`;
