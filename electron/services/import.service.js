/**
 * PaySmart Pro — Excel Import Service
 *
 * Handles:
 *  1. Template generation (Employee & Attendance)
 *  2. File parsing (read uploaded Excel → JSON rows)
 *  3. Bulk insert with per-row validation
 */

const ExcelJS = require('exceljs');
const path    = require('path');
const { getDB, newId } = require('../db/database');
const bcrypt  = require('bcryptjs');

// ─── Column definitions ───────────────────────────────────────────────────────

const EMPLOYEE_COLUMNS = [
  { key: 'emp_code',         header: 'Employee Code *',       width: 14, required: true },
  { key: 'prefix',           header: 'Prefix',                width: 8,  note: 'Mr / Ms / Dr' },
  { key: 'first_name',       header: 'First Name *',          width: 18, required: true },
  { key: 'last_name',        header: 'Last Name *',           width: 18, required: true },
  { key: 'gender',           header: 'Gender',                width: 10, note: 'male / female / other' },
  { key: 'date_of_birth',    header: 'Date of Birth *',       width: 14, required: true, note: 'DD-MM-YYYY' },
  { key: 'date_of_joining',  header: 'Date of Joining *',     width: 14, required: true, note: 'DD-MM-YYYY' },
  { key: 'department',       header: 'Department',            width: 20 },
  { key: 'designation',      header: 'Designation',           width: 22 },
  { key: 'grade',            header: 'Grade',                 width: 10 },
  { key: 'location',         header: 'Location',              width: 16 },
  { key: 'employment_type',  header: 'Employment Type',       width: 16, note: 'permanent / contract / probation / intern' },
  { key: 'pan',              header: 'PAN Number',            width: 14 },
  { key: 'uan',              header: 'UAN (PF)',              width: 16 },
  { key: 'bank_account',     header: 'Bank Account Number',   width: 22 },
  { key: 'bank_ifsc',        header: 'Bank IFSC Code',        width: 14 },
  { key: 'bank_name',        header: 'Bank Name',             width: 22 },
  { key: 'phone',            header: 'Phone Number',          width: 14 },
  { key: 'email',            header: 'Official Email',        width: 26 },
  { key: 'is_pf_enabled',         header: 'PF Enabled',            width: 12, note: 'Yes / No' },
  { key: 'is_esi_enabled',        header: 'ESI Enabled',           width: 12, note: 'Yes / No' },
  { key: 'esi_insurance_number',  header: 'ESI Insurance No.',     width: 18, note: 'Employee ESI IP Number' },
  { key: 'tds_regime',            header: 'TDS Regime',            width: 12, note: 'new / old' },
  { key: 'annual_ctc',            header: 'Annual CTC (₹)',        width: 16, note: 'e.g. 600000' }
];

const ATTENDANCE_COLUMNS = [
  { key: 'emp_code',        header: 'Employee Code *',  width: 16, required: true },
  { key: 'present_days',    header: 'Present Days *',   width: 14, required: true, note: 'Number (0 - working days)' },
  { key: 'paid_leave_days', header: 'Paid Leave Days',  width: 16, note: 'Number' },
  { key: 'ot_hours',        header: 'OT Hours',         width: 12, note: 'Number' },
  { key: 'notes',           header: 'Notes',            width: 30 }
];

// ─── Template Generation ──────────────────────────────────────────────────────

