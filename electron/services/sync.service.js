/**
 * PaySmart Pro — Offline Sync Service
 *
 * Handles bidirectional data sync between a child machine (offline-first)
 * and the master host machine on the LAN.
 *
 * PUSH: child → master  (unsynced local changes go up)
 * PULL: master → child  (master changes come down)
 *
 * Conflict resolution:
 *   - payroll_runs / payroll_details: MASTER ALWAYS WINS
 *   - everything else: NEWER updated_at WINS
 *   - new records (not on other side): always apply
 */

const { getDB, newId } = require('../db/database');
const path = require('path');
const fs = require('fs');

// ─── Tables included in sync ─────────────────────────────────────────────────

const SYNC_TABLES = [
  'companies',
  'employees',
  'employee_identity',
  'employee_statutory_config',
  'employee_investment_declaration',
  'employee_salary',
  'salary_structures',
  'salary_components',
  'attendance_logs',
  'payroll_runs',
  'payroll_details',
  'payroll_overrides'
];

// Master always wins for these — never let child data overwrite master
const MASTER_WINS_TABLES = new Set(['payroll_runs', 'payroll_details']);

// ─── Machine ID ──────────────────────────────────────────────────────────────

function getMachineId() {
  try {
    const { app } = require('electron');
    const idPath = path.join(app.getPath('userData'), 'machine_id.txt');
    if (!fs.existsSync(idPath)) {
      const id = newId();
      fs.writeFileSync(idPath, id, 'utf8');
      return id;
    }
    return fs.readFileSync(idPath, 'utf8').trim();
  } catch (e) {
    return 'unknown';
  }
}

/** Returns os.hostname() for display in the connected clients list. */
function getMachineLabel() {
  try { return require('os').hostname(); } catch { return 'Unknown Machine'; }
}

/**
 * Send a lightweight heartbeat to master so it knows this client is online.
 * Called every 30s from the auto-sync interval.
 */
