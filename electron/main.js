const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { initDB, getDB, getDBPath } = require('./db/database');
const backupService = require('./services/backup.service');

// Statically mount all IPC Communication Channels
require('./ipc/auth.ipc');
require('./ipc/company.ipc');
require('./ipc/employee.ipc');
require('./ipc/salary.ipc');
require('./ipc/attendance.ipc');
require('./ipc/payroll.ipc');
require('./ipc/report.ipc');
require('./ipc/backup.ipc');
require('./ipc/server.ipc');
require('./ipc/sync.ipc');
require('./ipc/import.ipc');
require('./ipc/audit.ipc');
require('./ipc/setup.ipc');
require('./ipc/masters.ipc');
require('./ipc/data-maintenance.ipc');

const SESSION_CHECKPOINT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const AUTO_SYNC_INTERVAL_MS          = 30 * 1000;       // 30 seconds (client auto-sync)
let sessionCheckpointTimer = null;
let autoSyncTimer = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'PaySmart Pro - Indian Statutory Payroll Ledger',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  console.log('[ElectronMain] System Booting. Initializing SQLite Database.');

  // 1. Initialize SQLite DB & apply migrations (auto pre-migration snapshot runs inside)
  initDB();

  const db = getDB();
  const dbPath = getDBPath();

  // 2. Integrity check on the live DB
  const integrity = backupService.runIntegrityCheck(db);

  if (!integrity.ok) {
    console.error('[ElectronMain] DB integrity check FAILED. Attempting auto-restore...');

    // 2a. Try to auto-restore from the latest verified backup
    const restore = backupService.autoRestoreLatestGoodBackup(dbPath);

    if (restore.restored) {
      dialog.showErrorBox(
        'Database Restored Automatically',
        `A database issue was detected and PaySmart Pro has automatically restored from a backup:\n\n${restore.fromPath}\n\nThe application will now restart to apply the restored data.`
      );
      // Restart to re-open with the restored DB
      app.relaunch();
      app.exit(0);
      return;
    } else {
      // Could not auto-restore — warn user and continue (read-only risk)
      dialog.showErrorBox(
        'Database Integrity Warning',
        `A database integrity issue was detected and no verified backup could be found to restore automatically.\n\nIssue: "${integrity.result}"\n\nPlease go to Settings → Backup & Restore and restore from a backup manually before making any changes.`
      );
    }
  }

  // 3. Daily auto-backup + daily JSON export (both skip if already done today)
  backupService.runAutoBackup(db).then(result => {
    if (!result.skipped) {
      console.log(`[ElectronMain] Auto-backup saved for ${result.date}. Verified: ${result.verified}`);
    }
  }).catch(err => {
    console.warn(`[ElectronMain] Auto-backup failed (non-fatal): ${err.message}`);
  });

  // JSON export runs once per day — 1 file per day, 30-day retention
  try {
    const exportResult = backupService.runAutoJSONExport(db);
    if (!exportResult.skipped) {
      console.log(`[ElectronMain] Daily JSON export saved (${exportResult.sizeKB} KB). Mirror: ${exportResult.mirrorPath || 'none'}`);
    }
  } catch (err) {
    console.warn(`[ElectronMain] Daily JSON export failed (non-fatal): ${err.message}`);
  }

  // 4. Client auto-sync: heartbeat + delta pull every 30s when in client mode
  try {
    const syncService = require('./services/sync.service');
    const netCfg = syncService.getSyncStatus();

    if (netCfg.mode === 'client' && netCfg.serverUrl) {
      const { serverUrl, apiKey } = (() => {
        try {
          const p = require('path').join(app.getPath('userData'), 'network_config.json');
          return JSON.parse(require('fs').readFileSync(p, 'utf8'));
        } catch { return {}; }
      })();

      if (serverUrl) {
        // Startup: full sync (push local changes + pull master changes)
        console.log('[ElectronMain] Client mode — running startup sync...');
        syncService.syncNow().then(r => {
          console.log(`[ElectronMain] Startup sync done. Pushed: ${r.push.pushed}, Pulled: ${r.pull.applied}`);
        }).catch(e => {
          console.warn(`[ElectronMain] Startup sync failed (host may be offline): ${e.message}`);
        });

        // Recurring: heartbeat + delta pull every 30s
        autoSyncTimer = setInterval(async () => {
          try {
            await syncService.sendHeartbeat(serverUrl, apiKey || '');
            // Delta pull: only get changes since last pull
            const cfg = syncService.getSyncStatus();
            await syncService.pullFromMaster(serverUrl, apiKey || '', cfg.lastPullAt || null);
          } catch (e) {
            // Silent — host may be temporarily offline
          }
        }, AUTO_SYNC_INTERVAL_MS);

        console.log(`[ElectronMain] Auto-sync interval started (every ${AUTO_SYNC_INTERVAL_MS / 1000}s).`);
      }
    }
  } catch (e) {
    console.warn('[ElectronMain] Could not start auto-sync:', e.message);
  }

  // 5. Session checkpoint (SQLite only) — every 30 minutes
  const runSessionCheckpoint = () => {
    backupService.runSessionCheckpoint(db).then(result => {
      console.log(`[ElectronMain] Session checkpoint written. Verified: ${result.verified}`);
    }).catch(err => {
      console.warn(`[ElectronMain] Session checkpoint failed (non-fatal): ${err.message}`);
    });
  };

  runSessionCheckpoint(); // first checkpoint at launch
  sessionCheckpointTimer = setInterval(runSessionCheckpoint, SESSION_CHECKPOINT_INTERVAL_MS);

  console.log('[ElectronMain] Creating active viewport.');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  try {
    const db = getDB();
    if (db) {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
    }
  } catch (e) {
    console.error('Error during DB shutdown:', e);
  }
});

app.on('window-all-closed', () => {
  if (sessionCheckpointTimer) clearInterval(sessionCheckpointTimer);
  if (autoSyncTimer) clearInterval(autoSyncTimer);
  if (process.platform !== 'darwin') app.quit();
});
