const { ipcMain } = require('electron');
const authService = require('../services/auth.service');

ipcMain.handle('auth:login', async (event, email, password) => {
  try {
    const user = authService.login(email, password);
    return { success: true, data: user };
  } catch (err) {
    console.error('[IPC Auth] Login error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

ipcMain.handle('auth:updatePassword', async (event, userId, current, newPass) => {
  try {
    const result = authService.updatePassword(userId, current, newPass);
    return { success: true, data: result };
  } catch (err) {
    console.error('[IPC Auth] Update password error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});
