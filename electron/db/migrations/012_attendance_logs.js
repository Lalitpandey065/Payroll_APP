module.exports = `
CREATE TABLE IF NOT EXISTS attendance_logs (
  id TEXT PRIMARY KEY,
  emp_id TEXT NOT NULL REFERENCES employees(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_calendar_days INTEGER NOT NULL,
  total_working_days INTEGER NOT NULL,
  present_days REAL NOT NULL DEFAULT 0,
  paid_leave_days REAL NOT NULL DEFAULT 0,
  unpaid_leave_days REAL NOT NULL DEFAULT 0,
  lop_days REAL NOT NULL DEFAULT 0, -- AUTO: working_days - present_days - paid_leave_days
  ot_hours REAL NOT NULL DEFAULT 0,
  late_marks INTEGER NOT NULL DEFAULT 0,
  half_days REAL NOT NULL DEFAULT 0,
  is_attendance_locked INTEGER NOT NULL DEFAULT 0,
  locked_by TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT,
  UNIQUE(emp_id, month, year)
);
CREATE INDEX IF NOT EXISTS idx_attendance_company_month ON attendance_logs(company_id, month, year);
`;
