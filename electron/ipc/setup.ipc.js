const { ipcMain } = require('electron');
const setupService = require('../services/setup.service');

const handle = (ch, fn) => ipcMain.handle(ch, async (_, ...args) => {
  try { return { success: true, data: await fn(...args) }; }
  catch (e) { return { success: false, error: { message: e.message } }; }
});

handle('setup:getAll',         (companyId)       => setupService.getAllSetup(companyId));
handle('setup:getCompany',     (companyId)       => setupService.getCompanySetup(companyId));
handle('setup:saveCompany',    (companyId, data) => setupService.saveCompanySetup(companyId, data));
handle('setup:getEPF',         (companyId)       => setupService.getEPFSetup(companyId));
handle('setup:saveEPF',        (companyId, data) => setupService.saveEPFSetup(companyId, data));
handle('setup:getESI',         (companyId)       => setupService.getESISetup(companyId));
handle('setup:saveESI',        (companyId, data) => setupService.saveESISetup(companyId, data));
handle('setup:getOT',          (companyId)       => setupService.getOTSetup(companyId));
handle('setup:saveOT',         (companyId, data) => setupService.saveOTSetup(companyId, data));
handle('setup:getBonus',       (companyId)       => setupService.getBonusSetup(companyId));
handle('setup:saveBonus',      (companyId, data) => setupService.saveBonusSetup(companyId, data));
handle('setup:getGratuity',    (companyId)       => setupService.getGratuitySetup(companyId));
handle('setup:saveGratuity',   (companyId, data) => setupService.saveGratuitySetup(companyId, data));
handle('setup:getFactory',     (companyId)       => setupService.getFactorySetup(companyId));
handle('setup:saveFactory',    (companyId, data) => setupService.saveFactorySetup(companyId, data));
handle('setup:getAllowances',     (companyId)       => setupService.getAllowances(companyId));
handle('setup:getAllowanceByCode', (companyId, code) => setupService.getAllowanceByCode(companyId, code));
handle('setup:saveAllowance',     (companyId, code, data) => setupService.saveAllowance(companyId, code, data));
handle('setup:getAllDeductions',     (companyId)       => setupService.getAllDeductions(companyId));
handle('setup:getDeductionByCode', (companyId, code) => setupService.getDeductionByCode(companyId, code));
handle('setup:saveDeduction',     (companyId, code, data) => setupService.saveDeduction(companyId, code, data));

ipcMain.handle('setup:getAttendanceSetup', (_, companyId) => {
  return setupService.getAttendanceSetup(companyId);
});

ipcMain.handle('setup:saveAttendanceSetup', (_, companyId, rows) => {
  return setupService.saveAttendanceSetup(companyId, rows);
});
