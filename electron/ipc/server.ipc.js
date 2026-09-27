const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const apiServer = require('../server/api.server');

const CONFIG_FILE = path.join(app.getPath('userData'), 'network_config.json');

// ─── Config helpers ───────────────────────────────────────────────────────────

function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return { mode: 'standalone', serverUrl: '', apiKey: '', hostPort: 7654, autoStart: false };
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return { mode: 'standalone', serverUrl: '', apiKey: '', hostPort: 7654, autoStart: false };
  }
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

// ─── Auto-start server on boot if configured ─────────────────────────────────

function maybeAutoStart() {
  const config = readConfig();
  if (config.mode === 'host' && config.autoStart) {
    try {
      apiServer.startServer(config.hostPort || 7654, config.apiKey || '');
      console.log('[ServerIPC] Auto-started LAN server from saved config.');
    } catch (e) {
      console.warn('[ServerIPC] Auto-start failed:', e.message);
    }
  }
}

// Call on module load so it runs at app startup
maybeAutoStart();

// ─── IPC Handlers ────────────────────────────────────────────────────────────

/**
 * server:getConfig — read current network config
 */
ipcMain.handle('server:getConfig', async () => {
  try {
    return { success: true, data: readConfig() };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
});

/**
 * server:saveConfig — persist network config
 */
ipcMain.handle('server:saveConfig', async (event, config) => {
  try {
    writeConfig(config);
    return { success: true };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
});

/**
 * server:start — start the embedded HTTP server (host mode)
 */
ipcMain.handle('server:start', async (event, port, apiKey) => {
  try {
    if (apiServer.isRunning()) {
      return { success: true, data: { already: true, ips: apiServer.getLanIPs(), port } };
    }
    const result = apiServer.startServer(port || 7654, apiKey || '');
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
});

/**
 * server:stop — stop the embedded HTTP server
 */
ipcMain.handle('server:stop', async () => {
  try {
    const result = apiServer.stopServer();
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
});

/**
 * server:getStatus — server running state + LAN IPs
 */
ipcMain.handle('server:getStatus', async () => {
  try {
    return {
      success: true,
      data: {
        running: apiServer.isRunning(),
        ips: apiServer.getLanIPs()
      }
    };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
});

/**
 * server:getClients — list of recently connected client machines
 */
ipcMain.handle('server:getClients', async () => {
  try {
    return { success: true, data: apiServer.getConnectedClients() };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
});
