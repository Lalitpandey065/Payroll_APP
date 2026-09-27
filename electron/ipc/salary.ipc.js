const { ipcMain } = require('electron');
const salaryService = require('../services/salary.service');

ipcMain.handle('salary:createStructure', async (event, companyId, name, description, defaultCtc) => {
  try {
    const result = salaryService.createStructure(companyId, name, description, defaultCtc);
    return { success: true, data: result };
  } catch (err) {
    console.error('[IPC Salary] createStructure error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('salary:getSalaryMappings', async (event, companyId) => {
  try {
    const list = salaryService.getSalaryMappings(companyId);
    return { success: true, data: list };
  } catch (err) {
    console.error('[IPC Salary] getSalaryMappings error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('salary:getAll', async (event, filters) => {
  try {
    const list = salaryService.getAllStructures(filters);
    return { success: true, data: list };
  } catch (err) {
    console.error('[IPC Salary] getAll error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('salary:getStructureWithComponents', async (event, id) => {
  try {
    const struct = salaryService.getStructureWithComponents(id);
    return { success: true, data: struct };
  } catch (err) {
    console.error('[IPC Salary] getStructureWithComponents error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('salary:assignStructure', async (event, empId, structureId, ctc, overrides, effectiveFrom) => {
  try {
    const result = salaryService.assignSalaryStructure(empId, structureId, ctc, overrides, effectiveFrom);
    return { success: true, data: result };
  } catch (err) {
    console.error('[IPC Salary] assignStructure error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('salary:getEmployeeSalary', async (event, empId) => {
  try {
    const sal = salaryService.getEmployeeSalary(empId);
    return { success: true, data: sal };
  } catch (err) {
    console.error('[IPC Salary] getEmployeeSalary error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('salary:saveStructure', async (event, structureId, components, defaultCtc, name, description) => {
  try {
    const result = salaryService.saveStructureWithComponents(structureId, components, defaultCtc, name, description);
    return { success: true, data: result };
  } catch (err) {
    console.error('[IPC Salary] saveStructure error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});
