const BaseRepository = require('./base.repo');
const { newId } = require('../database');

class SalaryRepository extends BaseRepository {
  constructor() {
    super('salary_structures');
  }

  /**
   * Create a brand-new salary structure row for a company.
   */
  createStructure(companyId, name, description, defaultCtc) {
    const id = newId();
    const now = new Date();
    const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const effectiveFrom = `${yr}-04-01`;
    this.db.prepare(`
      INSERT INTO salary_structures (
        id, company_id, name, description, is_ctc_based,
        default_ctc, effective_from, is_active, version,
        created_at, updated_at, synced
      ) VALUES (?, ?, ?, ?, 1, ?, ?, 1, 1, datetime('now'), datetime('now'), 0)
    `).run(id, companyId, name, description || '', parseFloat(defaultCtc) || 0, effectiveFrom);
    return this.findById(id);
  }

  getStructureWithComponents(structureId) {
    const structure = this.findById(structureId);
    if (!structure) return null;
    const components = this.db.prepare(`
      SELECT * FROM salary_components 
      WHERE structure_id = ? AND is_active = 1
      ORDER BY display_order ASC
    `).all(structureId);
    return { ...structure, components };
  }

  assignSalaryStructure(empId, structureId, ctc, overrides = {}, effectiveFrom = null) {
    if (!effectiveFrom) {
      const now = new Date();
      const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      effectiveFrom = `${yr}-04-01`;
    }
    const monthlyCtc = ctc / 12;
    const existing = this.db.prepare('SELECT id FROM employee_salary WHERE emp_id = ?').get(empId);
    const record = {
      emp_id: empId, structure_id: structureId, ctc, monthly_ctc: monthlyCtc,
      component_overrides: JSON.stringify(overrides), effective_from: effectiveFrom,
      effective_to: null,
      revision_reason: existing ? 'Salary Revision' : 'Initial Structuring',
      revised_by: 'system'
    };
    if (existing) {
      const keys = Object.keys(record);
      const assignments = keys.map(k => `${k} = ?`).join(', ');
      this.db.prepare(`UPDATE employee_salary SET ${assignments}, updated_at = datetime('now'), synced = 0 WHERE id = ?`)
        .run(...Object.values(record), existing.id);
      const updated = this.db.prepare('SELECT * FROM employee_salary WHERE id = ?').get(existing.id);
      this.enqueueSync('employee_salary', existing.id, 'UPDATE', updated);
      return updated;
    } else {
      const id = newId();
      const newRecord = { id, ...record, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), synced: 0 };
      const keys = Object.keys(newRecord);
      this.db.prepare(`INSERT INTO employee_salary (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`)
        .run(...Object.values(newRecord));
      this.enqueueSync('employee_salary', id, 'INSERT', newRecord);
      return newRecord;
    }
  }

  /**
   * Returns every active employee for a company joined with their current
   * salary assignment (NULL columns when no assignment exists yet).
   */
  getSalaryMappings(companyId) {
    return this.db.prepare(`
      SELECT
        e.id          AS emp_id,
        e.emp_code,
        e.first_name,
        e.last_name,
        e.department,
        e.designation,
        es.id         AS assignment_id,
        es.structure_id,
        ss.name       AS structure_name,
        es.ctc,
        es.monthly_ctc,
        es.effective_from
      FROM employees e
      LEFT JOIN employee_salary es ON es.emp_id = e.id
      LEFT JOIN salary_structures ss ON ss.id = es.structure_id
      WHERE e.company_id = ? AND e.status = 'active' AND e.deleted_at IS NULL
      ORDER BY e.emp_code ASC
    `).all(companyId);
  }

  getEmployeeSalary(empId) {
    const row = this.db.prepare(`
      SELECT es.*, ss.name as structure_name
      FROM employee_salary es
      JOIN salary_structures ss ON es.structure_id = ss.id
      WHERE es.emp_id = ?
      ORDER BY es.effective_from DESC LIMIT 1
    `).get(empId);
    if (row && row.component_overrides) row.component_overrides = JSON.parse(row.component_overrides);
    return row || null;
  }

  /**
   * Save (upsert) all components for a structure.
   * Components with an id are updated; new ones (no id) are inserted.
   * Any active component not in the list is deactivated.
   */
  saveStructureWithComponents(structureId, components, defaultCtc, name, description) {
    const transaction = this.db.transaction(() => {
      // Update structure metadata (name, description, default CTC)
      const updates = [];
      const params = [];
      if (name !== undefined)        { updates.push('name = ?');        params.push(name); }
      if (description !== undefined) { updates.push('description = ?'); params.push(description); }
      if (defaultCtc !== undefined)  { updates.push('default_ctc = ?'); params.push(parseFloat(defaultCtc) || 0); }
      if (updates.length > 0) {
        params.push(structureId);
        this.db.prepare(`
          UPDATE salary_structures SET ${updates.join(', ')}, updated_at = datetime('now'), synced = 0
          WHERE id = ?
        `).run(...params);
      }

      // Collect incoming IDs (existing components being kept)
      const incomingIds = components.filter(c => c.id).map(c => c.id);

      // Deactivate components not in the incoming list
      if (incomingIds.length > 0) {
        const ph = incomingIds.map(() => '?').join(',');
        this.db.prepare(`
          UPDATE salary_components SET is_active = 0, updated_at = datetime('now')
          WHERE structure_id = ? AND id NOT IN (${ph})
        `).run(structureId, ...incomingIds);
      } else {
        this.db.prepare(`
          UPDATE salary_components SET is_active = 0, updated_at = datetime('now')
          WHERE structure_id = ?
        `).run(structureId);
      }

      // Upsert each component
      for (let i = 0; i < components.length; i++) {
        const c = components[i];
        const order = c.display_order ?? (i + 1);

        if (c.id) {
          // Update existing
          this.db.prepare(`
            UPDATE salary_components SET
              code = ?, name = ?, component_type = ?, calc_type = ?,
              calc_value = ?, is_pf_wage = ?, is_esi_wage = ?, is_taxable = ?,
              is_pro_rated = ?, display_order = ?, is_active = 1,
              updated_at = datetime('now')
            WHERE id = ? AND structure_id = ?
          `).run(
            c.code, c.name, c.component_type, c.calc_type, c.calc_value,
            c.is_pf_wage ? 1 : 0, c.is_esi_wage ? 1 : 0,
            c.is_taxable ? 1 : 0, c.is_pro_rated ? 1 : 0,
            order, c.id, structureId
          );
        } else {
          // Insert new component
          const id = newId();
          this.db.prepare(`
            INSERT INTO salary_components (
              id, structure_id, code, name, component_type, calc_type,
              calc_value, statutory_type, is_pf_wage, is_esi_wage, is_taxable,
              is_exempted, exemption_type, exemption_limit, is_pro_rated,
              is_ot_included, is_arrear_applicable, is_shown_on_payslip,
              is_included_in_ctc, display_label, display_order,
              min_value, max_value, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 0, ?, 0, 1, 1, ?, ?, ?, 0, 0, 1, datetime('now'), datetime('now'))
          `).run(
            id, structureId, c.code, c.name, c.component_type, c.calc_type,
            c.calc_value, c.statutory_type || null,
            c.is_pf_wage ? 1 : 0, c.is_esi_wage ? 1 : 0, c.is_taxable ? 1 : 0,
            c.is_pro_rated ? 1 : 0,
            c.component_type === 'earning' ? 1 : 0,
            c.name, order
          );
        }
      }

      return this.getStructureWithComponents(structureId);
    });

    return transaction();
  }
}

module.exports = SalaryRepository;
