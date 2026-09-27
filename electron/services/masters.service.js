const { getDB, newId } = require('../db/database');

// ─── Departments ───────────────────────────────────────────────────────────────

function getDepartments(companyId) {
  const db = getDB();
  return db.prepare(
    'SELECT * FROM departments WHERE company_id = ? ORDER BY name'
  ).all(companyId);
}

function getDepartmentById(id) {
  const db = getDB();
  return db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
}

function createDepartment(data) {
  const db = getDB();
  const id = newId();
  db.prepare(`
    INSERT INTO departments (
      id, company_id, name, principal_name, address, location_nature,
      main_contractor, main_contractor_address, contractor, contractor_address,
      sub_contractor, sub_contractor_address, state,
      ot_percentage, esic_on_ot, esi_limit_on_ot, epf_on_ot,
      calculate_on_hours, per_day_hours, wages_to_calculate, ot_allowances,
      epf_in_netpay, esi_in_netpay, lwf_in_netpay, prof_tax_in_netpay,
      lwf_calculate, lwf_allowances
    ) VALUES (
      ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
    )
  `).run(
    id, data.company_id, data.name,
    data.principal_name || '', data.address || '', data.location_nature || '',
    data.main_contractor || '', data.main_contractor_address || '',
    data.contractor || '', data.contractor_address || '',
    data.sub_contractor || '', data.sub_contractor_address || '',
    data.state || '',
    data.ot_percentage || 0, data.esic_on_ot || 'No', data.esi_limit_on_ot || 'No',
    data.epf_on_ot || 'No', data.calculate_on_hours || 'No',
    data.per_day_hours || 0, data.wages_to_calculate || 'Gross',
    JSON.stringify(data.ot_allowances || []),
    data.epf_in_netpay || 'No', data.esi_in_netpay || 'No',
    data.lwf_in_netpay || 'No', data.prof_tax_in_netpay || 'No',
    data.lwf_calculate || 'Gross', JSON.stringify(data.lwf_allowances || [])
  );
  return getDepartmentById(id);
}

function updateDepartment(id, data) {
  const db = getDB();
  db.prepare(`
    UPDATE departments SET
      name = ?, principal_name = ?, address = ?, location_nature = ?,
      main_contractor = ?, main_contractor_address = ?,
      contractor = ?, contractor_address = ?,
      sub_contractor = ?, sub_contractor_address = ?, state = ?,
      ot_percentage = ?, esic_on_ot = ?, esi_limit_on_ot = ?, epf_on_ot = ?,
      calculate_on_hours = ?, per_day_hours = ?, wages_to_calculate = ?,
      ot_allowances = ?, epf_in_netpay = ?, esi_in_netpay = ?,
      lwf_in_netpay = ?, prof_tax_in_netpay = ?,
      lwf_calculate = ?, lwf_allowances = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    data.name,
    data.principal_name || '', data.address || '', data.location_nature || '',
    data.main_contractor || '', data.main_contractor_address || '',
    data.contractor || '', data.contractor_address || '',
    data.sub_contractor || '', data.sub_contractor_address || '',
    data.state || '',
    data.ot_percentage || 0, data.esic_on_ot || 'No', data.esi_limit_on_ot || 'No',
    data.epf_on_ot || 'No', data.calculate_on_hours || 'No',
    data.per_day_hours || 0, data.wages_to_calculate || 'Gross',
    JSON.stringify(data.ot_allowances || []),
    data.epf_in_netpay || 'No', data.esi_in_netpay || 'No',
    data.lwf_in_netpay || 'No', data.prof_tax_in_netpay || 'No',
    data.lwf_calculate || 'Gross', JSON.stringify(data.lwf_allowances || []),
    id
  );
  return getDepartmentById(id);
}

function deleteDepartment(id) {
  const db = getDB();
  db.prepare('DELETE FROM departments WHERE id = ?').run(id);
  return { deleted: true };
}

// ─── Designations ──────────────────────────────────────────────────────────────

function getDesignations(companyId) {
  const db = getDB();
  return db.prepare(
    'SELECT * FROM designations WHERE company_id = ? ORDER BY name'
  ).all(companyId);
}

function getDesignationById(id) {
  const db = getDB();
  return db.prepare('SELECT * FROM designations WHERE id = ?').get(id);
}

function createDesignation(data) {
  const db = getDB();
  const id = newId();
  db.prepare(`
    INSERT INTO designations (id, company_id, name, profile, category)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, data.company_id, data.name, data.profile || '', data.category || '');
  return getDesignationById(id);
}

