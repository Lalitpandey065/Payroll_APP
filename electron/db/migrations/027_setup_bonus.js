module.exports = `
CREATE TABLE IF NOT EXISTS setup_bonus (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE REFERENCES companies(id),
  bonus_pct REAL NOT NULL DEFAULT 8.33,           -- Statutory minimum 8.33%
  min_working_days INTEGER NOT NULL DEFAULT 30,   -- Minimum days to be eligible
  bonus_limit REAL NOT NULL DEFAULT 7000,         -- Wage ceiling for bonus calc (₹7,000/month)
  payment_limit REAL NOT NULL DEFAULT 21000,      -- Max salary to be eligible for bonus
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT
);
`;
