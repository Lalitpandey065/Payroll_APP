const AttendanceRepository = require('../db/repositories/attendance.repo');
const attendanceRepo = new AttendanceRepository();

class AttendanceService {
  getAttendanceLog(empId, month, year) {
    return attendanceRepo.getAttendanceLog(empId, month, year);
  }

  getCompanyAttendance(companyId, month, year) {
    return attendanceRepo.getCompanyAttendance(companyId, month, year);
  }

  saveAttendanceLog(logData) {
    try {
      return { success: true, data: attendanceRepo.saveAttendanceLog(logData) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  lockAttendance(companyId, month, year, lockedBy) {
    return attendanceRepo.setLockState(companyId, month, year, lockedBy, 1);
  }

  unlockAttendance(companyId, month, year, unlockedBy) {
    return attendanceRepo.setLockState(companyId, month, year, unlockedBy, 0);
  }
}

module.exports = new AttendanceService();
