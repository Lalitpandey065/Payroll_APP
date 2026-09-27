const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

let db = null;
let _dbPath = null; // track resolved DB path for backup/restore use

/**
 * Perform rounding to 2 decimal places.
 * @param {number} v 
 * @returns {number}
 */
function round2(v) {
  if (v === undefined || v === null || isNaN(v)) return 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/**
 * Generate a new UUID.
 * @returns {string}
 */
function newId() {
  return uuidv4();
}

/**
 * Initialize database and run migrations.
 * @param {string} [customPath] Override path (useful for testing)
 * @returns {Database.Database}
 */
function initDB(customPath) {
  if (db) return db;

  let dbPath;
  if (customPath) {
    dbPath = customPath;
  } else {
    try {
      const { app } = require('electron');
      const userData = app.getPath('userData');
      if (!fs.existsSync(userData)) {
        fs.mkdirSync(userData, { recursive: true });
      }
      dbPath = path.join(userData, 'paysmart.db');
    } catch (e) {
      // Fallback for standard Node test environment
      dbPath = path.join(__dirname, '../../paysmart.db');
    }
  }

  _dbPath = dbPath;
  console.log(`[Database] Connecting to SQLite DB at: ${dbPath}`);

  db = new Database(dbPath, { verbose: console.log });
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create schema_migrations table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      run_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  // Run all migrations (with pre-migration snapshot if pending migrations exist)
  runMigrations();

  // Backfill attendance setup for existing companies
  backfillAllSetupData();

  // Seed default admin user
  seedAdminUser();

  return db;
}

/**
 * Get the resolved filesystem path of the active database file.
 * @returns {string|null}
 */
function getDBPath() {
  return _dbPath;
}

/**
 * Get active database instance.
 * @returns {Database.Database}
 */
function getDB() {
  if (!db) {
    return initDB();
  }
  return db;
}

/**
 * Run migrations from the migrations directory.
 * Automatically creates a pre-migration snapshot if there are pending migrations.
 */
function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.warn(`[Database] Migrations folder not found at: ${migrationsDir}`);
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.js'))
    .sort();

  console.log(`[Database] Found ${files.length} migrations.`);

  const completed = db.prepare('SELECT version FROM schema_migrations').all()
    .reduce((acc, row) => {
      acc[row.version] = true;
      return acc;
    }, {});

  // Check if any migrations are pending
  const pending = files.filter(f => !completed[path.basename(f, '.js')]);

  // Take a pre-migration snapshot before applying any new migrations
  if (pending.length > 0) {
    console.log(`[Database] ${pending.length} pending migration(s) found. Creating pre-migration snapshot...`);
    try {
      const backupService = require('../services/backup.service');
      // Synchronously create snapshot via copyFile (db.backup is async, use fs.copyFileSync here)
      const snapshotDir = backupService.getMigrationBackupDir();
      const snapshotPath = path.join(snapshotDir, `pre_migration_${Date.now()}.db`);
      if (_dbPath && fs.existsSync(_dbPath)) {
        fs.copyFileSync(_dbPath, snapshotPath);
        console.log(`[Database] Pre-migration snapshot saved: ${snapshotPath}`);
      }
    } catch (snapErr) {
      console.warn(`[Database] Pre-migration snapshot failed (non-fatal): ${snapErr.message}`);
    }
  }

  for (const file of files) {
    const version = path.basename(file, '.js');
    if (completed[version]) {
      console.log(`[Database] Migration ${version} already applied.`);
      continue;
    }

    console.log(`[Database] Executing migration: ${version}`);

    // Require the migration file which exports the SQL string
    const sql = require(path.join(migrationsDir, file));

    // Strip comments first to avoid semicolons inside comments breaking the split logic
    const cleanedSql = sql
      .replace(/--.*$/gm, '') // Remove double-dash comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments

    // Execute SQL as a transaction
    const transaction = db.transaction(() => {
      const statements = cleanedSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        db.prepare(statement).run();
      }

      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
    });

    try {
      transaction();
      console.log(`[Database] Applied migration: ${version} successfully.`);
    } catch (err) {
      console.error(`[Database] Migration ${version} FAILED:`, err);
      throw err;
    }
  }
}

/**
 * Seed default administrator user if none exists.
 */
function seedAdminUser() {
  const adminEmail = 'admin@paysmart.com';
  const check = db.prepare('SELECT 1 FROM users WHERE email = ?').get(adminEmail);
  if (!check) {
    console.log(`[Database] Seeding default admin user: ${adminEmail}`);
    const hash = bcrypt.hashSync('Admin@123', 10);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, is_active, force_password_change)
      VALUES (?, ?, ?, ?, ?, 1, 1)
    `).run(newId(), 'System Administrator', adminEmail, hash, 'admin');
  }
}

/**
 * Backfill all setup data for existing companies
 */
function backfillAllSetupData() {
  const { setupRepo } = require('./repositories/setup.repo');
  const companies = db.prepare('SELECT id FROM companies').all();
  
  for (const company of companies) {
    try {
      // Backfill allowances (030)
      const allowCount = db.prepare(
        'SELECT COUNT(*) as c FROM setup_allowances WHERE company_id = ?'
      ).get(company.id);
      if (allowCount.c === 0) setupRepo.seedAllowances(company.id);

      // Backfill deductions (031)
      const dedCount = db.prepare(
        'SELECT COUNT(*) as c FROM setup_deductions WHERE company_id = ?'
      ).get(company.id);
      if (dedCount.c === 0) setupRepo.seedDeductions(company.id);

      // Backfill attendance (032)
      const attCount = db.prepare(
        'SELECT COUNT(*) as c FROM setup_attendance WHERE company_id = ?'
      ).get(company.id);
      if (attCount.c === 0) setupRepo.seedAttendance(company.id);

      // Backfill setup defaults (023-029)
      const setupCount = db.prepare(
        'SELECT COUNT(*) as c FROM setup_company WHERE company_id = ?'
      ).get(company.id);
      if (setupCount.c === 0) setupRepo.seedDefaults(company.id);
      
    } catch (e) {
      console.warn(`[Database] backfillAllSetupData error for company ${company.id}:`, e.message);
    }
  }
}

module.exports = {
  initDB,
  getDB,
  getDBPath,
  round2,
  newId
};
