module.exports = `
CREATE TABLE IF NOT EXISTS statutory_tds_config (
  id TEXT PRIMARY KEY,
  fin_year TEXT NOT NULL,
  regime TEXT NOT NULL,
  standard_deduction REAL NOT NULL DEFAULT 0,
  slabs_json TEXT NOT NULL,
  surcharge_json TEXT NOT NULL DEFAULT '[]',
  cess_pct REAL NOT NULL DEFAULT 4,
  rebate_87a_limit REAL NOT NULL DEFAULT 0,
  rebate_87a_amount REAL NOT NULL DEFAULT 0,
  senior_citizen_age INTEGER NOT NULL DEFAULT 60,
  super_senior_age INTEGER NOT NULL DEFAULT 80,
  effective_from TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- FY 2025-26 New Regime
INSERT INTO statutory_tds_config VALUES
('tds-2526-new','2025-26','new',75000,
'[{"min":0,"max":400000,"rate":0},{"min":400000,"max":800000,"rate":5},{"min":800000,"max":1200000,"rate":10},{"min":1200000,"max":1600000,"rate":15},{"min":1600000,"max":2000000,"rate":20},{"min":2000000,"max":2400000,"rate":25},{"min":2400000,"max":null,"rate":30}]',
'[{"income_above":5000000,"surcharge_pct":10},{"income_above":10000000,"surcharge_pct":15},{"income_above":20000000,"surcharge_pct":25}]',
4,1200000,60000,60,80,'2025-04-01',datetime('now'));
-- FY 2025-26 Old Regime
INSERT INTO statutory_tds_config VALUES
('tds-2526-old','2025-26','old',50000,
'[{"min":0,"max":250000,"rate":0},{"min":250000,"max":500000,"rate":5},{"min":500000,"max":1000000,"rate":20},{"min":1000000,"max":null,"rate":30}]',
'[{"income_above":5000000,"surcharge_pct":10},{"income_above":10000000,"surcharge_pct":15}]',
4,500000,12500,60,80,'2025-04-01',datetime('now'));
`;
