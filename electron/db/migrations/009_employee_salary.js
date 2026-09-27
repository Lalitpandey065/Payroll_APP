module.exports = `
CREATE TABLE IF NOT EXISTS employee_salary (
  id TEXT PRIMARY KEY,
  emp_id TEXT NOT NULL REFERENCES employees(id),
  structure_id TEXT NOT NULL REFERENCES salary_structures(id),
  ctc REAL NOT NULL DEFAULT 0,
  monthly_ctc REAL NOT NULL DEFAULT 0,
  component_overrides TEXT, -- JSON: {BASIC: 20000, HRA: 8000}
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  revision_reason TEXT,
  revised_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_emp_salary ON employee_salary(emp_id);
`;
