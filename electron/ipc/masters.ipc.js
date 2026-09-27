const { ipcMain } = require('electron');
const m = require('../services/masters.service');

// ─── Departments ───────────────────────────────────────────────────────────────
ipcMain.handle('masters:getDepartments',    async (_, companyId) => wrap(() => m.getDepartments(companyId)));
ipcMain.handle('masters:getDepartmentById', async (_, id)        => wrap(() => m.getDepartmentById(id)));
ipcMain.handle('masters:createDepartment',  async (_, data)      => wrap(() => m.createDepartment(data)));
ipcMain.handle('masters:updateDepartment',  async (_, id, data)  => wrap(() => m.updateDepartment(id, data)));
ipcMain.handle('masters:deleteDepartment',  async (_, id)        => wrap(() => m.deleteDepartment(id)));

// ─── Designations ──────────────────────────────────────────────────────────────
ipcMain.handle('masters:getDesignations',    async (_, companyId) => wrap(() => m.getDesignations(companyId)));
ipcMain.handle('masters:getDesignationById', async (_, id)        => wrap(() => m.getDesignationById(id)));
ipcMain.handle('masters:createDesignation',  async (_, data)      => wrap(() => m.createDesignation(data)));
ipcMain.handle('masters:updateDesignation',  async (_, id, data)  => wrap(() => m.updateDesignation(id, data)));
ipcMain.handle('masters:deleteDesignation',  async (_, id)        => wrap(() => m.deleteDesignation(id)));

// ─── Branches ──────────────────────────────────────────────────────────────────
ipcMain.handle('masters:getBranches',    async (_, companyId) => wrap(() => m.getBranches(companyId)));
ipcMain.handle('masters:getBranchById',  async (_, id)        => wrap(() => m.getBranchById(id)));
ipcMain.handle('masters:createBranch',   async (_, data)      => wrap(() => m.createBranch(data)));
ipcMain.handle('masters:updateBranch',   async (_, id, data)  => wrap(() => m.updateBranch(id, data)));
ipcMain.handle('masters:deleteBranch',   async (_, id)        => wrap(() => m.deleteBranch(id)));

function wrap(fn) {
  try {
    return { success: true, data: fn() };
  } catch (err) {
    console.error('[IPC Masters]', err.message);
    return { success: false, error: { message: err.message } };
  }
}