async function sendHeartbeat(serverUrl, apiKey) {
  try {
    const base = serverUrl.replace(/\/$/, '');
    const headers = buildHeaders(apiKey);
    await fetchJSON(`${base}/api/sync/heartbeat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ machineId: getMachineId(), label: getMachineLabel() })
    });
  } catch (e) {
    // Non-fatal — master just won't update lastSeen for this client
  }
}

// ─── Network config helpers ──────────────────────────────────────────────────

function getNetworkConfig() {
  try {
    const { app } = require('electron');
    const p = path.join(app.getPath('userData'), 'network_config.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return null; }
}

function saveLastPullAt(isoTimestamp) {
  try {
    const { app } = require('electron');
    const p = path.join(app.getPath('userData'), 'network_config.json');
    const config = getNetworkConfig() || {};
    config.lastPullAt = isoTimestamp;
    fs.writeFileSync(p, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.warn('[Sync] Could not save lastPullAt:', e.message);
  }
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────
// Uses built-in Node.js http/https only — no external dependencies.

async function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const http  = require('http');
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;

    const body = options.body || null;
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + (urlObj.search || ''),
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
      };

    const req = lib.request(reqOptions, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON response')); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function buildHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-PaySmart-Key': apiKey } : {})
  };
}

// ─── PUSH: local unsynced → master ──────────────────────────────────────────

/**
 * Push all unsynced sync_queue items to the master.
 * Master applies them with conflict resolution.
 *
 * @param {string} serverUrl
 * @param {string} apiKey
 * @returns {{ pushed: number, failed: number, conflicts: number, errors: string[] }}
 */
async function pushToMaster(serverUrl, apiKey) {
  const db = getDB();
  const machineId = getMachineId();

  const pending = db.prepare(`
    SELECT * FROM sync_queue
    WHERE synced = 0
    ORDER BY created_at ASC
    LIMIT 500
  `).all();

  if (pending.length === 0) {
    return { pushed: 0, failed: 0, conflicts: 0, errors: [] };
  }

  console.log(`[Sync] Pushing ${pending.length} unsynced items to master...`);

  const base = serverUrl.replace(/\/$/, '');
  const headers = buildHeaders(apiKey);

  let pushed = 0, failed = 0, conflicts = 0;
  const errors = [];

  try {
    const result = await fetchJSON(`${base}/api/sync/push`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ items: pending, machineId, label: getMachineLabel() })
    });

    if (result.success) {
      pushed    = result.data.applied   || 0;
      conflicts = result.data.conflicts || 0;
      failed    = result.data.failed    || 0;

      // Mark successfully pushed items as synced
      const successIds = result.data.successIds || [];
      if (successIds.length > 0) {
        const placeholders = successIds.map(() => '?').join(',');
        db.prepare(`
          UPDATE sync_queue
          SET synced = 1, synced_at = datetime('now')
          WHERE id IN (${placeholders})
        `).run(...successIds);
      }
    } else {
      failed = pending.length;
      errors.push(result.error?.message || 'Push failed');
    }
  } catch (e) {
    failed = pending.length;
    errors.push(e.message);
    console.error('[Sync] Push error:', e.message);
  }

  return { pushed, failed, conflicts, errors };
}

// ─── PULL: master changes → local ───────────────────────────────────────────

/**
 * Pull all changes from master since lastPullAt and apply them locally.
 * Conflict rule: master wins for payroll tables; newer updated_at wins for others.
 *
 * @param {string} serverUrl
 * @param {string} apiKey
 * @param {string|null} since  ISO timestamp (null = full sync)
 * @returns {{ pulled: number, applied: number, conflicts: number, errors: string[] }}
 */
async function pullFromMaster(serverUrl, apiKey, since = null) {
  const db = getDB();
  const base = serverUrl.replace(/\/$/, '');
  const headers = buildHeaders(apiKey);

  const sinceParam = since ? `?since=${encodeURIComponent(since)}` : '';
  console.log(`[Sync] Pulling from master since: ${since || 'beginning'}...`);

  let pulled = 0, applied = 0, conflicts = 0;
  const errors = [];

  try {
    const machineId = getMachineId();
    const label = getMachineLabel();
    const extraParams = `&machineId=${encodeURIComponent(machineId)}&label=${encodeURIComponent(label)}`;
    const fullUrl = `${base}/api/sync/pull${sinceParam ? sinceParam + extraParams : '?' + extraParams.slice(1)}`;
    const result = await fetchJSON(fullUrl, { headers });

    if (!result.success) {
      errors.push(result.error?.message || 'Pull failed');
      return { pulled, applied, conflicts, errors };
    }

    const changes = result.data.changes; // { tableName: [records] }
    const serverTime = result.data.serverTime;

    const applyTx = db.transaction(() => {
      for (const table of SYNC_TABLES) {
        const records = changes[table];
        if (!records || records.length === 0) continue;

        pulled += records.length;
        const masterWins = MASTER_WINS_TABLES.has(table);

        for (const record of records) {
          const result = applyRecord(db, table, record, masterWins);
          if (result === 'applied')  applied++;
          if (result === 'conflict') conflicts++;
        }
      }
    });

    applyTx();

    // Update last pull timestamp to server's time
    saveLastPullAt(serverTime);
    console.log(`[Sync] Pull complete. Records pulled: ${pulled}, applied: ${applied}, conflicts (master won): ${conflicts}`);

  } catch (e) {
    errors.push(e.message);
    console.error('[Sync] Pull error:', e.message);
  }

  return { pulled, applied, conflicts, errors };
}

/**
 * Apply one record from master to local DB.
 * @param {Database} db
 * @param {string} table
 * @param {object} record
 * @param {boolean} masterAlwaysWins
 * @returns {'applied'|'conflict'|'skipped'}
 */
function applyRecord(db, table, record, masterAlwaysWins) {
  try {
    // Check if the column list exists for this table
    const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    if (columns.length === 0) return 'skipped'; // table doesn't exist

    // Filter record fields to only columns that exist in the table
    const filtered = {};
    for (const [k, v] of Object.entries(record)) {
      if (columns.includes(k)) filtered[k] = v;
    }
    if (!filtered.id) return 'skipped';

    const local = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(filtered.id);

    if (!local) {
      // New record — always insert
      const keys = Object.keys(filtered);
      db.prepare(`
        INSERT OR IGNORE INTO ${table} (${keys.join(', ')})
        VALUES (${keys.map(() => '?').join(', ')})
      `).run(...Object.values(filtered));
      return 'applied';
    }

    // Record exists — conflict resolution
    if (masterAlwaysWins) {
      // Master wins unconditionally
      _updateRecord(db, table, filtered, columns);
      return 'conflict';
    }

    // Compare updated_at — newer wins
    const localTime  = local.updated_at   ? new Date(local.updated_at).getTime()    : 0;
    const masterTime = filtered.updated_at ? new Date(filtered.updated_at).getTime() : 0;

    if (masterTime >= localTime) {
      _updateRecord(db, table, filtered, columns);
      return masterTime > localTime ? 'applied' : 'conflict';
    }

    // Local is newer — keep local, skip master's record
    return 'skipped';

  } catch (e) {
    console.warn(`[Sync] applyRecord error on ${table}:`, e.message);
    return 'skipped';
  }
}

function _updateRecord(db, table, record, columns) {
  const { id, created_at, ...fields } = record;
  const updateFields = Object.entries(fields).filter(([k]) => columns.includes(k));
  if (updateFields.length === 0) return;
  const assignments = updateFields.map(([k]) => `${k} = ?`).join(', ');
  const values = updateFields.map(([, v]) => v);
  db.prepare(`UPDATE ${table} SET ${assignments}, synced = 1 WHERE id = ?`).run(...values, id);
}

// ─── Full Sync (push then pull) ──────────────────────────────────────────────

/**
 * Perform a full bidirectional sync.
 * 1. Push local unsynced changes to master.
 * 2. Pull master changes since lastPullAt.
 *
 * @returns {{ push: object, pull: object, syncedAt: string }}
 */
async function syncNow() {
  const config = getNetworkConfig();
  if (!config || config.mode !== 'client' || !config.serverUrl) {
    throw new Error('Not in client mode or no server URL configured.');
  }

  const { serverUrl, apiKey, lastPullAt } = config;
  const startTime = new Date().toISOString();

  console.log('[Sync] Starting full bidirectional sync...');

  const pushResult = await pushToMaster(serverUrl, apiKey);
  const pullResult = await pullFromMaster(serverUrl, apiKey, lastPullAt || null);

  const syncedAt = new Date().toISOString();
  console.log(`[Sync] Full sync complete at ${syncedAt}`);

  return { push: pushResult, pull: pullResult, syncedAt };
}

// ─── Sync status ─────────────────────────────────────────────────────────────

function getSyncStatus() {
  const db = getDB();
  const config = getNetworkConfig() || {};
  const machineId = getMachineId();

  const pendingCount = db.prepare(`SELECT COUNT(*) as c FROM sync_queue WHERE synced = 0`).get().c;
  const lastSyncedCount = db.prepare(`SELECT COUNT(*) as c FROM sync_queue WHERE synced = 1`).get().c;
  const lastItem = db.prepare(`SELECT synced_at FROM sync_queue WHERE synced = 1 ORDER BY synced_at DESC LIMIT 1`).get();

  return {
    machineId,
    mode: config.mode || 'standalone',
    serverUrl: config.serverUrl || null,
    lastPullAt: config.lastPullAt || null,
    lastPushAt: lastItem?.synced_at || null,
    pendingPushCount: pendingCount,
    totalSyncedCount: lastSyncedCount
  };
}

// ─── Master-side: apply pushed items ─────────────────────────────────────────

/**
 * Apply sync items received from a child machine.
 * Called by the HTTP server's /api/sync/push endpoint.
 *
 * @param {Array} items  sync_queue rows from child
 * @param {string} machineId  child's machine ID
 * @returns {{ applied: number, conflicts: number, failed: number, successIds: string[] }}
 */
function applyPushedItems(items, machineId) {
  const db = getDB();
  let applied = 0, conflicts = 0, failed = 0;
  const successIds = [];

  const tx = db.transaction(() => {
    for (const item of items) {
      try {
        let record;
        try { record = JSON.parse(item.payload_json); } catch { failed++; continue; }

        const table = item.table_name;
        if (!SYNC_TABLES.includes(table)) { successIds.push(item.id); continue; }

        const masterWins = MASTER_WINS_TABLES.has(table);
        const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
        if (columns.length === 0) { failed++; continue; }

        const filtered = {};
        for (const [k, v] of Object.entries(record)) {
          if (columns.includes(k)) filtered[k] = v;
        }

        if (item.operation === 'DELETE') {
          if (columns.includes('deleted_at')) {
            db.prepare(`UPDATE ${table} SET deleted_at = ?, synced = 1 WHERE id = ? AND deleted_at IS NULL`)
              .run(record.deleted_at || new Date().toISOString(), filtered.id);
          }
          applied++;
          successIds.push(item.id);
          continue;
        }

        const local = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(filtered.id);

        if (!local) {
          // Insert new record from child
          const keys = Object.keys(filtered);
          db.prepare(`INSERT OR IGNORE INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`)
            .run(...Object.values(filtered));
          applied++;
        } else if (masterWins) {
          // Master always wins — ignore child's update
          conflicts++;
        } else {
          // Newer updated_at wins
          const localTime  = local.updated_at   ? new Date(local.updated_at).getTime()   : 0;
          const childTime  = filtered.updated_at ? new Date(filtered.updated_at).getTime() : 0;
          if (childTime > localTime) {
            _updateRecord(db, table, filtered, columns);
            applied++;
          } else {
            conflicts++; // local (master) is same age or newer — keep master
          }
        }

        successIds.push(item.id);
      } catch (e) {
        console.error(`[Sync] applyPushedItems error on item ${item.id}:`, e.message);
        failed++;
      }
    }
  });

  tx();
  console.log(`[Sync] Push from ${machineId}: applied=${applied}, conflicts=${conflicts}, failed=${failed}`);
  return { applied, conflicts, failed, successIds };
}

/**
 * Get all records changed since `since` across all sync tables.
 * Called by the HTTP server's /api/sync/pull endpoint.
 *
 * @param {string|null} since  ISO timestamp
 * @returns {{ changes: object, serverTime: string }}
 */
function getChangesSince(since) {
  const db = getDB();
  const serverTime = new Date().toISOString();
  const changes = {};

  for (const table of SYNC_TABLES) {
    try {
      const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
      if (columns.length === 0) { changes[table] = []; continue; }

      if (since && columns.includes('updated_at')) {
        changes[table] = db.prepare(`SELECT * FROM ${table} WHERE updated_at > ?`).all(since);
      } else {
        changes[table] = db.prepare(`SELECT * FROM ${table}`).all();
      }
    } catch (e) {
      console.warn(`[Sync] getChangesSince error on ${table}:`, e.message);
      changes[table] = [];
    }
  }

  return { changes, serverTime };
}

module.exports = {
  syncNow,
  pushToMaster,
  pullFromMaster,
  sendHeartbeat,
  getSyncStatus,
  applyPushedItems,
  getChangesSince,
  getMachineId,
  getMachineLabel,
  SYNC_TABLES
};
