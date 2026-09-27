const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const importService = require('../services/import.service');

// ─── Template Downloads ───────────────────────────────────────────────────────

ipcMain.handle('import:downloadEmployeeTemplate', async () => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save Employee Import Template',
      defaultPath: path.join(app.getPath('documents'), 'PaySmart_Employee_Import_Template.xlsx'),
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
    });
    if (canceled || !filePath) return { success: false, error: { message: 'Cancelled.' } };
    await importService.generateEmployeeTemplate(filePath);
    return { success: true, data: { path: filePath } };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
});

ipcMain.handle('import:downloadAttendanceTemplate', async (event, companyId, month, year) => {
  try {
    const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long' });
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save Attendance Import Template',
      defaultPath: path.join(app.getPath('documents'), `PaySmart_Attendance_${monthName}_${year}.xlsx`),
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
    });
    if (canceled || !filePath) return { success: false, error: { message: 'Cancelled.' } };
    await importService.generateAttendanceTemplate(filePath, companyId, month, year);
    return { success: true, data: { path: filePath } };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
});

// ─── File Parse (preview before commit) ──────────────────────────────────────

ipcMain.handle('import:parseEmployeeFile', async () => {
  try {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Select Employee Import File',
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile']
    });
    if (canceled || !filePaths?.length) return { success: false, error: { message: 'Cancelled.' } };
    const rows = await importService.parseEmployeeFile(filePaths[0]);
    return { success: true, data: { rows, filePath: filePaths[0] } };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
});

ipcMain.handle('import:parseAttendanceFile', async () => {
  try {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Select Attendance Import File',
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile']
    });
    if (canceled || !filePaths?.length) return { success: false, error: { message: 'Cancelled.' } };
    const rows = await importService.parseAttendanceFile(filePaths[0]);
    return { success: true, data: { rows, filePath: filePaths[0] } };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
});

// ─── Execute Import ───────────────────────────────────────────────────────────

ipcMain.handle('import:executeEmployees', async (event, rows, companyId) => {
  try {
    const result = await importService.importEmployees(rows, companyId);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
});

ipcMain.handle('import:executeAttendance', async (event, rows, companyId, month, year) => {
  try {
    const result = await importService.importAttendance(rows, companyId, month, year);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
});