function updateDesignation(id, data) {
  const db = getDB();
  db.prepare(`
    UPDATE designations SET name = ?, profile = ?, category = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(data.name, data.profile || '', data.category || '', id);
  return getDesignationById(id);
}

function deleteDesignation(id) {
  const db = getDB();
  db.prepare('DELETE FROM designations WHERE id = ?').run(id);
  return { deleted: true };
}

// ─── Branches ──────────────────────────────────────────────────────────────────

function getBranches(companyId) {
  const db = getDB();
  return db.prepare(
    'SELECT * FROM branches WHERE company_id = ? ORDER BY name'
  ).all(companyId);
}

function getBranchById(id) {
  const db = getDB();
  return db.prepare('SELECT * FROM branches WHERE id = ?').get(id);
}

function createBranch(data) {
  const db = getDB();
  const id = newId();
  db.prepare(`
    INSERT INTO branches (
      id, company_id, name, address,
      epf_status, epf_coverage_date, epf_state, epf_district, epf_number, epf_office_address,
      esi_status, esi_coverage_date, esic_number, esic_office_address,
      lwf_status, lwf_coverage_date,
      prof_tax_status, prof_tax_coverage_date,
      state, ot_percentage, ot_allowances
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.company_id, data.name, data.address || '',
    data.epf_status || 'No', data.epf_coverage_date || '',
    data.epf_state || '', data.epf_district || '',
    data.epf_number || '', data.epf_office_address || '',
    data.esi_status || 'No', data.esi_coverage_date || '',
    data.esic_number || '', data.esic_office_address || '',
    data.lwf_status || 'No', data.lwf_coverage_date || '',
    data.prof_tax_status || 'No', data.prof_tax_coverage_date || '',
    data.state || '',
    data.ot_percentage || 0, JSON.stringify(data.ot_allowances || [])
  );
  return getBranchById(id);
}

function updateBranch(id, data) {
  const db = getDB();
  db.prepare(`
    UPDATE branches SET
      name = ?, address = ?,
      epf_status = ?, epf_coverage_date = ?, epf_state = ?, epf_district = ?,
      epf_number = ?, epf_office_address = ?,
      esi_status = ?, esi_coverage_date = ?, esic_number = ?, esic_office_address = ?,
      lwf_status = ?, lwf_coverage_date = ?,
      prof_tax_status = ?, prof_tax_coverage_date = ?,
      state = ?, ot_percentage = ?, ot_allowances = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    data.name, data.address || '',
    data.epf_status || 'No', data.epf_coverage_date || '',
    data.epf_state || '', data.epf_district || '',
    data.epf_number || '', data.epf_office_address || '',
    data.esi_status || 'No', data.esi_coverage_date || '',
    data.esic_number || '', data.esic_office_address || '',
    data.lwf_status || 'No', data.lwf_coverage_date || '',
    data.prof_tax_status || 'No', data.prof_tax_coverage_date || '',
    data.state || '',
    data.ot_percentage || 0, JSON.stringify(data.ot_allowances || []),
    id
  );
  return getBranchById(id);
}

function deleteBranch(id) {
  const db = getDB();
  db.prepare('DELETE FROM branches WHERE id = ?').run(id);
  return { deleted: true };
}

module.exports = {
  getDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment,
  getDesignations, getDesignationById, createDesignation, updateDesignation, deleteDesignation,
  getBranches, getBranchById, createBranch, updateBranch, deleteBranch,
};
