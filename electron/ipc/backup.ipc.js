const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const backupService = require('../services/backup.service');
const { getDB, getDBPath } = require('../db/database');

/**
 * backup:getInfo
 * Returns full protection summary for the Settings UI.
 */
ipcMain.handle('backup:getInfo', async () => {
  try {
    const summary = backupService.getProtectionSummary(getDBPath());
    return { success: true, data: summary };
  } catch (err) {
    console.error('[IPC Backup] getInfo error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

/**
 * backup:createManual
 * Opens a save-file dialog and creates a manual backup at the chosen path.
 */
ipcMain.handle('backup:createManual', async () => {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const defaultName = `paysmart_manual_${date}.db`;

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save Backup As',
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    });

    if (canceled || !filePath) {
      return { success: false, error: { message: 'Backup cancelled.' } };
    }

    const db = getDB();
    const result = await backupService.createManualBackup(db, filePath);
    return { success: true, data: { path: result.path, verified: result.verified } };
  } catch (err) {
    console.error('[IPC Backup] createManual error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

/**
 * backup:restore
 * Opens an open-file dialog and restores the DB from the chosen backup.
 */
ipcMain.handle('backup:restore', async () => {
  try {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Select Backup File to Restore',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    });

    if (canceled || !filePaths || filePaths.length === 0) {
      return { success: false, error: { message: 'Restore cancelled.' } };
    }

    const backupPath = filePaths[0];

    const { response } = await dialog.showMessageBox({
      type: 'warning',
      title: 'Confirm Restore',
      message: 'Restore database from backup?',
      detail: `This will replace the current database with:\n${backupPath}\n\nThe backup will be verified before restoring. The app will restart automatically. A safety copy of the current database is saved first.`,
      buttons: ['Restore & Restart', 'Cancel'],
      defaultId: 1,
      cancelId: 1
    });

    if (response !== 0) {
      return { success: false, error: { message: 'Restore cancelled by user.' } };
    }

    const dbPath = getDBPath();
    const result = backupService.restoreFromBackup(backupPath, dbPath);

    if (result.success) {
      setTimeout(() => { app.relaunch(); app.exit(0); }, 1000);
    }

    return { success: result.success, data: { message: result.message } };
  } catch (err) {
    console.error('[IPC Backup] restore error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

/**
 * backup:restoreFromPath
 * Restore directly from a known path (listed auto-backup or snapshot).
 */
ipcMain.handle('backup:restoreFromPath', async (event, backupPath) => {
  try {
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      title: 'Confirm Restore',
      message: 'Restore from this backup?',
      detail: `File: ${backupPath}\n\nThe backup will be verified before restoring. The current database will be replaced and the app will restart automatically.`,
      buttons: ['Restore & Restart', 'Cancel'],
      defaultId: 1,
      cancelId: 1
    });

    if (response !== 0) {
      return { success: false, error: { message: 'Restore cancelled.' } };
    }

    const dbPath = getDBPath();
    const result = backupService.restoreFromBackup(backupPath, dbPath);

    if (result.success) {
      setTimeout(() => { app.relaunch(); app.exit(0); }, 1000);
    }

    return { success: result.success, data: { message: result.message } };
  } catch (err) {
    console.error('[IPC Backup] restoreFromPath error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

/**
 * backup:runNow
 * Force an immediate daily backup (overwrites today's if it already exists).
 */
ipcMain.handle('backup:runNow', async () => {
  try {
    const db = getDB();
    const result = await backupService.runAutoBackup(db, true); // force = true
    return { success: true, data: { path: result.path, date: result.date, verified: result.verified } };
  } catch (err) {
    console.error('[IPC Backup] runNow error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

/**
 * backup:exportJSON
 * Export all DB tables to a portable JSON file via save dialog.
 */
ipcMain.handle('backup:exportJSON', async () => {
  try {
    const date = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const defaultName = `paysmart_export_${date}.json`;

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export All Data as JSON',
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: [{ name: 'JSON File', extensions: ['json'] }]
    });

    if (canceled || !filePath) {
      return { success: false, error: { message: 'Export cancelled.' } };
    }

    const db = getDB();
    const result = backupService.exportAllDataAsJSON(db, filePath);
    return { success: true, data: { path: result.path, tableCount: result.tables.length } };
  } catch (err) {
    console.error('[IPC Backup] exportJSON error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});
