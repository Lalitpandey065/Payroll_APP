module.exports = `
CREATE TABLE IF NOT EXISTS employee_identity (
  id TEXT PRIMARY KEY,
  emp_id TEXT NOT NULL UNIQUE REFERENCES employees(id),
  pan TEXT,
  pan_verified INTEGER NOT NULL DEFAULT 0,
  aadhaar_last4 TEXT,
  uan TEXT,
  pf_account_number TEXT,
  esi_insurance_number TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  account_type TEXT DEFAULT 'savings',
  phone_primary TEXT,
  phone_alternate TEXT,
  email_personal TEXT,
  email_official TEXT,
  address_current TEXT,    -- JSON
  address_permanent TEXT,  -- JSON
  emergency_contact TEXT,  -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT
);
`;
