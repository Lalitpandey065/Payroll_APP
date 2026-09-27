const BaseRepository = require('./base.repo');
const { newId } = require('../database');

class PayrollRepository extends BaseRepository {
  constructor() {
    super('payroll_runs');
  }

  /**
   * payroll_runs has no deleted_at column — override findById to omit that clause.
   */
  findById(id) {
    return this.db.prepare(
      'SELECT * FROM payroll_runs WHERE id = ?'
    ).get(id) || null;
  }

  /**
   * Fetch specific payroll run.
   * Note: payroll_runs has no deleted_at column.
   */
  getPayrollRun(companyId, month, year, runType = 'regular') {
    return this.db.prepare(`
      SELECT * FROM payroll_runs
      WHERE company_id = ? AND month = ? AND year = ? AND run_type = ?
    `).get(companyId, month, year, runType) || null;
  }

  /**
   * Save a completed payroll run and its constituent employee details.
   */
  savePayrollRunAndDetails(runData, detailsArray, overridesArray = []) {
    const transaction = this.db.transaction(() => {
      // 1. Check if run exists, delete details if updating draft
      const existing = this.getPayrollRun(runData.company_id, runData.month, runData.year, runData.run_type);
      
      let runId = existing ? existing.id : newId();
      
      if (existing) {
        if (existing.status !== 'draft' && existing.status !== 'under_review') {
          throw new Error(`Cannot modify payroll run in ${existing.status} status.`);
        }
        
        // Remove existing detail records
        this.db.prepare('DELETE FROM payroll_details WHERE run_id = ?').run(runId);
        this.db.prepare('DELETE FROM payroll_overrides WHERE run_id = ?').run(runId);

        // Update run totals
        const runRecord = {
          ...runData,
          updated_at: new Date().toISOString(),
          synced: 0
        };
        const keys = Object.keys(runRecord).filter(k => k !== 'id' && k !== 'created_at');
        const assignments = keys.map(k => `${k} = ?`).join(', ');
        
        this.db.prepare(`
          UPDATE payroll_runs SET ${assignments} WHERE id = ?
        `).run(...keys.map(k => runRecord[k]), runId);

        const updatedRun = this.findById(runId);
        this.enqueueSync('payroll_runs', runId, 'UPDATE', updatedRun);
      } else {
        // Create run
        const runRecord = {
          id: runId,
          ...runData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          synced: 0
        };
        const keys = Object.keys(runRecord);
        this.db.prepare(`
          INSERT INTO payroll_runs (${keys.join(', ')})
          VALUES (${keys.map(() => '?').join(', ')})
        `).run(...Object.values(runRecord));

        this.enqueueSync('payroll_runs', runId, 'INSERT', runRecord);
      }

      // 2. Insert Employee Payroll Details Snapshot
      for (const details of detailsArray) {
        const detailId = newId();
        const detailRecord = {
          id: detailId,
          run_id: runId,
          ...details,
          created_at: new Date().toISOString()
        };

        const dKeys = Object.keys(detailRecord);
        this.db.prepare(`
          INSERT INTO payroll_details (${dKeys.join(', ')})
          VALUES (${dKeys.map(() => '?').join(', ')})
        `).run(...Object.values(detailRecord));
      }

      // 3. Insert Overrides Snapshots
      for (const override of overridesArray) {
        const overrideId = newId();
        const oRecord = {
          id: overrideId,
          run_id: runId,
          ...override,
          created_at: new Date().toISOString()
        };

        const oKeys = Object.keys(oRecord);
        this.db.prepare(`
          INSERT INTO payroll_overrides (${oKeys.join(', ')})
          VALUES (${oKeys.map(() => '?').join(', ')})
        `).run(...Object.values(oRecord));
      }

      return this.findById(runId);
    });

    return transaction();
  }

  /**
   * Fetch all employee details for a run.
   */
  getRunDetails(runId) {
    return this.db.prepare(`
      SELECT pd.*, e.gender, e.employment_type
      FROM payroll_details pd
      JOIN employees e ON pd.emp_id = e.id
      WHERE pd.run_id = ?
    `).all(runId);
  }

  /**
   * Save individual manual override.
   */
  addOverride(override) {
    const id = newId();
    const record = {
      id,
      ...override,
      created_at: new Date().toISOString()
    };
    const keys = Object.keys(record);
    this.db.prepare(`
      INSERT INTO payroll_overrides (${keys.join(', ')})
      VALUES (${keys.map(() => '?').join(', ')})
    `).run(...Object.values(record));
    return record;
  }

  /**
   * Get manual overrides for specific run and employee.
   */
  getEmployeeOverrides(runId, empId) {
    return this.db.prepare(`
      SELECT * FROM payroll_overrides WHERE run_id = ? AND emp_id = ?
    `).all(runId, empId);
  }

  /**
   * Update Status of Payroll Run.
   */
  updateRunStatus(runId, status, actionBy) {
    const now = new Date().toISOString();
    let query = 'UPDATE payroll_runs SET status = ?, updated_at = ?, synced = 0';
    const params = [status, now];

    if (status === 'under_review') {
      query += ', reviewed_by = ?';
      params.push(actionBy);
    } else if (status === 'approved') {
      query += ', approved_by = ?, approved_at = ?';
      params.push(actionBy, now);
    } else if (status === 'locked') {
      query += ', locked_by = ?, locked_at = ?';
      params.push(actionBy, now);
    }

    query += ' WHERE id = ?';
    params.push(runId);

    this.db.prepare(query).run(...params);

    const updated = this.findById(runId);
    this.enqueueSync('payroll_runs', runId, 'UPDATE', updated);
    return updated;
  }
}

module.exports = PayrollRepository;
