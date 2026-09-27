module.exports = `
CREATE TABLE IF NOT EXISTS setup_deductions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL,
  code TEXT NOT NULL,
  deduction_type TEXT NOT NULL DEFAULT 'custom',
  slot_number INTEGER,
  heading TEXT NOT NULL DEFAULT '',
  hindi_heading TEXT DEFAULT '',
  calculation TEXT DEFAULT 'Fixed',
  shown_in_print INTEGER DEFAULT 1,
  shown_in_screen INTEGER DEFAULT 1,
  carry_forward INTEGER DEFAULT 0,
  is_taxable INTEGER DEFAULT 0,
  mode TEXT DEFAULT 'Salary',
  percentage REAL DEFAULT 0.00,
  pct_bases TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, code),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
`;
