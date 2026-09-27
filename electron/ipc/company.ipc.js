const { ipcMain } = require('electron');
const companyService = require('../services/company.service');

ipcMain.handle('company:getAll', async (event, filters) => {
  try {
    const list = companyService.getAllCompanies(filters);
    return { success: true, data: list };
  } catch (err) {
    console.error('[IPC Company] getAll error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('company:getById', async (event, id) => {
  try {
    const company = companyService.getCompanyById(id);
    return { success: true, data: company };
  } catch (err) {
    console.error('[IPC Company] getById error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('company:create', async (event, data) => {
  try {
    const created = companyService.createCompany(data);
    return { success: true, data: created };
  } catch (err) {
    console.error('[IPC Company] create error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('company:update', async (event, id, data) => {
  try {
    const updated = companyService.updateCompany(id, data);
    return { success: true, data: updated };
  } catch (err) {
    console.error('[IPC Company] update error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('company:delete', async (event, id) => {
  try {
    const result = companyService.deleteCompany(id);
    return { success: true, data: result };
  } catch (err) {
    console.error('[IPC Company] delete error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});
