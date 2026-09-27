const { ipcMain } = require('electron');
const syncService = require('../services/sync.service');

/**
 * sync:getStatus
 * Returns pending push count, last sync times, machine ID, mode.
 */
ipcMain.handle('sync:getStatus', async () => {
  try {
    return { success: true, data: syncService.getSyncStatus() };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
});

/**
 * sync:now
 * Trigger a full bidirectional sync (push local changes → master, pull master changes → local).
 * Only works when mode = 'client' and server is reachable.
 */
ipcMain.handle('sync:now', async () => {
  try {
    const result = await syncService.syncNow();
    return { success: true, data: result };
  } catch (e) {
    console.error('[IPC Sync] syncNow error:', e.message);
    return { success: false, error: { message: e.message } };
  }
});

/**
 * sync:push
 * Push only (local → master). Useful if you want to push before going offline.
 */
ipcMain.handle('sync:push', async () => {
  try {
    const config = syncService.getSyncStatus();
    if (config.mode !== 'client' || !config.serverUrl) {
      return { success: false, error: { message: 'Not in client mode.' } };
    }

    const netConfig = JSON.parse(
      require('fs').readFileSync(
        require('path').join(require('electron').app.getPath('userData'), 'network_config.json'),
        'utf8'
      )
    );

    const result = await syncService.pushToMaster(netConfig.serverUrl, netConfig.apiKey);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
});

/**
 * sync:pull
 * Pull only (master → local). Useful for getting latest master data.
 */
ipcMain.handle('sync:pull', async () => {
  try {
    const status = syncService.getSyncStatus();
    if (status.mode !== 'client' || !status.serverUrl) {
      return { success: false, error: { message: 'Not in client mode.' } };
    }

    const netConfig = JSON.parse(
      require('fs').readFileSync(
        require('path').join(require('electron').app.getPath('userData'), 'network_config.json'),
        'utf8'
      )
    );

    const result = await syncService.pullFromMaster(
      netConfig.serverUrl,
      netConfig.apiKey,
      netConfig.lastPullAt || null
    );
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
});
