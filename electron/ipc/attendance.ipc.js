const { ipcMain } = require('electron');
const attendanceService = require('../services/attendance.service');

ipcMain.handle('attendance:get', async (event, empId, month, year) => {
  try {
    const log = attendanceService.getAttendanceLog(empId, month, year);
    return { success: true, data: log };
  } catch (err) {
    console.error('[IPC Attendance] get error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('attendance:getCompany', async (event, companyId, month, year) => {
  try {
    const list = attendanceService.getCompanyAttendance(companyId, month, year);
    return { success: true, data: list };
  } catch (err) {
    console.error('[IPC Attendance] getCompany error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('attendance:save', async (event, data) => {
  try {
    const res = attendanceService.saveAttendanceLog(data);
    if (!res.success) {
      return { success: false, error: { message: res.error } };
    }
    return { success: true, data: res.data };
  } catch (err) {
    console.error('[IPC Attendance] save error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('attendance:lock', async (event, companyId, month, year, user) => {
  try {
    const result = attendanceService.lockAttendance(companyId, month, year, user);
    return { success: true, data: result };
  } catch (err) {
    console.error('[IPC Attendance] lock error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('attendance:unlock', async (event, companyId, month, year, user) => {
  try {
    const result = attendanceService.unlockAttendance(companyId, month, year, user);
    return { success: true, data: result };
  } catch (err) {
    console.error('[IPC Attendance] unlock error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});
