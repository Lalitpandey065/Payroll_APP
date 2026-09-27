module.exports = `
CREATE TABLE IF NOT EXISTS statutory_pf_config (
  id TEXT PRIMARY KEY,
  company_id TEXT, -- NULL = global default
  emp_contribution_pct REAL NOT NULL DEFAULT 12,
  er_contribution_pct REAL NOT NULL DEFAULT 12,
  eps_pct REAL NOT NULL DEFAULT 8.33,
  eps_ceiling REAL NOT NULL DEFAULT 1250,
  edli_pct REAL NOT NULL DEFAULT 0.5,
  admin_charges_pct REAL NOT NULL DEFAULT 0.5,
  wage_ceiling REAL NOT NULL DEFAULT 15000,
  is_ceiling_applicable INTEGER NOT NULL DEFAULT 1,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Seed global default
INSERT INTO statutory_pf_config (id,emp_contribution_pct,er_contribution_pct,eps_pct,eps_ceiling,edli_pct,admin_charges_pct,wage_ceiling,is_ceiling_applicable,effective_from)
VALUES ('pf-global-default',12,12,8.33,1250,0.5,0.5,15000,1,'2020-04-01');
`;
