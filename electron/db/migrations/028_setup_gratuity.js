module.exports = `
CREATE TABLE IF NOT EXISTS setup_gratuity (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE REFERENCES companies(id),
  gratuity_days REAL NOT NULL DEFAULT 15.00,       -- Days per completed year (15)
  gratuity_divide REAL NOT NULL DEFAULT 26.00,     -- Working days divisor (26)
  maximum_limit REAL NOT NULL DEFAULT 2000000.00,  -- ₹20 Lakhs statutory max
  -- Formula: (Basic+DA) / gratuity_divide * gratuity_days * years_of_service
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT
);
`;
