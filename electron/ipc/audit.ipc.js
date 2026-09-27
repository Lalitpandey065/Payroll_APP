const { ipcMain } = require('electron');
const { getDB } = require('../db/database');

/**
 * Returns the N most recent audit_log entries, optionally filtered by company.
 * Used by Dashboard to show real audited activity.
 */
ipcMain.handle('audit:getLast', async (event, limit = 20, companyId = null) => {
  try {
    const db = getDB();
    let rows;
    if (companyId) {
      rows = db.prepare(`
        SELECT id, company_id, user_id, action, entity_type, entity_id, notes, created_at
        FROM audit_log
        WHERE company_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(companyId, limit);
    } else {
      rows = db.prepare(`
        SELECT id, company_id, user_id, action, entity_type, entity_id, notes, created_at
        FROM audit_log
        ORDER BY created_at DESC
        LIMIT ?
      `).all(limit);
    }
    return { success: true, data: rows };
  } catch (err) {
    console.error('[IPC Audit] getLast error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});

/**
 * Returns count of payroll runs in under_review or draft status for a company.
 * Used by Dashboard pending-approvals stat card.
 */
ipcMain.handle('audit:getPendingApprovals', async (event, companyId) => {
  try {
    const db = getDB();
    const where = companyId ? 'WHERE company_id = ? AND status IN (\'draft\', \'under_review\')' : 'WHERE status IN (\'draft\', \'under_review\')';
    const row = companyId
      ? db.prepare(`SELECT COUNT(*) as cnt FROM payroll_runs ${where}`).get(companyId)
      : db.prepare(`SELECT COUNT(*) as cnt FROM payroll_runs ${where}`).get();
    return { success: true, data: { count: row?.cnt || 0 } };
  } catch (err) {
    console.error('[IPC Audit] getPendingApprovals error:', err.message);
    return { success: false, error: { message: err.message } };
  }
});
