const BaseRepository = require('./base.repo');
const { newId, round2 } = require('../database');

class AttendanceRepository extends BaseRepository {
  constructor() {
    super('attendance_logs');
  }

  /**
   * attendance_logs has no deleted_at column — override findById to avoid the
   * deleted_at IS NULL clause that BaseRepository.findById always appends.
   */
  findById(id) {
    return this.db.prepare(
      'SELECT * FROM attendance_logs WHERE id = ?'
    ).get(id) || null;
  }

  /**
   * Fetch attendance log for specific employee-month.
   * Note: attendance_logs has no deleted_at column.
   */
  getAttendanceLog(empId, month, year) {
    return this.db.prepare(`
      SELECT * FROM attendance_logs
      WHERE emp_id = ? AND month = ? AND year = ?
    `).get(empId, month, year) || null;
  }

  /**
   * Get all attendance logs for a company-month.
   */
  getCompanyAttendance(companyId, month, year) {
    return this.db.prepare(`
      SELECT al.*, e.id as employee_id, e.emp_code, e.first_name, e.last_name, e.department, e.designation, esc.is_ot_applicable
      FROM employees e
      LEFT JOIN attendance_logs al ON e.id = al.emp_id AND al.month = ? AND al.year = ?
      LEFT JOIN employee_statutory_config esc ON e.id = esc.emp_id
      WHERE e.company_id = ? AND e.status = 'active' AND e.deleted_at IS NULL
    `).all(month, year, companyId);
  }

  /**
   * Save an attendance log. Auto-computes LOP days inside.
   */
  saveAttendanceLog(logData) {
    const { emp_id, month, year, total_working_days, present_days, paid_leave_days, ot_hours } = logData;

    const working = Number(total_working_days);
    const present = Number(present_days);
    const paidLeave = Number(paid_leave_days);
    const ot = Number(ot_hours) || 0;

    const calDays = new Date(year, month, 0).getDate();

    // Hard validations — throw, don't silently accept
    if (present < 0) {
      throw new Error(`Employee ${emp_id}: present_days cannot be negative`);
    }
    if (present > calDays) {
      throw new Error(`Employee ${emp_id}: present_days (${present}) exceeds calendar days (${calDays})`);
    }
    if (present > working) {
      throw new Error(`Employee ${emp_id}: present_days (${present}) exceeds working_days (${working})`);
    }
    if (paidLeave < 0) {
      throw new Error(`Employee ${emp_id}: paid_leave_days cannot be negative`);
    }
    if (present + paidLeave > working) {
      throw new Error(`Employee ${emp_id}: present (${present}) + paid_leave (${paidLeave}) = ${present + paidLeave} exceeds working_days (${working})`);
    }

    // Auto-compute: LOP = working - present - paid_leave
    const computedLop = round2(Math.max(0, working - present - paidLeave));
    const finalOt = Math.max(0, ot);

    const finalLog = {
      ...logData,
      lop_days: computedLop,
      ot_hours: finalOt,
      updated_at: new Date().toISOString()
    };

    const existing = this.db.prepare(`
      SELECT id FROM attendance_logs
      WHERE emp_id = ? AND month = ? AND year = ?
    `).get(emp_id, month, year);

    if (existing) {
      const keys = Object.keys(finalLog).filter(k => k !== 'id' && k !== 'emp_id' && k !== 'month' && k !== 'year' && k !== 'created_at');
      const assignments = keys.map(k => `${k} = ?`).join(', ');

      this.db.prepare(`
        UPDATE attendance_logs
        SET ${assignments}, synced = 0
        WHERE id = ?
      `).run(...keys.map(k => finalLog[k]), existing.id);

      const updated = this.findById(existing.id);
      this.enqueueSync('attendance_logs', existing.id, 'UPDATE', updated);
      return updated;
    } else {
      const id = newId();
      const insertRecord = {
        id,
        created_at: new Date().toISOString(),
        synced: 0,
        ...finalLog
      };

      const keys = Object.keys(insertRecord);
      this.db.prepare(`
        INSERT INTO attendance_logs (${keys.join(', ')})
        VALUES (${keys.map(() => '?').join(', ')})
      `).run(...Object.values(insertRecord));

      this.enqueueSync('attendance_logs', id, 'INSERT', insertRecord);
      return insertRecord;
    }
  }

  /**
   * Lock/Unlock attendance for a company-month.
   */
  setLockState(companyId, month, year, lockedBy, isLocked = 1) {
    this.db.prepare(`
      UPDATE attendance_logs
      SET is_attendance_locked = ?, locked_by = ?, updated_at = datetime('now'), synced = 0
      WHERE company_id = ? AND month = ? AND year = ?
    `).run(isLocked, lockedBy, companyId, month, year);
    return true;
  }
}

module.exports = AttendanceRepository;