async function generateEmployeeTemplate(savePath) {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'PaySmart Pro';
  wb.created  = new Date();

  const ws = wb.addWorksheet('Employees', { views: [{ freezeRow: 3 }] });

  // Title row
  ws.mergeCells('A1:X1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'PaySmart Pro — Employee Import Template';
  titleCell.font  = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // Instructions row
  ws.mergeCells('A2:X2');
  const instrCell = ws.getCell('A2');
  instrCell.value = '* Required fields. Do not remove or rename header row (row 3). Date format: DD-MM-YYYY. Delete this row before saving.';
  instrCell.font  = { italic: true, size: 10, color: { argb: 'FF92400E' } };
  instrCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  instrCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  ws.getRow(2).height = 22;

  // Header row
  const headerRow = ws.getRow(3);
  EMPLOYEE_COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font  = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF93C5FD' } } };
    ws.getColumn(i + 1).width = col.width;
    // Add note for format hint
    if (col.note) {
      cell.note = { texts: [{ text: col.note }] };
    }
  });
  headerRow.height = 30;

  // Sample data row
  const sampleRow = ws.getRow(4);
  const sample = [
    'EMP001', 'Mr', 'Rahul', 'Sharma', 'male', '15-05-1990', '01-04-2023',
    'Engineering', 'Software Engineer', 'G3', 'Mumbai', 'permanent',
    'ABCDE1234F', '100123456789', '12345678901234', 'HDFC0001234', 'HDFC Bank',
    '9876543210', 'rahul.sharma@company.com', 'Yes', 'Yes', '3100123456', 'new', '600000'
  ];
  sample.forEach((val, i) => {
    const cell = sampleRow.getCell(i + 1);
    cell.value = val;
    cell.font  = { color: { argb: 'FF6B7280' }, italic: true };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
  });

  // Add data validation for Yes/No columns
  ['T', 'U'].forEach(col => {
    ws.getCell(`${col}4`).dataValidation = {
      type: 'list', allowBlank: true,
      formulae: ['"Yes,No"'], showDropDown: false
    };
  });
  // TDS regime
  ws.getCell('V4').dataValidation = {
    type: 'list', allowBlank: true,
    formulae: ['"new,old"']
  };
  // Employment type
  ws.getCell('L4').dataValidation = {
    type: 'list', allowBlank: true,
    formulae: ['"permanent,contract,probation,intern"']
  };
  // Gender
  ws.getCell('E4').dataValidation = {
    type: 'list', allowBlank: true,
    formulae: ['"male,female,other"']
  };
  // Prefix
  ws.getCell('B4').dataValidation = {
    type: 'list', allowBlank: true,
    formulae: ['"Mr,Ms,Dr"']
  };

  await wb.xlsx.writeFile(savePath);
  return savePath;
}

async function generateAttendanceTemplate(savePath, companyId, month, year) {
  const db = getDB();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PaySmart Pro';
  wb.created = new Date();

  const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long' });
  const ws = wb.addWorksheet(`Attendance ${monthName} ${year}`, { views: [{ freezeRow: 3 }] });

  // Title
  ws.mergeCells('A1:F1');
  const t = ws.getCell('A1');
  t.value = `PaySmart Pro — Attendance Import: ${monthName} ${year}`;
  t.font  = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  t.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 26;

  // Instructions
  ws.mergeCells('A2:F2');
  const instr = ws.getCell('A2');
  instr.value = '* Required. Enter present days and paid leaves. LOP is auto-calculated by the engine on import.';
  instr.font  = { italic: true, size: 10, color: { argb: 'FF065F46' } };
  instr.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  ws.getRow(2).height = 20;

  // Headers
  const hdr = ws.getRow(3);
  ATTENDANCE_COLUMNS.forEach((col, i) => {
    const cell = hdr.getCell(i + 1);
    cell.value = col.header;
    cell.font  = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getColumn(i + 1).width = col.width;
  });
  hdr.height = 28;

  // Pre-fill employee rows if companyId provided
  if (companyId) {
    const employees = db.prepare(`
      SELECT emp_code, first_name, last_name FROM employees
      WHERE company_id = ? AND status = 'active' AND deleted_at IS NULL
      ORDER BY emp_code
    `).all(companyId);

    employees.forEach((emp, i) => {
      const row = ws.getRow(4 + i);
      row.getCell(1).value = emp.emp_code;
      row.getCell(2).value = '';   // present_days — user fills
      row.getCell(3).value = '0';  // paid_leave
      row.getCell(4).value = '0';  // ot_hours
      row.getCell(5).value = '';   // notes
      // Hint: employee name in notes column background
      row.getCell(1).note = { texts: [{ text: `${emp.first_name} ${emp.last_name}` }] };
    });
  } else {
    // Sample row
    const s = ws.getRow(4);
    ['EMP001', '26', '0', '0', ''].forEach((v, i) => { s.getCell(i + 1).value = v; });
  }

  await wb.xlsx.writeFile(savePath);
  return savePath;
}

