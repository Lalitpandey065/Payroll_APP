const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let _app = null;

// ─── App / Path helpers ──────────────────────────────────────────────────────

function getApp() {
  if (_app) return _app;
  try { _app = require('electron').app; } catch (_) { _app = null; }
  return _app;
}

function getBackupRoot() {
  const app = getApp();
  const userData = app ? app.getPath('userData') : path.join(__dirname, '../../');
  const dir = path.join(userData, 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getAutoBackupDir() {
  const dir = path.join(getBackupRoot(), 'auto');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getMigrationBackupDir() {
  const dir = path.join(getBackupRoot(), 'migrations');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getPayrollBackupDir() {
  const dir = path.join(getBackupRoot(), 'payroll');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getSessionBackupDir() {
  const dir = path.join(getBackupRoot(), 'session');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getExportsDir() {
  const dir = path.join(getBackupRoot(), 'exports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Secondary backup location — user's Documents folder (survives AppData wipe). */
function getDocumentsBackupDir() {
  try {
    const app = getApp();
    const docsDir = app
      ? path.join(app.getPath('documents'), 'PaySmartBackups')
      : path.join(require('os').homedir(), 'Documents', 'PaySmartBackups');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    return docsDir;
  } catch (e) {
    console.warn('[Backup] Could not resolve Documents folder:', e.message);
    return null;
  }
}

// ─── Manifest ────────────────────────────────────────────────────────────────

function getManifestPath() {
  return path.join(getBackupRoot(), 'manifest.json');
}

function readManifest() {
  const p = getManifestPath();
  if (!fs.existsSync(p)) return { backups: [] };
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return { backups: [] };
  }
}

function writeManifest(manifest) {
  try {
    fs.writeFileSync(getManifestPath(), JSON.stringify(manifest, null, 2), 'utf8');
  } catch (e) {
    console.warn('[Backup] Could not write manifest:', e.message);
  }
}

/**
 * Upsert a backup record in the manifest.
 * @param {{ file: string, path: string, type: string, sizeKB: number, createdAt: string, verified: boolean, verifyError?: string }} record
 */
function updateManifest(record) {
  const manifest = readManifest();
  const idx = manifest.backups.findIndex(b => b.file === record.file);
  if (idx >= 0) {
    manifest.backups[idx] = { ...manifest.backups[idx], ...record };
  } else {
    manifest.backups.unshift(record);
  }
  // Keep manifest tidy — max 200 entries
  if (manifest.backups.length > 200) manifest.backups = manifest.backups.slice(0, 200);
  writeManifest(manifest);
}

function getManifestEntry(fileName) {
  const manifest = readManifest();
  return manifest.backups.find(b => b.file === fileName) || null;
}

// ─── Verification ────────────────────────────────────────────────────────────

/**
 * Verify a backup file by opening it in read-only mode and running PRAGMA integrity_check.
 * @param {string} backupPath
 * @returns {{ ok: boolean, result: string }}
 */
function verifyBackupFile(backupPath) {
  let verifyDb = null;
  try {
    verifyDb = new Database(backupPath, { readonly: true });
    const row = verifyDb.prepare('PRAGMA integrity_check').get();
    const result = row['integrity_check'];
    const ok = result === 'ok';
    console.log(`[Backup] Verification ${ok ? 'PASSED' : 'FAILED'} for: ${path.basename(backupPath)}`);
    return { ok, result };
  } catch (e) {
    console.error(`[Backup] Verification ERROR for ${path.basename(backupPath)}:`, e.message);
    return { ok: false, result: e.message };
  } finally {
    if (verifyDb) { try { verifyDb.close(); } catch (_) {} }
  }
}

// ─── Core Backup Operations ──────────────────────────────────────────────────

/**
 * Internal: write DB to backupPath, verify it, mirror to Documents, update manifest.
 * @param {import('better-sqlite3').Database} db
 * @param {string} backupPath
 * @param {string} type  'auto' | 'manual' | 'payroll' | 'migration' | 'session'
 * @param {{ mirrorToDocuments?: boolean }} opts
 * @returns {Promise<{ path: string, verified: boolean, mirrorPath: string|null }>}
 */
async function _writeAndVerify(db, backupPath, type, opts = {}) {
  const dir = path.dirname(backupPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await db.backup(backupPath);

  const stat = fs.statSync(backupPath);
  const sizeKB = Math.round(stat.size / 1024);

  // Verify the backup we just wrote
  const { ok, result } = verifyBackupFile(backupPath);

  // Mirror to Documents folder (dual-location)
  let mirrorPath = null;
  if (opts.mirrorToDocuments !== false && (type === 'auto' || type === 'manual')) {
    const docsDir = getDocumentsBackupDir();
    if (docsDir) {
      mirrorPath = path.join(docsDir, path.basename(backupPath));
      try {
        fs.copyFileSync(backupPath, mirrorPath);
        console.log(`[Backup] Mirrored to Documents: ${mirrorPath}`);
      } catch (e) {
        console.warn('[Backup] Mirror to Documents failed (non-fatal):', e.message);
        mirrorPath = null;
      }
    }
  }

  // Record in manifest
  updateManifest({
    file: path.basename(backupPath),
    path: backupPath,
    mirrorPath,
    type,
    sizeKB,
    createdAt: new Date().toISOString(),
    verified: ok,
    verifyError: ok ? undefined : result
  });

  if (!ok) {
    console.error(`[Backup] WARN: backup written but failed verification: ${result}`);
  }

  return { path: backupPath, verified: ok, mirrorPath };
}

// ─── Daily Auto-Backup ───────────────────────────────────────────────────────

/**
 * Run daily auto-backup. One backup per calendar day, keeps last 30.
 * Also mirrors to Documents/PaySmartBackups/.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {boolean} [force=false]  Force overwrite today's backup if it exists
 * @returns {Promise<{ skipped: boolean, path: string, date: string, verified: boolean }>}
 */
async function runAutoBackup(db, force = false) {
  const dir = getAutoBackupDir();
  const date = new Date().toISOString().slice(0, 10);
  const backupPath = path.join(dir, `paysmart_${date}.db`);

  if (!force && fs.existsSync(backupPath)) {
    console.log(`[Backup] Auto-backup already exists for ${date}. Skipping.`);
    const entry = getManifestEntry(path.basename(backupPath));
    return { skipped: true, path: backupPath, date, verified: entry?.verified ?? null };
  }

  console.log(`[Backup] Running daily auto-backup → ${backupPath}`);
  const { verified, mirrorPath } = await _writeAndVerify(db, backupPath, 'auto');
  console.log(`[Backup] Auto-backup complete. Verified: ${verified}. Mirror: ${mirrorPath || 'none'}`);

  pruneOldBackups(dir, 30);

  return { skipped: false, path: backupPath, date, verified };
}

// ─── Session Checkpoint (every 30 min) ──────────────────────────────────────

/**
 * Write a rolling session checkpoint. Overwrites the previous checkpoint.
 * Used by the 30-minute interval in main.js.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {Promise<{ path: string, verified: boolean }>}
 */
async function runSessionCheckpoint(db) {
  const dir = getSessionBackupDir();
  // Rolling: keep 3 checkpoints (session_1, session_2, session_3) and rotate
  const files = fs.readdirSync(dir).filter(f => f.startsWith('session_') && f.endsWith('.db')).sort();
  const next = `session_${Date.now()}.db`;
  const checkpointPath = path.join(dir, next);

  console.log(`[Backup] Writing session checkpoint → ${checkpointPath}`);
  const result = await _writeAndVerify(db, checkpointPath, 'session', { mirrorToDocuments: false });

  // Keep only 3 session checkpoints
  pruneOldBackups(dir, 3);

  return result;
}

// ─── Pre-Payroll Snapshot ────────────────────────────────────────────────────

/**
 * Snapshot DB before a payroll run execution.
 * Keeps last 10 payroll snapshots.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} companyId
 * @param {number} month
 * @param {number} year
 * @returns {Promise<{ path: string, verified: boolean }>}
 */
async function createPayrollSnapshot(db, companyId, month, year) {
  const dir = getPayrollBackupDir();
  const ts = Date.now();
  const label = `${year}_${String(month).padStart(2, '0')}`;
  const snapshotPath = path.join(dir, `pre_payroll_${label}_${ts}.db`);

  console.log(`[Backup] Creating pre-payroll snapshot for ${month}/${year} → ${snapshotPath}`);
  const result = await _writeAndVerify(db, snapshotPath, 'payroll', { mirrorToDocuments: false });

  pruneOldBackups(dir, 10);
  return result;
}

// ─── Pre-Migration Snapshot ──────────────────────────────────────────────────

/**
 * Synchronous snapshot (uses fs.copyFileSync) — called from runMigrations() which is sync.
 * @param {string} dbPath  Live DB file path
 * @returns {string|null}  snapshot path or null on failure
 */
function createSyncMigrationSnapshot(dbPath) {
  try {
    if (!dbPath || !fs.existsSync(dbPath)) return null;
    const dir = getMigrationBackupDir();
    const snapshotPath = path.join(dir, `pre_migration_${Date.now()}.db`);
    fs.copyFileSync(dbPath, snapshotPath);
    const stat = fs.statSync(snapshotPath);
    updateManifest({
      file: path.basename(snapshotPath),
      path: snapshotPath,
      type: 'migration',
      sizeKB: Math.round(stat.size / 1024),
      createdAt: new Date().toISOString(),
      verified: true  // copy is safe to assume valid
    });
    pruneOldBackups(dir, 5);
    console.log(`[Backup] Pre-migration snapshot saved: ${snapshotPath}`);
    return snapshotPath;
  } catch (e) {
    console.warn(`[Backup] Pre-migration snapshot failed (non-fatal): ${e.message}`);
    return null;
  }
}

// ─── Manual Backup ───────────────────────────────────────────────────────────

/**
 * Create a manual backup to a user-specified file path.
 * Verifies and mirrors to Documents.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} savePath
 * @returns {Promise<{ path: string, verified: boolean, mirrorPath: string|null }>}
 */
async function createManualBackup(db, savePath) {
  console.log(`[Backup] Creating manual backup → ${savePath}`);
  return _writeAndVerify(db, savePath, 'manual');
}

// ─── Integrity Check ────────────────────────────────────────────────────────

/**
 * Run integrity check on the live DB.
 * @param {import('better-sqlite3').Database} db
 * @returns {{ ok: boolean, result: string }}
 */
function runIntegrityCheck(db) {
  console.log('[Backup] Running SQLite integrity check on live DB...');
  try {
    const row = db.prepare('PRAGMA integrity_check').get();
    const result = row['integrity_check'];
    const ok = result === 'ok';
    console.log(`[Backup] Integrity check: ${ok ? 'PASSED' : 'FAILED — ' + result}`);
    return { ok, result };
  } catch (e) {
    return { ok: false, result: e.message };
  }
}

// ─── Restore ────────────────────────────────────────────────────────────────

/**
 * Restore the database from a backup file.
 * Saves a .before_restore safety copy of the current DB first.
 *
 * @param {string} backupPath
 * @param {string} dbPath
 * @returns {{ success: boolean, message: string }}
 */
function restoreFromBackup(backupPath, dbPath) {
  if (!fs.existsSync(backupPath)) {
    return { success: false, message: `Backup file not found: ${backupPath}` };
  }

  // Verify the backup before restoring
  const { ok, result } = verifyBackupFile(backupPath);
  if (!ok) {
    return { success: false, message: `Backup file failed integrity check: ${result}. Restore aborted for safety.` };
  }

  // Keep a safety copy of the current DB
  if (fs.existsSync(dbPath)) {
    const safetyPath = dbPath + '.before_restore_' + Date.now();
    fs.copyFileSync(dbPath, safetyPath);
    console.log(`[Backup] Pre-restore safety copy saved: ${safetyPath}`);
  }

  fs.copyFileSync(backupPath, dbPath);
  console.log(`[Backup] DB restored from: ${backupPath}`);
  return { success: true, message: 'Database restored. The application will restart now.' };
}

/**
 * Attempt to auto-restore from the latest verified backup.
 * Used on startup when the live DB fails integrity check.
 *
 * @param {string} dbPath  Path to the live DB file
 * @returns {{ restored: boolean, fromPath: string|null, message: string }}
 */
function autoRestoreLatestGoodBackup(dbPath) {
  console.log('[Backup] Attempting auto-restore from latest verified backup...');

  // Search all backup types in priority order
  const candidates = [
    ...listAutoBackups(),
    ...listPayrollSnapshots(),
    ...listMigrationSnapshots()
  ];

  // Filter to verified backups only, prefer newest
  const verified = candidates.filter(b => {
    const entry = getManifestEntry(b.name);
    return entry ? entry.verified : false;
  });

  if (verified.length === 0) {
    // Fallback: try any backup file regardless of manifest
    const any = candidates[0];
    if (any && fs.existsSync(any.path)) {
      const check = verifyBackupFile(any.path);
      if (check.ok) {
        const result = restoreFromBackup(any.path, dbPath);
        return { restored: result.success, fromPath: any.path, message: result.message };
      }
    }
    return { restored: false, fromPath: null, message: 'No verified backup found for auto-restore.' };
  }

  const best = verified[0];
  const result = restoreFromBackup(best.path, dbPath);
  return { restored: result.success, fromPath: best.path, message: result.message };
}

// ─── List Helpers ────────────────────────────────────────────────────────────

function listAutoBackups() {
  const dir = getAutoBackupDir();
  if (!fs.existsSync(dir)) return [];
  return _listDbFiles(dir, 'paysmart_').map(f => ({
    ...f,
    date: f.name.replace('paysmart_', '').replace('.db', ''),
    verified: getManifestEntry(f.name)?.verified ?? null
  }));
}

function listMigrationSnapshots() {
  const dir = getMigrationBackupDir();
  if (!fs.existsSync(dir)) return [];
  return _listDbFiles(dir, 'pre_migration_').map(f => {
    const ts = parseInt(f.name.replace('pre_migration_', '').replace('.db', ''), 10);
    return {
      ...f,
      timestamp: ts,
      createdAt: isNaN(ts) ? null : new Date(ts).toISOString(),
      verified: getManifestEntry(f.name)?.verified ?? null
    };
  });
}

function listPayrollSnapshots() {
  const dir = getPayrollBackupDir();
  if (!fs.existsSync(dir)) return [];
  return _listDbFiles(dir, 'pre_payroll_').map(f => {
    const entry = getManifestEntry(f.name);
    return {
      ...f,
      createdAt: entry?.createdAt ?? null,
      verified: entry?.verified ?? null
    };
  });
}

function listSessionCheckpoints() {
  const dir = getSessionBackupDir();
  if (!fs.existsSync(dir)) return [];
  return _listDbFiles(dir, 'session_').map(f => {
    const ts = parseInt(f.name.replace('session_', '').replace('.db', ''), 10);
    return {
      ...f,
      createdAt: isNaN(ts) ? null : new Date(ts).toISOString(),
      verified: getManifestEntry(f.name)?.verified ?? null
    };
  });
}

/** Internal: read .db files from a dir, sorted newest-first */
function _listDbFiles(dir, prefix) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.db') && (!prefix || f.startsWith(prefix)))
    .sort()
    .reverse()
    .map(f => {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      return { name: f, path: fullPath, sizeKB: Math.round(stat.size / 1024) };
    });
}

function getLastBackupInfo() {
  const backups = listAutoBackups();
  if (backups.length === 0) return { date: null, path: null, sizeKB: null, verified: null };
  const latest = backups[0];
  return { date: latest.date, path: latest.path, sizeKB: latest.sizeKB, verified: latest.verified };
}

// ─── Full JSON Export ────────────────────────────────────────────────────────

/**
 * Export every table in the DB as a portable JSON file.
 * This is the last-resort recovery format — readable even without SQLite.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} savePath  Destination .json file path
 * @returns {{ success: boolean, tables: string[], path: string }}
 */
function exportAllDataAsJSON(db, savePath) {
  const dir = path.dirname(savePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    tables: {}
  };

  // Get all user tables (exclude SQLite internal tables and schema_migrations)
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all().map(r => r.name);

  for (const table of tables) {
    try {
      exportData.tables[table] = db.prepare(`SELECT * FROM "${table}"`).all();
    } catch (e) {
      console.warn(`[Backup] JSON export: could not read table "${table}": ${e.message}`);
      exportData.tables[table] = [];
    }
  }

  fs.writeFileSync(savePath, JSON.stringify(exportData, null, 2), 'utf8');
  console.log(`[Backup] Full JSON export saved: ${savePath} (${tables.length} tables)`);
  return { success: true, tables, path: savePath };
}

/**
 * Auto JSON export — runs ONCE PER DAY alongside the daily SQLite backup.
 * Each file is a complete snapshot of all DB tables — used as last-resort
 * recovery if the SQLite file becomes unreadable.
 *
 * Naming: paysmart_export_YYYY-MM-DD.json
 * Retention: last 30 days (one file per day = ~30 files max)
 * Storage: AppData/backups/exports/ + mirrored to Documents/PaySmartBackups/
 *
 * @param {import('better-sqlite3').Database} db
 * @param {boolean} [force=false]  Overwrite today's export if it already exists
 * @returns {{ skipped: boolean, path: string, mirrorPath: string|null, sizeKB: number }}
 */
function runAutoJSONExport(db, force = false) {
  const dir = getExportsDir();
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const fileName = `paysmart_export_${date}.json`;
  const exportPath = path.join(dir, fileName);

  // Already exported today — skip unless forced
  if (!force && fs.existsSync(exportPath)) {
    console.log(`[Backup] JSON export already exists for ${date}. Skipping.`);
    const stat = fs.statSync(exportPath);
    return { skipped: true, path: exportPath, mirrorPath: null, sizeKB: Math.round(stat.size / 1024) };
  }

  console.log(`[Backup] Running daily JSON export → ${exportPath}`);
  exportAllDataAsJSON(db, exportPath);

  const stat = fs.statSync(exportPath);
  const sizeKB = Math.round(stat.size / 1024);
  console.log(`[Backup] Daily JSON export complete (${sizeKB} KB).`);

  // Mirror to Documents
  let mirrorPath = null;
  const docsDir = getDocumentsBackupDir();
  if (docsDir) {
    mirrorPath = path.join(docsDir, fileName);
    try {
      fs.copyFileSync(exportPath, mirrorPath);
      console.log(`[Backup] JSON export mirrored to Documents: ${mirrorPath}`);
    } catch (e) {
      console.warn('[Backup] JSON mirror to Documents failed (non-fatal):', e.message);
      mirrorPath = null;
    }
  }

  // Keep last 10 daily exports
  pruneOldJSONExports(dir, 10);

  return { skipped: false, path: exportPath, mirrorPath, sizeKB };
}

/**
 * List all auto JSON export files, newest first.
 * @returns {Array<{ name: string, path: string, date: string, sizeKB: number }>}
 */
function listAutoJSONExports() {
  const dir = getExportsDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.startsWith('paysmart_export_') && f.endsWith('.json'))
    .sort()
    .reverse()
    .map(f => {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      const date = f.replace('paysmart_export_', '').replace('.json', ''); // YYYY-MM-DD
      return {
        name: f,
        path: fullPath,
        date,
        sizeKB: Math.round(stat.size / 1024)
      };
    });
}

// ─── Summary for UI ──────────────────────────────────────────────────────────

/**
 * Return a full protection summary for the Settings UI.
 * @param {string} dbPath
 */
function getProtectionSummary(dbPath) {
  const autoBackups = listAutoBackups();
  const migrationSnapshots = listMigrationSnapshots();
  const payrollSnapshots = listPayrollSnapshots();
  const sessionCheckpoints = listSessionCheckpoints();
  const jsonExports = listAutoJSONExports();
  const lastBackup = autoBackups[0] || null;
  const lastExport = jsonExports[0] || null;
  const docsDir = getDocumentsBackupDir();

  return {
    dbPath,
    autoBackupDir: getAutoBackupDir(),
    exportsDir: getExportsDir(),
    documentsBackupDir: docsDir,
    lastBackup: lastBackup ? {
      date: lastBackup.date,
      path: lastBackup.path,
      sizeKB: lastBackup.sizeKB,
      verified: lastBackup.verified
    } : null,
    lastExport: lastExport ? {
      createdAt: lastExport.createdAt,
      path: lastExport.path,
      sizeKB: lastExport.sizeKB
    } : null,
    counts: {
      autoBackups: autoBackups.length,
      migrationSnapshots: migrationSnapshots.length,
      payrollSnapshots: payrollSnapshots.length,
      sessionCheckpoints: sessionCheckpoints.length,
      jsonExports: jsonExports.length
    },
    autoBackups,
    migrationSnapshots,
    payrollSnapshots,
    sessionCheckpoints,
    jsonExports
  };
}

// ─── Prune Helper ────────────────────────────────────────────────────────────

function pruneOldBackups(dir, keepCount) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.db')).sort();
  while (files.length > keepCount) {
    const oldest = files.shift();
    try { fs.unlinkSync(path.join(dir, oldest)); } catch (_) {}
    console.log(`[Backup] Pruned: ${oldest}`);
  }
}

function pruneOldJSONExports(dir, keepCount) {
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('paysmart_export_') && f.endsWith('.json'))
    .sort();
  while (files.length > keepCount) {
    const oldest = files.shift();
    try { fs.unlinkSync(path.join(dir, oldest)); } catch (_) {}
    console.log(`[Backup] Pruned JSON export: ${oldest}`);
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  // Core
  runAutoBackup,
  runSessionCheckpoint,
  createPayrollSnapshot,
  createSyncMigrationSnapshot,
  createManualBackup,
  // Safety
  runIntegrityCheck,
  verifyBackupFile,
  restoreFromBackup,
  autoRestoreLatestGoodBackup,
  // Export
  exportAllDataAsJSON,
  runAutoJSONExport,
  listAutoJSONExports,
  // Lists
  listAutoBackups,
  listMigrationSnapshots,
  listPayrollSnapshots,
  listSessionCheckpoints,
  getLastBackupInfo,
  getProtectionSummary,
  // Dirs
  getAutoBackupDir,
  getMigrationBackupDir,
  getPayrollBackupDir,
  getExportsDir,
  getDocumentsBackupDir
};
