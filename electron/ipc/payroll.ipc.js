const { ipcMain } = require('electron');
const payrollService = require('../services/payroll.service');
const backupService = require('../services/backup.service');
const { getDB } = require('../db/database');

ipcMain.handle('payroll:getRun', async (event, companyId, month, year) => {
  try {
    const run = payrollService.getPayrollRun(companyId, month, year);
    return { success: true, data: run };
  } catch (err) {
    console.error('[IPC Payroll] getRun error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('payroll:getRunDetails', async (event, runId) => {
  try {
    const details = payrollService.getRunDetails(runId);
    return { success: true, data: details };
  } catch (err) {
    console.error('[IPC Payroll] getRunDetails error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('payroll:draftRun', async (event, companyId, month, year, operator) => {
  try {
    const draft = payrollService.calculateDraftPayroll(companyId, month, year, operator);
    return { success: true, data: draft };
  } catch (err) {
    console.error('[IPC Payroll] draftRun error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('payroll:executeRun', async (event, companyId, month, year, operator) => {
  // Take a pre-payroll snapshot before writing any data — non-blocking, non-fatal
  try {
    const db = getDB();
    const snap = await backupService.createPayrollSnapshot(db, companyId, month, year);
    console.log(`[IPC Payroll] Pre-payroll snapshot saved. Verified: ${snap.verified}`);
  } catch (snapErr) {
    console.warn('[IPC Payroll] Pre-payroll snapshot failed (non-fatal):', snapErr.message);
  }

  try {
    const result = payrollService.executeAndSavePayroll(companyId, month, year, operator);
    return { success: true, data: result };
  } catch (err) {
    console.error('[IPC Payroll] executeRun error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('payroll:getAllRuns', async (event, companyId) => {
  try {
    const db = getDB();
    const runs = db.prepare('SELECT * FROM payroll_runs WHERE company_id = ? ORDER BY year DESC, month DESC').all(companyId);
    return { success: true, data: runs };
  } catch (err) {
    console.error('[IPC Payroll] getAllRuns error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('payroll:updateStatus', async (event, runId, status, user) => {
  try {
    const updated = payrollService.updateRunStatus(runId, status, user);
    return { success: true, data: updated };
  } catch (err) {
    console.error('[IPC Payroll] updateStatus error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('payroll:addOverride', async (event, override) => {
  try {
    const added = payrollService.addOverride(override);
    return { success: true, data: added };
  } catch (err) {
    console.error('[IPC Payroll] addOverride error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('payroll:bulkFlagCheck', async (event, companyId, month, year) => {
  try {
    const checks = payrollService.bulkFlagCheck(companyId, month, year);
    return { success: true, data: checks };
  } catch (err) {
    console.error('[IPC Payroll] bulkFlagCheck error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});