// ─── File Parsing ─────────────────────────────────────────────────────────────

async function parseEmployeeFile(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('No worksheet found in file.');

  const rows = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum < 4) return; // skip title, instructions, header
    const vals = row.values; // 1-indexed

    const emp = {
      emp_code:        clean(vals[1]),
      prefix:          clean(vals[2]) || 'Mr',
      first_name:      clean(vals[3]),
      last_name:       clean(vals[4]),
      gender:          clean(vals[5])?.toLowerCase() || 'male',
      date_of_birth:   parseDate(clean(vals[6])),
      date_of_joining: parseDate(clean(vals[7])),
      department:      clean(vals[8]) || '',
      designation:     clean(vals[9]) || '',
      grade:           clean(vals[10]) || '',
      location:        clean(vals[11]) || '',
      employment_type: clean(vals[12])?.toLowerCase() || 'permanent',
      pan:             clean(vals[13])?.toUpperCase() || '',
      uan:             clean(vals[14]) || '',
      bank_account:    clean(vals[15]) || '',
      bank_ifsc:       clean(vals[16])?.toUpperCase() || '',
      bank_name:       clean(vals[17]) || '',
      phone:           clean(vals[18]) || '',
      email:           clean(vals[19]) || '',
      is_pf_enabled:        yesNo(vals[20]),
      is_esi_enabled:       yesNo(vals[21]),
      esi_insurance_number: clean(vals[22]) || '',
      tds_regime:           clean(vals[23])?.toLowerCase() || 'new',
      annual_ctc:           parseFloat(clean(vals[24])) || 0,
      _rowNum: rowNum
    };

    // Skip completely empty rows
    if (!emp.emp_code && !emp.first_name && !emp.last_name) return;
    rows.push(emp);
  });

  return rows;
}

async function parseAttendanceFile(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('No worksheet found in file.');

  const rows = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum < 4) return;
    const vals = row.values;

    const att = {
      emp_code:        clean(vals[1]),
      present_days:    parseFloat(clean(vals[2])),
      paid_leave_days: parseFloat(clean(vals[3])) || 0,
      ot_hours:        parseFloat(clean(vals[4])) || 0,
      notes:           clean(vals[5]) || '',
      _rowNum: rowNum
    };

    if (!att.emp_code) return;
    rows.push(att);
  });

  return rows;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a single employee row.
 *
 * @param {object}  row
 * @param {object}  db_sets  — sets loaded from DB before the loop:
 *                             { codes, pans, uans, bankAccounts, esiNumbers, aadhaarLast4s }
 * @param {object}  batch    — sets accumulated from rows already accepted this batch (same keys)
 */
