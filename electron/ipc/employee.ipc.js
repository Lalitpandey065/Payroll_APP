const { ipcMain } = require('electron');
const employeeService = require('../services/employee.service');

ipcMain.handle('employee:getAll', async (event, filters) => {
  try {
    const list = employeeService.getAllEmployees(filters);
    return { success: true, data: list };
  } catch (err) {
    console.error('[IPC Employee] getAll error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('employee:getById', async (event, id) => {
  try {
    const emp = employeeService.getEmployeeById(id);
    return { success: true, data: emp };
  } catch (err) {
    console.error('[IPC Employee] getById error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('employee:getPackage', async (event, id) => {
  try {
    const pack = employeeService.getEmployeePackage(id);
    return { success: true, data: pack };
  } catch (err) {
    console.error('[IPC Employee] getPackage error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('employee:create', async (event, data, identity, statutory) => {
  try {
    const created = employeeService.createEmployee(data, identity, statutory);
    return { success: true, data: created };
  } catch (err) {
    console.error('[IPC Employee] create error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('employee:update', async (event, id, core, identity, statutory) => {
  try {
    const updated = employeeService.updateEmployee(id, core, identity, statutory);
    return { success: true, data: updated };
  } catch (err) {
    console.error('[IPC Employee] update error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('employee:delete', async (event, id) => {
  try {
    const result = employeeService.deleteEmployee(id);
    return { success: true, data: result };
  } catch (err) {
    console.error('[IPC Employee] delete error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('employee:getDeclaration', async (event, empId, finYear) => {
  try {
    const decl = employeeService.getInvestmentDeclaration(empId, finYear);
    return { success: true, data: decl };
  } catch (err) {
    console.error('[IPC Employee] getDeclaration error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('employee:saveDeclaration', async (event, data) => {
  try {
    const saved = employeeService.saveInvestmentDeclaration(data);
    return { success: true, data: saved };
  } catch (err) {
    console.error('[IPC Employee] saveDeclaration error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});
