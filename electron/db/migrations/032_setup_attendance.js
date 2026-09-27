module.exports = `
  CREATE TABLE IF NOT EXISTS setup_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
      -- Fixed codes: see list below
    sort_order INTEGER NOT NULL,
    field_label TEXT NOT NULL,
      -- Display label on the left (e.g. "Working Days", "Earned Leave")
    heading TEXT NOT NULL DEFAULT '',
      -- English short heading (e.g. "Workday", "E.L.")
    hindi_heading TEXT DEFAULT '',
      -- Hindi heading
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, code),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
`;