function validateEmployeeRow(row, db_sets = {}, batch = {}) {
  const errors = [];

  // ── Required fields ────────────────────────────────────────────────────────
  if (!row.emp_code)        errors.push('Employee code is required.');
  if (!row.first_name)      errors.push('First name is required.');
  if (!row.last_name)       errors.push('Last name is required.');
  if (!row.date_of_birth)   errors.push('Date of birth is invalid or missing (use DD-MM-YYYY).');
  if (!row.date_of_joining) errors.push('Date of joining is invalid or missing (use DD-MM-YYYY).');

  // ── Format checks ──────────────────────────────────────────────────────────
  if (row.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(row.pan))
    errors.push('PAN format invalid (expected: ABCDE1234F).');
  if (row.uan && !/^\d{12}$/.test(row.uan))
    errors.push('UAN must be exactly 12 digits.');
  if (row.bank_ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(row.bank_ifsc))
    errors.push('IFSC format invalid (expected: HDFC0001234).');
  if (row.esi_insurance_number && !/^\d{10,17}$/.test(row.esi_insurance_number))
    errors.push('ESI Insurance Number must be 10–17 digits.');

  const code     = row.emp_code?.toUpperCase();
  const pan      = row.pan?.toUpperCase();
  const uan      = row.uan;
  const bank     = row.bank_account;
  const esi      = row.esi_insurance_number;
  const aadhaar4 = row.aadhaar_last4;

  // ── Duplicate checks: existing DB records ─────────────────────────────────
  if (code && db_sets.codes?.has(code))
    errors.push(`Employee code "${row.emp_code}" already exists in the system.`);
  if (pan && db_sets.pans?.has(pan))
    errors.push(`PAN "${row.pan}" is already registered to another employee.`);
  if (uan && db_sets.uans?.has(uan))
    errors.push(`UAN "${uan}" is already registered to another employee.`);
  if (bank && db_sets.bankAccounts?.has(bank))
    errors.push(`Bank account "${bank}" is already linked to another employee.`);
  if (esi && db_sets.esiNumbers?.has(esi))
    errors.push(`ESI Insurance Number "${esi}" is already registered to another employee.`);

  // ── Duplicate checks: same import batch ───────────────────────────────────
  if (code && batch.codes?.has(code))
    errors.push(`Employee code "${row.emp_code}" appears more than once in this import file.`);
  if (pan && batch.pans?.has(pan))
    errors.push(`PAN "${row.pan}" is duplicated within this import file.`);
  if (uan && batch.uans?.has(uan))
    errors.push(`UAN "${uan}" is duplicated within this import file.`);
  if (bank && batch.bankAccounts?.has(bank))
    errors.push(`Bank account "${bank}" is duplicated within this import file.`);
  if (esi && batch.esiNumbers?.has(esi))
    errors.push(`ESI Insurance Number "${esi}" is duplicated within this import file.`);

  return errors;
}

function validateAttendanceRow(row, empCodeMap = {}) {
  const errors = [];
  if (!row.emp_code) errors.push('Employee code is required.');
  else if (!empCodeMap[row.emp_code?.toUpperCase()]) errors.push(`Employee code "${row.emp_code}" not found.`);
  if (isNaN(row.present_days)) errors.push('Present days must be a number.');
  return errors;
}

// ─── Bulk Import ─────────────────────────────────────────────────────────────

