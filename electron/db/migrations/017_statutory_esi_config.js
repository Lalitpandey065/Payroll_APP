module.exports = `
CREATE TABLE IF NOT EXISTS statutory_esi_config (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  emp_contribution_pct REAL NOT NULL DEFAULT 0.75,
  er_contribution_pct REAL NOT NULL DEFAULT 3.25,
  gross_ceiling REAL NOT NULL DEFAULT 21000,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO statutory_esi_config (id,emp_contribution_pct,er_contribution_pct,gross_ceiling,effective_from)
VALUES ('esi-global-default',0.75,3.25,21000,'2020-04-01');
`;