async function importEmployees(rows, companyId) {
  const db = getDB();

  // ── Load existing records from DB for uniqueness checks ──────────────────
  const existing = db.prepare(
    `SELECT emp_code FROM employees WHERE company_id = ? AND deleted_at IS NULL`
  ).all(companyId);
  const existingCodes = new Set(existing.map(e => e.emp_code?.toUpperCase()));

  // Load identity fields across ALL companies (PAN/UAN/bank are globally unique)
  const existingIdentity = db.prepare(`
    SELECT ei.pan, ei.uan, ei.bank_account_number, ei.esi_insurance_number
    FROM employee_identity ei
    JOIN employees e ON e.id = ei.emp_id
    WHERE e.deleted_at IS NULL
  `).all();

  const db_sets = {
    codes:       existingCodes,
    pans:        new Set(existingIdentity.filter(r => r.pan).map(r => r.pan.toUpperCase())),
    uans:        new Set(existingIdentity.filter(r => r.uan).map(r => r.uan)),
    bankAccounts:new Set(existingIdentity.filter(r => r.bank_account_number).map(r => r.bank_account_number)),
    esiNumbers:  new Set(existingIdentity.filter(r => r.esi_insurance_number).map(r => r.esi_insurance_number))
  };

  // ── Within-batch tracking (catches intra-file duplicates) ─────────────────
  const batch = { codes: new Set(), pans: new Set(), uans: new Set(), bankAccounts: new Set(), esiNumbers: new Set() };

  const results = { imported: 0, skipped: 0, errors: [] };

  const insertEmp = db.transaction((row) => {
    const empId = newId();
    const now = new Date().toISOString();

    // Core employee record
    db.prepare(`
      INSERT INTO employees (
        id, company_id, emp_code, prefix, first_name, last_name, gender,
        dob, doj, department, designation, grade, location, employment_type,
        status, created_at, updated_at, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 0)
    `).run(
      empId, companyId,
      row.emp_code.toUpperCase(), row.prefix, row.first_name, row.last_name,
      row.gender, row.date_of_birth, row.date_of_joining,
      row.department, row.designation, row.grade, row.location, row.employment_type,
      now, now
    );

    // Identity record
    if (row.pan || row.uan || row.bank_account || row.bank_ifsc || row.phone || row.email || row.esi_insurance_number) {
      db.prepare(`
        INSERT INTO employee_identity (
          id, emp_id, pan, uan, esi_insurance_number,
          bank_account_number, bank_ifsc, bank_name,
          phone_primary, email_official, created_at, updated_at, synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        newId(), empId,
        row.pan || null, row.uan || null, row.esi_insurance_number || null,
        row.bank_account || null, row.bank_ifsc || null, row.bank_name || null,
        row.phone || null, row.email || null, now, now
      );
    }

    // Statutory config
    db.prepare(`
      INSERT INTO employee_statutory_config (
        id, emp_id, company_id, is_pf_enabled, pf_contribution_type, voluntary_pf_pct,
        is_esi_enabled, is_tds_enabled, tds_regime, is_pt_enabled,
        is_ot_applicable, ot_multiplier, ot_calc_basis,
        is_advance_recovery_active, advance_outstanding, advance_monthly_deduction,
        created_at, updated_at, synced
      ) VALUES (?, ?, ?, ?, 'statutory', 0, ?, 1, ?, 1, 0, 1.5, 'basic', 0, 0, 0, ?, ?, 0)
    `).run(
      newId(), empId, companyId,
      row.is_pf_enabled, row.is_esi_enabled,
      row.tds_regime, now, now
    );

    // Salary assignment (if CTC provided)
    if (row.annual_ctc > 0) {
      // Find first available salary structure for this company
      const structure = db.prepare(`SELECT id FROM salary_structures WHERE company_id = ? AND is_active = 1 ORDER BY created_at ASC LIMIT 1`).get(companyId);
      if (structure) {
        const yr = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
        db.prepare(`
          INSERT INTO employee_salary (
            id, emp_id, structure_id, ctc, monthly_ctc, component_overrides,
            effective_from, revision_reason, revised_by, created_at, updated_at, synced
          ) VALUES (?, ?, ?, ?, ?, '{}', ?, 'Initial Structuring', 'import', ?, ?, 0)
        `).run(
          newId(), empId, structure.id,
          row.annual_ctc, row.annual_ctc / 12,
          `${yr}-04-01`, now, now
        );
      }
    }

    return empId;
  });

  for (const row of rows) {
    const errors = validateEmployeeRow(row, db_sets, batch);
    if (errors.length > 0) {
      results.skipped++;
      results.errors.push({ rowNum: row._rowNum, emp_code: row.emp_code, errors });
      continue;
    }
    try {
      insertEmp(row);

      // Add to both DB sets and batch sets so subsequent rows in this file see them
      const code = row.emp_code?.toUpperCase();
      const pan  = row.pan?.toUpperCase();
      if (code) { db_sets.codes.add(code);        batch.codes.add(code); }
      if (pan)  { db_sets.pans.add(pan);           batch.pans.add(pan); }
      if (row.uan)              { db_sets.uans.add(row.uan);                        batch.uans.add(row.uan); }
      if (row.bank_account)     { db_sets.bankAccounts.add(row.bank_account);       batch.bankAccounts.add(row.bank_account); }
      if (row.esi_insurance_number) { db_sets.esiNumbers.add(row.esi_insurance_number); batch.esiNumbers.add(row.esi_insurance_number); }

      results.imported++;
    } catch (e) {
      results.skipped++;
      results.errors.push({ rowNum: row._rowNum, emp_code: row.emp_code, errors: [e.message] });
    }
  }

  return results;
}

async function importAttendance(rows, companyId, month, year) {
  const db = getDB();

  // Build emp_code → emp_id map
  const employees = db.prepare(`SELECT id, emp_code FROM employees WHERE company_id = ? AND status = 'active' AND deleted_at IS NULL`).all(companyId);
  const empCodeMap = {};
  employees.forEach(e => { empCodeMap[e.emp_code?.toUpperCase()] = e.id; });

  // Get working days
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  const company = db.prepare(`SELECT working_days_per_week FROM companies WHERE id = ?`).get(companyId);
  const weeklyOffDays = company?.working_days_per_week === 5 ? 2 : 1;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && !(weeklyOffDays === 2 && dow === 6)) workingDays++;
  }

  const results = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    const errors = validateAttendanceRow(row, empCodeMap);
    if (errors.length > 0) {
      results.skipped++;
      results.errors.push({ rowNum: row._rowNum, emp_code: row.emp_code, errors });
      continue;
    }

    const empId = empCodeMap[row.emp_code.toUpperCase()];
    const lopDays = Math.max(0, workingDays - row.present_days - row.paid_leave_days);

    const existing = db.prepare(`SELECT id FROM attendance_logs WHERE emp_id = ? AND month = ? AND year = ?`).get(empId, month, year);
    const now = new Date().toISOString();

    try {
      if (existing) {
        db.prepare(`
          UPDATE attendance_logs SET
            present_days = ?, paid_leave_days = ?, unpaid_leave_days = ?,
            lop_days = ?, ot_hours = ?, notes = ?,
            total_working_days = ?, total_calendar_days = ?,
            updated_at = ?, synced = 0
          WHERE id = ?
        `).run(
          row.present_days, row.paid_leave_days, 0,
          lopDays, row.ot_hours, row.notes,
          workingDays, daysInMonth, now, existing.id
        );
        results.updated++;
      } else {
        db.prepare(`
          INSERT INTO attendance_logs (
            id, emp_id, company_id, month, year,
            total_calendar_days, total_working_days,
            present_days, paid_leave_days, unpaid_leave_days,
            lop_days, ot_hours, notes,
            is_attendance_locked, source, created_at, updated_at, synced
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 0, 'import', ?, ?, 0)
        `).run(
          newId(), empId, companyId, month, year,
          daysInMonth, workingDays,
          row.present_days, row.paid_leave_days,
          lopDays, row.ot_hours, row.notes, now, now
        );
        results.imported++;
      }
    } catch (e) {
      results.skipped++;
      results.errors.push({ rowNum: row._rowNum, emp_code: row.emp_code, errors: [e.message] });
    }
  }

  return results;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clean(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object' && val.text) return val.text?.toString().trim() || '';
  if (typeof val === 'object' && val.result) return val.result?.toString().trim() || '';
  return val?.toString().trim() || '';
}

function yesNo(val) {
  const s = clean(val).toLowerCase();
  return (s === 'yes' || s === '1' || s === 'true') ? 1 : 0;
}

function parseDate(str) {
  if (!str) return null;
  // DD-MM-YYYY or DD/MM/YYYY
  const match = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
  // Try ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // Excel serial date number
  const num = parseFloat(str);
  if (!isNaN(num) && num > 1000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

module.exports = {
  generateEmployeeTemplate,
  generateAttendanceTemplate,
  parseEmployeeFile,
  parseAttendanceFile,
  validateEmployeeRow,
  validateAttendanceRow,
  importEmployees,
  importAttendance,
  EMPLOYEE_COLUMNS,
  ATTENDANCE_COLUMNS
};
