// electron/ipc/report.ipc.js
const { ipcMain, shell } = require('electron');
const { generatePaySlips, generateSalarySheet, generateMonthlySummary, getOutputPath } = require('../services/report.service');
const { getDB } = require('../db/database');

// ── Helper: build month label from month/year integers ──────────────────────
function buildMonthLabel(month, year) {
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${months[(month - 1) % 12] || 'Unknown'} - ${year}`;
}

// ── Helper: build report data from DB ────────────────────────────────────────

function getReportData(companyId, payrollRunId) {
  const db = getDB();
  
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
  const run = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(payrollRunId);
  if (!company || !run) throw new Error('Company or payroll run not found');

  const monthLabel = buildMonthLabel(run.month, run.year);

  const companyData = {
    name: company.name,
    address: [company.address_line1, company.city, company.state_code, company.pincode].filter(Boolean).join(', '),
    month_label: monthLabel,
    epf_number: company.pf_number || '',
    esi_number: company.esi_number || '',
    month: run.month,
    year:  run.year,
  };

  // Fetch payroll details joined with employee + identity + attendance
  // Use correct column names from the actual schema
  const details = db.prepare(`
    SELECT
      pd.*,
      e.emp_code,
      (COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'')) AS emp_full_name,
      e.designation,
      e.doj,
      e.department,
      e.location,
      ei.uan,
      ei.esi_insurance_number AS esic_no,
      ei.bank_name,
      ei.bank_account_number AS bank_account,
      ei.bank_ifsc AS ifsc,
      ei.aadhaar_last4 AS aadhar,
      al.present_days AS workday,
      al.lop_days,
      al.paid_leave_days AS paid_days,
      al.ot_hours AS att_ot_hours,
      al.total_working_days
    FROM payroll_details pd
    JOIN employees e ON pd.emp_id = e.id
    LEFT JOIN employee_identity ei ON e.id = ei.emp_id
    LEFT JOIN attendance_logs al ON e.id = al.emp_id
      AND al.month = ? AND al.year = ? AND al.company_id = ?
    WHERE pd.run_id = ?
    ORDER BY e.first_name
  `).all(run.month, run.year, companyId, payrollRunId);

  if (!details || details.length === 0) {
    throw new Error('No payroll data found for this period.');
  }

  // Map payroll_details columns to report-friendly names
  const employees = details.map(d => ({
    // Identity
    employee_code: d.emp_code,
    name: d.emp_full_name || d.emp_name || '',
    designation: d.designation || '',
    doj: d.doj || '',
    department: d.department || '',
    location: d.location || company.name,
    uan: d.uan || '',
    esic_no: d.esic_no || '',
    bank_name: d.bank_name || '',
    bank_account: d.bank_account || '',
    ifsc: d.ifsc || '',
    aadhar: d.aadhar || '',
    // Attendance
    workday: d.workday || d.present_days || 0,
    weekoff: 0,
    nfh: 0,
    el: 0,
    cl: 0,
    sl: 0,
    lop_days: d.lop_days || 0,
    paid_days: d.paid_days || d.present_days || 0,
    ot_hours: d.att_ot_hours || d.ot_hours || 0,
    total_working_days: d.total_working_days || d.working_days || 0,
    // Earnings — map from payroll_details native columns
    basic_earned: d.basic_earned || d.basic || 0,
    hra_earned: d.hra_earned || d.hra || 0,
    convey_earned: d.convey_earned || d.conveyance || 0,
    spl_all_earned: d.spl_all_earned || d.special_allowance || 0,
    medical_earned: d.medical_allowance || 0,
    da_earned: d.da || 0,
    lta_earned: d.lta || 0,
    ot_earned: d.ot_earned || d.ot_amount || 0,
    gross_earned: d.gross_earned || d.gross_salary || 0,
    // Deductions
    epf_employee: d.epf_employee || d.pf_employee || 0,
    vol_epf: d.vol_epf || 0,
    esic_employee: d.esic_employee || d.esi_employee || 0,
    lwf_employee: d.lwf_employee || 0,
    prof_tax: d.prof_tax || d.pt || 0,
    tds: d.tds || 0,
    advance: d.advance || d.advance_recovery || 0,
    loan: d.loan || 0,
    food: d.food || 0,
    total_deductions: d.total_deductions || 0,
    net_pay: d.net_pay || d.net_salary || 0,
    // Monthly rate (annual CTC ÷ 12, rounded)
    monthly_ctc: Math.round((d.ctc || 0) / 12),
    // For EPF summary
    epf_wages: d.basic_earned || d.basic || 0,
    pf_employer: d.pf_employer || 0,
    eps_contribution: d.eps_contribution || 0,
    edli_contribution: d.edli_contribution || 0,
    esi_employer: d.esi_employer || 0,
    lop_deduction: d.lop_deduction || 0,
    ctc: d.ctc || 0,
  }));

  return { company: companyData, run, employees };
}

function buildSummaryTotals(employees) {
  const sum = (key) => employees.reduce((a, e) => a + Number(e[key] || 0), 0);
  return {
    basic: sum('basic_earned'),
    hra: sum('hra_earned'),
    convey: sum('convey_earned'),
    spl_all: sum('spl_all_earned'),
    medical: sum('medical_earned'),
    da: sum('da_earned'),
    lta: sum('lta_earned'),
    ot_amount: sum('ot_earned'),
    gross_earned: sum('gross_earned'),
    epf_employee: sum('epf_employee'),
    vol_epf: sum('vol_epf'),
    esic_employee: sum('esic_employee'),
    lwf_employee: sum('lwf_employee'),
    prof_tax: sum('prof_tax'),
    tds: sum('tds'),
    advance: sum('advance'),
    loan: sum('loan'),
    food: sum('food'),
    total_deductions: sum('total_deductions'),
    net_pay: sum('net_pay'),
  };
}

// ── IPC Channels ──────────────────────────────────────────────────────────────

// Generate Pay Slips PDF
ipcMain.handle('report:generate-payslips', async (_, { companyId, payrollRunId }) => {
  try {
    const { company, employees } = getReportData(companyId, payrollRunId);
    const filename = `PaySlips_${company.month_label.replace(/ - /g, '_').replace(/ /g, '_')}.pdf`;
    const outputPath = getOutputPath(filename);
    await generatePaySlips({ company, employees }, outputPath);
    shell.openPath(outputPath);
    return { success: true, path: outputPath };
  } catch (err) {
    console.error('[Report] PaySlips error:', err);
    return { success: false, error: err.message };
  }
});

// Generate Salary Sheet PDF
ipcMain.handle('report:generate-salary-sheet', async (_, { companyId, payrollRunId }) => {
  try {
    const { company, employees } = getReportData(companyId, payrollRunId);
    const filename = `SalarySheet_${company.month_label.replace(/ - /g, '_').replace(/ /g, '_')}.pdf`;
    const outputPath = getOutputPath(filename);
    await generateSalarySheet({ company, employees }, outputPath);
    shell.openPath(outputPath);
    return { success: true, path: outputPath };
  } catch (err) {
    console.error('[Report] SalarySheet error:', err);
    return { success: false, error: err.message };
  }
});

// Generate Monthly Summary PDF
ipcMain.handle('report:generate-summary', async (_, { companyId, payrollRunId }) => {
  try {
    const { company, employees, run } = getReportData(companyId, payrollRunId);
    const totals = buildSummaryTotals(employees);

    // EPF data
    const db = getDB();
    const epfConfig = db.prepare('SELECT * FROM statutory_pf_config WHERE company_id = ?').get(companyId) || {};
    const epfMembers = employees.filter(e => Number(e.epf_employee || 0) > 0).length;
    const epfWages = employees.filter(e => Number(e.epf_employee || 0) > 0)
                              .reduce((a, e) => a + Number(e.epf_wages || e.basic_earned || 0), 0);
    const exemptEmp = employees.filter(e => Number(e.epf_employee || 0) === 0);

    const epf_employee_a1 = totals.epf_employee;
    const pension_a10 = Math.round(epfWages * 0.0833);
    const employer_diff_a1 = totals.epf_employee - pension_a10;
    const admin_a2 = Math.round(epfWages * 0.0050);
    const edli_a21 = Math.round(epfWages * 0.005);
    const edli_charges_a22 = Math.round(epfWages * 0.00005) || 0;
    const employer_epf = totals.epf_employee;
    const total_challan = epf_employee_a1 + employer_epf + admin_a2 + edli_a21;

    // ESI data
    const esiEmployee = totals.esic_employee;
    const esiWages = employees.filter(e => Number(e.esic_employee || 0) > 0)
                              .reduce((a, e) => a + Number(e.gross_earned || 0), 0);
    const esiEmployer = Math.round(esiWages * 0.0325);

    const summaryData = {
      company,
      totals,
      epf: {
        members: epfMembers,
        wages: epfWages,
        employee_a1: epf_employee_a1,
        pension_a10,
        employer_diff_a1,
        admin_a2,
        edli_a21,
        edli_charges_a22,
        total_challan,
      },
      esi: {
        wages: esiWages,
        employee: esiEmployee,
        employer: esiEmployer,
        total: esiEmployee + esiEmployer,
      },
      lwf: {
        employee: totals.lwf_employee,
        employer: Math.round(totals.lwf_employee * 2),
        total: Math.round(totals.lwf_employee * 3),
      },
      pt: { total: totals.prof_tax },
      employee_count: employees.length,
      epf_exempt_count: exemptEmp.length,
      epf_exempt_wages: exemptEmp.reduce((a, e) => a + Number(e.gross_earned || 0), 0),
    };

    const filename = `MonthlySummary_${company.month_label.replace(/ - /g, '_').replace(/ /g, '_')}.pdf`;
    const outputPath = getOutputPath(filename);
    await generateMonthlySummary(summaryData, outputPath);
    shell.openPath(outputPath);
    return { success: true, path: outputPath };
  } catch (err) {
    console.error('[Report] Summary error:', err);
    return { success: false, error: err.message };
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// EXCEL REPORT GENERATOR — shared helper
// ══════════════════════════════════════════════════════════════════════════════

async function generateExcelReport({ filename, sheetName, companyData, columns, rows, totalsKeys }) {
  const ExcelJS = require('exceljs');
  const path = require('path');
  const { app } = require('electron');
  const fs = require('fs');

  const dir = path.join(app.getPath('documents'), 'PaySmart Pro', 'Reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const outputPath = path.join(dir, filename);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName || 'Report');
  const colCount = columns.length;

  // company header rows
  ws.mergeCells(1, 1, 1, colCount);
  ws.getCell('A1').value = companyData.name || '';
  ws.getCell('A1').font  = { bold: true, size: 13 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells(2, 1, 2, colCount);
  ws.getCell('A2').value = (sheetName || '') + ' — ' + (companyData.month_label || '');
  ws.getCell('A2').font  = { bold: true, size: 11 };
  ws.getCell('A2').alignment = { horizontal: 'center' };
  ws.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };

  ws.addRow([]); // spacer

  // header row
  const headerRow = ws.addRow(columns.map(c => c.header));
  headerRow.eachCell(cell => {
    cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF334F70' } } };
  });
  headerRow.height = 28;

  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width || 14;
  });

  // data rows
  const totals = {};
  if (totalsKeys) totalsKeys.forEach(k => (totals[k] = 0));

  rows.forEach((row, idx) => {
    const values = columns.map(col => {
      const v = row[col.key];
      return col.type === 'number' ? (Number(v) || 0) : (v != null ? v : '');
    });
    const dataRow = ws.addRow(values);
    dataRow.eachCell((cell, colNum) => {
      cell.font = { size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid',
        fgColor: { argb: idx % 2 === 0 ? 'FFFFFFFF' : 'FFF0F4F8' } };
      const col = columns[colNum - 1];
      if (col && col.type === 'number') {
        cell.numFmt = col.numFmt || '#,##0.00';
        cell.alignment = { horizontal: 'right' };
      }
    });
    if (totalsKeys) totalsKeys.forEach(k => { totals[k] += Number(row[k] || 0); });
  });

  // totals row
  if (totalsKeys && rows.length > 0) {
    const totalValues = columns.map(col => {
      if (totalsKeys.includes(col.key)) return Number(totals[col.key].toFixed(2));
      if (col.key === '#') return 'TOTAL';
      return '';
    });
    const totalRow = ws.addRow(totalValues);
    totalRow.eachCell((cell, colNum) => {
      cell.font  = { bold: true, size: 10 };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      cell.border = { top: { style: 'thin' } };
      const col = columns[colNum - 1];
      if (col && col.type === 'number') {
        cell.numFmt = col.numFmt || '#,##0.00';
        cell.alignment = { horizontal: 'right' };
      }
    });
  }

  await wb.xlsx.writeFile(outputPath);
  return outputPath;
}

function getRunEmployees(companyId, payrollRunId) {
  const db = getDB();
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
  const run     = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(payrollRunId);
  if (!company || !run) throw new Error('Company or payroll run not found');

  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const month_label = months[(run.month - 1) % 12] + ' - ' + run.year;
  const companyData = {
    name: company.name, month_label,
    month: run.month, year: run.year,
    epf_number: company.pf_number || '',
    esi_number: company.esi_number || '',
  };

  const rows = db.prepare(`
    SELECT pd.*,
      (e.first_name || ' ' || e.last_name) AS full_name,
      e.doj, e.father_name, e.designation, e.department, e.location,
      ei.uan, ei.esi_insurance_number AS esic_no,
      ei.bank_name, ei.bank_account_number AS bank_acc, ei.bank_ifsc AS ifsc,
      al.present_days AS att_present, al.ot_hours AS att_ot,
      al.paid_leave_days AS att_pl, al.lop_days AS att_lop,
      al.total_working_days AS att_wd
    FROM payroll_details pd
    JOIN employees e ON pd.emp_id = e.id
    LEFT JOIN employee_identity ei ON e.id = ei.emp_id
    LEFT JOIN attendance_logs al ON e.id = al.emp_id
      AND al.month = ? AND al.year = ? AND al.company_id = ?
    WHERE pd.run_id = ?
    ORDER BY pd.emp_code
  `).all(run.month, run.year, companyId, payrollRunId);

  return { companyData, run, rows };
}

function safeNum(v) { return Number(v) || 0; }

// ─── EPF Report ───────────────────────────────────────────────────────────────
ipcMain.handle('report:generate-epf', async (_, { companyId, payrollRunId }) => {
  try {
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const data = rows.map((r, i) => ({
      '#': i + 1, emp_code: r.emp_code, name: r.full_name, uan: r.uan || '',
      epf_wages: safeNum(r.basic), epf_ee: safeNum(r.pf_employee),
      eps: safeNum(r.eps_contribution),
      epf_diff: safeNum(r.pf_employer) - safeNum(r.eps_contribution),
      edli: safeNum(r.edli_contribution), total_er: safeNum(r.pf_employer),
      grand_total: safeNum(r.pf_employee) + safeNum(r.pf_employer),
    }));
    const cols = [
      { key: '#',          header: '#',             width: 5  },
      { key: 'emp_code',   header: 'Emp Code',      width: 10 },
      { key: 'name',       header: 'Name',          width: 22 },
      { key: 'uan',        header: 'UAN',           width: 16 },
      { key: 'epf_wages',  header: 'EPF Wages',     width: 12, type: 'number' },
      { key: 'epf_ee',     header: 'EE (A/C 1)',    width: 11, type: 'number' },
      { key: 'eps',        header: 'EPS (A/C 10)',  width: 11, type: 'number' },
      { key: 'epf_diff',   header: 'EPF Diff',      width: 11, type: 'number' },
      { key: 'edli',       header: 'EDLI (A/C 21)', width: 11, type: 'number' },
      { key: 'total_er',   header: 'ER Total',      width: 11, type: 'number' },
      { key: 'grand_total',header: 'Grand Total',   width: 13, type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'EPF_Register_' + safe + '.xlsx', sheetName: 'EPF Register',
      companyData, columns: cols, rows: data,
      totalsKeys: ['epf_wages','epf_ee','eps','epf_diff','edli','total_er','grand_total'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── ESI Report ───────────────────────────────────────────────────────────────
ipcMain.handle('report:generate-esi', async (_, { companyId, payrollRunId }) => {
  try {
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const data = rows.map((r, i) => ({
      '#': i + 1, emp_code: r.emp_code, name: r.full_name, esic_no: r.esic_no || '',
      esi_wages: safeNum(r.gross_salary), ee: safeNum(r.esi_employee),
      er: safeNum(r.esi_employer),
      total: safeNum(r.esi_employee) + safeNum(r.esi_employer),
    }));
    const cols = [
      { key: '#',         header: '#',          width: 5  },
      { key: 'emp_code',  header: 'Emp Code',   width: 10 },
      { key: 'name',      header: 'Name',       width: 24 },
      { key: 'esic_no',   header: 'ESIC No.',   width: 18 },
      { key: 'esi_wages', header: 'ESI Wages',  width: 12, type: 'number' },
      { key: 'ee',        header: 'EE (0.75%)', width: 12, type: 'number' },
      { key: 'er',        header: 'ER (3.25%)', width: 12, type: 'number' },
      { key: 'total',     header: 'Total',      width: 12, type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'ESI_Register_' + safe + '.xlsx', sheetName: 'ESI Register',
      companyData, columns: cols, rows: data,
      totalsKeys: ['esi_wages','ee','er','total'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── LWF (Monthly) ────────────────────────────────────────────────────────────
ipcMain.handle('report:generate-lwf', async (_, { companyId, payrollRunId }) => {
  try {
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const data = rows.map((r, i) => ({
      '#': i + 1, emp_code: r.emp_code, name: r.full_name,
      designation: r.designation || '', gross: safeNum(r.gross_salary),
      ee: safeNum(r.lwf_employee), er: safeNum(r.lwf_employer),
      total: safeNum(r.lwf_employee) + safeNum(r.lwf_employer),
    }));
    const cols = [
      { key: '#',           header: '#',           width: 5  },
      { key: 'emp_code',    header: 'Emp Code',    width: 10 },
      { key: 'name',        header: 'Name',        width: 24 },
      { key: 'designation', header: 'Designation', width: 18 },
      { key: 'gross',       header: 'Gross Salary',width: 14, type: 'number' },
      { key: 'ee',          header: 'EE',          width: 10, type: 'number' },
      { key: 'er',          header: 'ER',          width: 10, type: 'number' },
      { key: 'total',       header: 'Total',       width: 10, type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'LWF_' + safe + '.xlsx', sheetName: 'LWF Register',
      companyData, columns: cols, rows: data,
      totalsKeys: ['gross','ee','er','total'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Professional Tax ─────────────────────────────────────────────────────────
ipcMain.handle('report:generate-pt', async (_, { companyId, payrollRunId }) => {
  try {
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const data = rows.map((r, i) => ({
      '#': i + 1, emp_code: r.emp_code, name: r.full_name,
      designation: r.designation || '', location: r.location || '',
      gross: safeNum(r.gross_salary), pt: safeNum(r.pt),
    }));
    const cols = [
      { key: '#',           header: '#',           width: 5  },
      { key: 'emp_code',    header: 'Emp Code',    width: 10 },
      { key: 'name',        header: 'Name',        width: 24 },
      { key: 'designation', header: 'Designation', width: 18 },
      { key: 'location',    header: 'Location',    width: 14 },
      { key: 'gross',       header: 'Gross Salary',width: 14, type: 'number' },
      { key: 'pt',          header: 'Prof. Tax',   width: 12, type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'ProfTax_' + safe + '.xlsx', sheetName: 'Professional Tax',
      companyData, columns: cols, rows: data,
      totalsKeys: ['gross','pt'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Overtime Report ──────────────────────────────────────────────────────────
ipcMain.handle('report:generate-ot', async (_, { companyId, payrollRunId }) => {
  try {
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const data = rows.map((r, i) => ({
      '#': i + 1, emp_code: r.emp_code, name: r.full_name,
      designation: r.designation || '', department: r.department || '',
      present: safeNum(r.att_present || r.present_days),
      ot_hours: safeNum(r.att_ot || r.ot_hours),
      ot_amount: safeNum(r.ot_amount), gross: safeNum(r.gross_salary),
    }));
    const cols = [
      { key: '#',           header: '#',           width: 5  },
      { key: 'emp_code',    header: 'Emp Code',    width: 10 },
      { key: 'name',        header: 'Name',        width: 24 },
      { key: 'designation', header: 'Designation', width: 18 },
      { key: 'department',  header: 'Department',  width: 16 },
      { key: 'present',     header: 'Present Days',width: 13, type: 'number' },
      { key: 'ot_hours',    header: 'OT Hours',    width: 11, type: 'number' },
      { key: 'ot_amount',   header: 'OT Amount',   width: 12, type: 'number' },
      { key: 'gross',       header: 'Gross',       width: 12, type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'OT_Report_' + safe + '.xlsx', sheetName: 'Overtime Report',
      companyData, columns: cols, rows: data,
      totalsKeys: ['ot_hours','ot_amount','gross'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Bank Statement ───────────────────────────────────────────────────────────
ipcMain.handle('report:generate-bank', async (_, { companyId, payrollRunId }) => {
  try {
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const data = rows.map((r, i) => ({
      '#': i + 1, emp_code: r.emp_code, name: r.full_name,
      bank_name: r.bank_name || '', account: r.bank_acc || r.bank_account || '',
      ifsc: r.ifsc || r.bank_ifsc || '', net_pay: safeNum(r.net_salary),
    }));
    const cols = [
      { key: '#',         header: '#',          width: 5  },
      { key: 'emp_code',  header: 'Emp Code',   width: 10 },
      { key: 'name',      header: 'Name',       width: 24 },
      { key: 'bank_name', header: 'Bank',       width: 16 },
      { key: 'account',   header: 'Account No', width: 20 },
      { key: 'ifsc',      header: 'IFSC',       width: 14 },
      { key: 'net_pay',   header: 'Net Pay',    width: 14, type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'BankStatement_' + safe + '.xlsx', sheetName: 'Bank Transfer',
      companyData, columns: cols, rows: data,
      totalsKeys: ['net_pay'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Arrear Report ────────────────────────────────────────────────────────────
ipcMain.handle('report:generate-arrear', async (_, { companyId, payrollRunId, baseRunId }) => {
  try {
    const db = getDB();
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const baseMap = {};
    if (baseRunId) {
      db.prepare('SELECT emp_id, net_salary FROM payroll_details WHERE run_id = ?')
        .all(baseRunId).forEach(r => { baseMap[r.emp_id] = safeNum(r.net_salary); });
    }
    const data = rows.map((r, i) => {
      const prev = baseMap[r.emp_id] || 0;
      const curr = safeNum(r.net_salary);
      return { '#': i+1, emp_code: r.emp_code, name: r.full_name,
        department: r.department||'', prev_net: prev, curr_net: curr, arrear: curr - prev };
    });
    const cols = [
      { key: '#',          header: '#',             width: 5  },
      { key: 'emp_code',   header: 'Emp Code',      width: 10 },
      { key: 'name',       header: 'Name',          width: 24 },
      { key: 'department', header: 'Department',    width: 16 },
      { key: 'prev_net',   header: 'Previous Net',  width: 14, type: 'number' },
      { key: 'curr_net',   header: 'Current Net',   width: 14, type: 'number' },
      { key: 'arrear',     header: 'Arrear (Diff)', width: 14, type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'Arrear_' + safe + '.xlsx', sheetName: 'Arrear Report',
      companyData, columns: cols, rows: data,
      totalsKeys: ['prev_net','curr_net','arrear'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Full & Final ─────────────────────────────────────────────────────────────
ipcMain.handle('report:generate-full-final', async (_, { companyId, payrollRunId }) => {
  try {
    const db = getDB();
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const data = rows.map((r, i) => {
      const emp = db.prepare('SELECT date_of_leaving, reason_for_leaving FROM employees WHERE id = ?').get(r.emp_id) || {};
      return {
        '#': i+1, emp_code: r.emp_code, name: r.full_name,
        designation: r.designation||'', doj: r.doj||'',
        dol: emp.date_of_leaving||'', reason: emp.reason_for_leaving||'',
        present: safeNum(r.att_present||r.present_days),
        gross: safeNum(r.gross_salary),
        deductions: safeNum(r.total_deductions), net: safeNum(r.net_salary),
      };
    });
    const cols = [
      { key: '#',           header: '#',          width: 5  },
      { key: 'emp_code',    header: 'Emp Code',   width: 10 },
      { key: 'name',        header: 'Name',       width: 22 },
      { key: 'designation', header: 'Designation',width: 16 },
      { key: 'doj',         header: 'DOJ',        width: 12 },
      { key: 'dol',         header: 'DOL',        width: 12 },
      { key: 'reason',      header: 'Reason',     width: 18 },
      { key: 'present',     header: 'Days',       width: 8,  type: 'number' },
      { key: 'gross',       header: 'Gross',      width: 12, type: 'number' },
      { key: 'deductions',  header: 'Deductions', width: 12, type: 'number' },
      { key: 'net',         header: 'Net Pay',    width: 12, type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'FullFinal_' + safe + '.xlsx', sheetName: 'Full & Final',
      companyData, columns: cols, rows: data,
      totalsKeys: ['gross','deductions','net'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Contractor Register ──────────────────────────────────────────────────────
ipcMain.handle('report:generate-contractor-register', async (_, { companyId, payrollRunId }) => {
  try {
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const data = rows.map((r, i) => ({
      '#': i+1, emp_code: r.emp_code, name: r.full_name,
      department: r.department||'', designation: r.designation||'',
      present: safeNum(r.att_present||r.present_days),
      basic: safeNum(r.basic), hra: safeNum(r.hra), convey: safeNum(r.conveyance),
      other: safeNum(r.special_allowance)+safeNum(r.medical_allowance),
      ot: safeNum(r.ot_amount), gross: safeNum(r.gross_salary),
      pf_ee: safeNum(r.pf_employee), esi_ee: safeNum(r.esi_employee),
      tds: safeNum(r.tds), pt: safeNum(r.pt),
      total_ded: safeNum(r.total_deductions), net: safeNum(r.net_salary),
    }));
    const cols = [
      { key: '#',          header: '#',      width: 5 },
      { key: 'emp_code',   header: 'Code',   width: 8 },
      { key: 'name',       header: 'Name',   width: 20 },
      { key: 'department', header: 'Dept',   width: 12 },
      { key: 'designation',header: 'Desig',  width: 12 },
      { key: 'present',    header: 'Days',   width: 7,  type: 'number' },
      { key: 'basic',      header: 'Basic',  width: 10, type: 'number' },
      { key: 'hra',        header: 'HRA',    width: 9,  type: 'number' },
      { key: 'convey',     header: 'Conv',   width: 9,  type: 'number' },
      { key: 'other',      header: 'Other',  width: 9,  type: 'number' },
      { key: 'ot',         header: 'OT',     width: 9,  type: 'number' },
      { key: 'gross',      header: 'Gross',  width: 10, type: 'number' },
      { key: 'pf_ee',      header: 'PF',     width: 9,  type: 'number' },
      { key: 'esi_ee',     header: 'ESI',    width: 9,  type: 'number' },
      { key: 'tds',        header: 'TDS',    width: 9,  type: 'number' },
      { key: 'pt',         header: 'PT',     width: 8,  type: 'number' },
      { key: 'total_ded',  header: 'T.Ded',  width: 10, type: 'number' },
      { key: 'net',        header: 'Net',    width: 11, type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'Contractor_Register_' + safe + '.xlsx', sheetName: 'Contractor Register',
      companyData, columns: cols, rows: data,
      totalsKeys: ['basic','hra','convey','other','ot','gross','pf_ee','esi_ee','tds','pt','total_ded','net'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Contractor Pay Slip ──────────────────────────────────────────────────────
ipcMain.handle('report:generate-contractor-payslip', async (_, { companyId, payrollRunId }) => {
  try {
    const { company, employees } = getReportData(companyId, payrollRunId);
    const filename = 'Contractor_PaySlips_' + company.month_label.replace(/ - /g,'_') + '.pdf';
    const outputPath = getOutputPath(filename);
    await generatePaySlips({ company, employees }, outputPath);
    shell.openPath(outputPath);
    return { success: true, path: outputPath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── LWF Register ─────────────────────────────────────────────────────────────
ipcMain.handle('report:generate-lwf-register', async (_, { companyId, payrollRunId }) => {
  try {
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const data = rows.map((r, i) => ({
      '#': i+1, emp_code: r.emp_code, name: r.full_name,
      designation: r.designation||'', department: r.department||'',
      basic: safeNum(r.basic), gross: safeNum(r.gross_salary),
      ee: safeNum(r.lwf_employee), er: safeNum(r.lwf_employer),
      total: safeNum(r.lwf_employee) + safeNum(r.lwf_employer),
    }));
    const cols = [
      { key: '#',          header: '#',           width: 5  },
      { key: 'emp_code',   header: 'Emp Code',    width: 10 },
      { key: 'name',       header: 'Name',        width: 22 },
      { key: 'designation',header: 'Designation', width: 16 },
      { key: 'department', header: 'Department',  width: 14 },
      { key: 'basic',      header: 'Basic',       width: 12, type: 'number' },
      { key: 'gross',      header: 'Gross',       width: 12, type: 'number' },
      { key: 'ee',         header: 'EE (LWF)',    width: 11, type: 'number' },
      { key: 'er',         header: 'ER (LWF)',    width: 11, type: 'number' },
      { key: 'total',      header: 'Total',       width: 11, type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'LWF_Register_' + safe + '.xlsx', sheetName: 'LWF Register',
      companyData, columns: cols, rows: data,
      totalsKeys: ['basic','gross','ee','er','total'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── LWF Challan ──────────────────────────────────────────────────────────────
ipcMain.handle('report:generate-lwf-challan', async (_, { companyId, payrollRunId }) => {
  try {
    const db = getDB();
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
    const totalEE = rows.reduce((s, r) => s + safeNum(r.lwf_employee), 0);
    const totalER = rows.reduce((s, r) => s + safeNum(r.lwf_employer), 0);
    const challanData = [{
      '#': 1, company: companyData.name, state: company.state_code||'',
      period: companyData.month_label, employees: rows.length,
      ee: totalEE, er: totalER, total: totalEE + totalER,
    }];
    const cols = [
      { key: '#',         header: '#',                width: 5  },
      { key: 'company',   header: 'Company Name',     width: 28 },
      { key: 'state',     header: 'State',            width: 12 },
      { key: 'period',    header: 'Period',           width: 18 },
      { key: 'employees', header: 'No. of Employees', width: 18 },
      { key: 'ee',        header: 'Employee Share',   width: 16, type: 'number' },
      { key: 'er',        header: 'Employer Share',   width: 16, type: 'number' },
      { key: 'total',     header: 'Total LWF',        width: 14, type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'LWF_Challan_' + safe + '.xlsx', sheetName: 'LWF Challan',
      companyData, columns: cols, rows: challanData,
      totalsKeys: ['ee','er','total'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Department Summary ───────────────────────────────────────────────────────
ipcMain.handle('report:generate-dept-summary', async (_, { companyId, payrollRunId }) => {
  try {
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const map = {};
    rows.forEach(r => {
      const d = r.department || 'Unassigned';
      if (!map[d]) map[d] = { dept: d, count: 0, gross: 0, ded: 0, net: 0 };
      map[d].count++;
      map[d].gross += safeNum(r.gross_salary);
      map[d].ded   += safeNum(r.total_deductions);
      map[d].net   += safeNum(r.net_salary);
    });
    const data = Object.values(map).map((d, i) => ({ '#': i+1, ...d }));
    const cols = [
      { key: '#',     header: '#',           width: 5  },
      { key: 'dept',  header: 'Department',  width: 24 },
      { key: 'count', header: 'Employees',   width: 12 },
      { key: 'gross', header: 'Gross Total', width: 14, type: 'number' },
      { key: 'ded',   header: 'Deductions',  width: 14, type: 'number' },
      { key: 'net',   header: 'Net Total',   width: 14, type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'DeptSummary_' + safe + '.xlsx', sheetName: 'Department Summary',
      companyData, columns: cols, rows: data,
      totalsKeys: ['count','gross','ded','net'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Cost Centre Report ───────────────────────────────────────────────────────
ipcMain.handle('report:generate-cost-centre', async (_, { companyId, payrollRunId }) => {
  try {
    const db = getDB();
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const map = {};
    rows.forEach(r => {
      const emp = db.prepare('SELECT cost_centre FROM employees WHERE id = ?').get(r.emp_id) || {};
      const cc = emp.cost_centre || 'Unassigned';
      if (!map[cc]) map[cc] = { cc, count: 0, gross: 0, ded: 0, net: 0 };
      map[cc].count++;
      map[cc].gross += safeNum(r.gross_salary);
      map[cc].ded   += safeNum(r.total_deductions);
      map[cc].net   += safeNum(r.net_salary);
    });
    const data = Object.values(map).map((d, i) => ({ '#': i+1, ...d }));
    const cols = [
      { key: '#',     header: '#',            width: 5  },
      { key: 'cc',    header: 'Cost Centre',  width: 22 },
      { key: 'count', header: 'Employees',    width: 12 },
      { key: 'gross', header: 'Gross Total',  width: 14, type: 'number' },
      { key: 'ded',   header: 'Deductions',   width: 14, type: 'number' },
      { key: 'net',   header: 'Net Total',    width: 14, type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'CostCentre_' + safe + '.xlsx', sheetName: 'Cost Centre Report',
      companyData, columns: cols, rows: data,
      totalsKeys: ['count','gross','ded','net'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Head Count ───────────────────────────────────────────────────────────────
ipcMain.handle('report:generate-head-count', async (_, { companyId }) => {
  try {
    const db = getDB();
    const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(companyId);
    const emps = db.prepare(
      'SELECT department, status FROM employees WHERE company_id = ? AND deleted_at IS NULL'
    ).all(companyId);
    const map = {};
    emps.forEach(e => {
      const d = e.department || 'Unassigned';
      if (!map[d]) map[d] = { dept: d, total: 0, active: 0, inactive: 0, on_notice: 0, separated: 0 };
      map[d].total++;
      if (e.status === 'active')    map[d].active++;
      if (e.status === 'inactive')  map[d].inactive++;
      if (e.status === 'on_notice') map[d].on_notice++;
      if (e.status === 'separated') map[d].separated++;
    });
    const data = Object.values(map).map((d, i) => ({ '#': i+1, ...d }));
    const companyData = { name: company ? company.name : '',
      month_label: new Date().toLocaleString('en-IN',{month:'long',year:'numeric'}) };
    const cols = [
      { key: '#',         header: '#',          width: 5  },
      { key: 'dept',      header: 'Department', width: 22 },
      { key: 'total',     header: 'Total',      width: 10 },
      { key: 'active',    header: 'Active',     width: 10 },
      { key: 'inactive',  header: 'Inactive',   width: 10 },
      { key: 'on_notice', header: 'Notice',     width: 10 },
      { key: 'separated', header: 'Separated',  width: 10 },
    ];
    const safe = new Date().toISOString().slice(0,7);
    const filePath = await generateExcelReport({
      filename: 'HeadCount_' + safe + '.xlsx', sheetName: 'Head Count',
      companyData, columns: cols, rows: data,
      totalsKeys: ['total','active','inactive','on_notice','separated'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Bonus Register ───────────────────────────────────────────────────────────
ipcMain.handle('report:generate-bonus-register', async (_, { companyId, finYear }) => {
  try {
    const db = getDB();
    const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(companyId);
    const BONUS_CAP = 7000;
    const emps = db.prepare(`
      SELECT e.emp_code, (e.first_name||' '||e.last_name) AS name,
        e.designation, e.department, e.doj,
        COALESCE((SELECT AVG(pd.basic + pd.da) FROM payroll_details pd
          JOIN payroll_runs pr ON pr.id = pd.run_id
          WHERE pd.emp_id = e.id AND pr.company_id = ?), 0) AS avg_basic_da
      FROM employees e
      WHERE e.company_id = ? AND e.deleted_at IS NULL AND e.status = 'active'
      ORDER BY e.emp_code
    `).all(companyId, companyId);

    const data = emps.map((e, i) => {
      const bd = Math.min(safeNum(e.avg_basic_da), BONUS_CAP);
      return {
        '#': i+1, emp_code: e.emp_code, name: e.name,
        designation: e.designation||'', department: e.department||'', doj: e.doj||'',
        avg_basic_da: bd, bonus_pct: 8.33,
        annual_bonus: Math.round(bd * 12 * 8.33 / 100),
      };
    });
    const companyData = { name: company ? company.name : '', month_label: 'FY ' + (finYear||'') };
    const cols = [
      { key: '#',           header: '#',          width: 5  },
      { key: 'emp_code',    header: 'Code',       width: 9  },
      { key: 'name',        header: 'Name',       width: 22 },
      { key: 'designation', header: 'Designation',width: 16 },
      { key: 'department',  header: 'Department', width: 14 },
      { key: 'doj',         header: 'DOJ',        width: 12 },
      { key: 'avg_basic_da',header: 'Avg B+DA',   width: 12, type: 'number' },
      { key: 'bonus_pct',   header: 'Bonus %',    width: 10, type: 'number' },
      { key: 'annual_bonus',header: 'Annual Bonus',width:13, type: 'number' },
    ];
    const safe = (finYear||'').replace(/[^a-zA-Z0-9]/g,'_') || new Date().getFullYear();
    const filePath = await generateExcelReport({
      filename: 'BonusRegister_FY' + safe + '.xlsx', sheetName: 'Bonus Register',
      companyData, columns: cols, rows: data, totalsKeys: ['annual_bonus'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Bonus Calculation ────────────────────────────────────────────────────────
ipcMain.handle('report:generate-bonus-calc', async (_, { companyId, finYear }) => {
  try {
    const db = getDB();
    const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(companyId);
    const BONUS_CAP = 7000;
    const emps = db.prepare(`
      SELECT e.emp_code, (e.first_name||' '||e.last_name) AS name,
        e.designation, e.doj,
        COALESCE((SELECT AVG(pd.basic+pd.da) FROM payroll_details pd
          JOIN payroll_runs pr ON pr.id=pd.run_id
          WHERE pd.emp_id=e.id AND pr.company_id=?), 0) AS avg_basic_da,
        COALESCE((SELECT SUM(pd.gross_salary) FROM payroll_details pd
          JOIN payroll_runs pr ON pr.id=pd.run_id
          WHERE pd.emp_id=e.id AND pr.company_id=?), 0) AS annual_gross
      FROM employees e
      WHERE e.company_id=? AND e.deleted_at IS NULL AND e.status='active'
      ORDER BY e.emp_code
    `).all(companyId, companyId, companyId);

    const data = emps.map((e, i) => {
      const bd = Math.min(safeNum(e.avg_basic_da), BONUS_CAP);
      const min_bonus = Math.round(bd * 12 * 8.33 / 100);
      const max_bonus = Math.round(bd * 12 * 20 / 100);
      return {
        '#': i+1, emp_code: e.emp_code, name: e.name,
        designation: e.designation||'', doj: e.doj||'',
        avg_bd: bd, annual_gross: safeNum(e.annual_gross),
        min_bonus, max_bonus, payable: min_bonus,
      };
    });
    const companyData = { name: company ? company.name : '', month_label: 'Bonus Calc — FY ' + (finYear||'') };
    const cols = [
      { key: '#',           header: '#',           width: 5  },
      { key: 'emp_code',    header: 'Code',        width: 9  },
      { key: 'name',        header: 'Name',        width: 22 },
      { key: 'designation', header: 'Designation', width: 16 },
      { key: 'doj',         header: 'DOJ',         width: 12 },
      { key: 'avg_bd',      header: 'Avg B+DA',    width: 12, type: 'number' },
      { key: 'annual_gross',header: 'Annual Gross',width: 14, type: 'number' },
      { key: 'min_bonus',   header: 'Min (8.33%)', width: 13, type: 'number' },
      { key: 'max_bonus',   header: 'Max (20%)',   width: 13, type: 'number' },
      { key: 'payable',     header: 'Payable',     width: 12, type: 'number' },
    ];
    const safe = (finYear||'').replace(/[^a-zA-Z0-9]/g,'_') || new Date().getFullYear();
    const filePath = await generateExcelReport({
      filename: 'BonusCalc_FY' + safe + '.xlsx', sheetName: 'Bonus Calculation',
      companyData, columns: cols, rows: data,
      totalsKeys: ['min_bonus','max_bonus','payable'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Form A: Muster Roll ──────────────────────────────────────────────────────
ipcMain.handle('report:generate-form-a', async (_, { companyId, payrollRunId }) => {
  try {
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const data = rows.map((r, i) => ({
      '#': i+1, emp_code: r.emp_code, name: r.full_name,
      designation: r.designation||'', department: r.department||'',
      present: safeNum(r.att_present||r.present_days),
      pl: safeNum(r.att_pl||r.paid_leave_days),
      lop: safeNum(r.att_lop||r.lop_days),
      ot_hours: safeNum(r.att_ot||r.ot_hours),
      total_wd: safeNum(r.att_wd||r.working_days),
    }));
    const cols = [
      { key: '#',           header: 'S.No.',       width: 5  },
      { key: 'emp_code',    header: 'Emp Code',    width: 10 },
      { key: 'name',        header: 'Name',        width: 22 },
      { key: 'designation', header: 'Designation', width: 16 },
      { key: 'department',  header: 'Department',  width: 14 },
      { key: 'present',     header: 'Present',     width: 10, type: 'number' },
      { key: 'pl',          header: 'PL',          width: 8,  type: 'number' },
      { key: 'lop',         header: 'LOP',         width: 8,  type: 'number' },
      { key: 'ot_hours',    header: 'OT Hours',    width: 10, type: 'number' },
      { key: 'total_wd',    header: 'Work Days',   width: 10, type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'FormA_MusterRoll_' + safe + '.xlsx', sheetName: 'Form A - Muster Roll',
      companyData, columns: cols, rows: data,
      totalsKeys: ['present','pl','lop','ot_hours'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Form B: Leave Register ───────────────────────────────────────────────────
ipcMain.handle('report:generate-form-b', async (_, { companyId, payrollRunId }) => {
  try {
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const data = rows.map((r, i) => ({
      '#': i+1, emp_code: r.emp_code, name: r.full_name,
      designation: r.designation||'', doj: r.doj||'',
      total_wd: safeNum(r.att_wd||r.working_days),
      present: safeNum(r.att_present||r.present_days),
      pl_taken: safeNum(r.att_pl||r.paid_leave_days),
      lop: safeNum(r.att_lop||r.lop_days),
    }));
    const cols = [
      { key: '#',           header: 'S.No.',       width: 5  },
      { key: 'emp_code',    header: 'Emp Code',    width: 10 },
      { key: 'name',        header: 'Name',        width: 22 },
      { key: 'designation', header: 'Designation', width: 16 },
      { key: 'doj',         header: 'DOJ',         width: 12 },
      { key: 'total_wd',    header: 'Working Days',width: 13, type: 'number' },
      { key: 'present',     header: 'Present',     width: 10, type: 'number' },
      { key: 'pl_taken',    header: 'PL Taken',    width: 10, type: 'number' },
      { key: 'lop',         header: 'LOP',         width: 8,  type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'FormB_LeaveRegister_' + safe + '.xlsx', sheetName: 'Form B - Leave Register',
      companyData, columns: cols, rows: data,
      totalsKeys: ['present','pl_taken','lop'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Form C: Service Register ─────────────────────────────────────────────────
ipcMain.handle('report:generate-form-c', async (_, { companyId }) => {
  try {
    const db = getDB();
    const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(companyId);
    const emps = db.prepare(`
      SELECT e.emp_code, (e.first_name||' '||e.last_name) AS name,
        e.designation, e.department, e.location, e.doj, e.status, e.father_name,
        ei.uan, ei.pan, ei.aadhaar_last4,
        ei.bank_account_number AS bank_acc, ei.bank_ifsc AS ifsc
      FROM employees e
      LEFT JOIN employee_identity ei ON ei.emp_id = e.id
      WHERE e.company_id = ? AND e.deleted_at IS NULL
      ORDER BY e.emp_code
    `).all(companyId);
    const data = emps.map((e, i) => ({
      '#': i+1, emp_code: e.emp_code, name: e.name,
      father_name: e.father_name||'', designation: e.designation||'',
      department: e.department||'', location: e.location||'',
      doj: e.doj||'', status: e.status||'', uan: e.uan||'', pan: e.pan||'',
      aadhaar: e.aadhaar_last4 ? '****' + e.aadhaar_last4 : '',
      bank_acc: e.bank_acc||'', ifsc: e.ifsc||'',
    }));
    const companyData = { name: company ? company.name : '',
      month_label: 'As of ' + new Date().toLocaleDateString('en-IN') };
    const cols = [
      { key: '#',           header: '#',             width: 5  },
      { key: 'emp_code',    header: 'Emp Code',      width: 10 },
      { key: 'name',        header: 'Name',          width: 22 },
      { key: 'father_name', header: "Father's Name", width: 20 },
      { key: 'designation', header: 'Designation',   width: 16 },
      { key: 'department',  header: 'Department',    width: 14 },
      { key: 'location',    header: 'Location',      width: 14 },
      { key: 'doj',         header: 'DOJ',           width: 12 },
      { key: 'status',      header: 'Status',        width: 10 },
      { key: 'uan',         header: 'UAN',           width: 16 },
      { key: 'pan',         header: 'PAN',           width: 14 },
      { key: 'aadhaar',     header: 'Aadhaar',       width: 14 },
      { key: 'bank_acc',    header: 'Bank A/C',      width: 18 },
      { key: 'ifsc',        header: 'IFSC',          width: 12 },
    ];
    const safe = new Date().toISOString().slice(0,10);
    const filePath = await generateExcelReport({
      filename: 'FormC_ServiceRegister_' + safe + '.xlsx', sheetName: 'Form C - Service Register',
      companyData, columns: cols, rows: data, totalsKeys: [],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Form D: Wages Register ───────────────────────────────────────────────────
ipcMain.handle('report:generate-form-d', async (_, { companyId, payrollRunId }) => {
  try {
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const data = rows.map((r, i) => ({
      '#': i+1, emp_code: r.emp_code, name: r.full_name,
      designation: r.designation||'',
      present: safeNum(r.att_present||r.present_days),
      basic: safeNum(r.basic), hra: safeNum(r.hra), da: safeNum(r.da),
      other: safeNum(r.special_allowance)+safeNum(r.medical_allowance)+safeNum(r.conveyance),
      ot: safeNum(r.ot_amount), gross: safeNum(r.gross_salary),
      pf_ee: safeNum(r.pf_employee), esi_ee: safeNum(r.esi_employee),
      total_ded: safeNum(r.total_deductions), net: safeNum(r.net_salary), signature: '',
    }));
    const cols = [
      { key: '#',          header: '#',        width: 5  },
      { key: 'emp_code',   header: 'Code',     width: 9  },
      { key: 'name',       header: 'Name',     width: 20 },
      { key: 'designation',header: 'Desig.',   width: 14 },
      { key: 'present',    header: 'Days',     width: 7,  type: 'number' },
      { key: 'basic',      header: 'Basic',    width: 10, type: 'number' },
      { key: 'hra',        header: 'HRA',      width: 9,  type: 'number' },
      { key: 'da',         header: 'DA',       width: 9,  type: 'number' },
      { key: 'other',      header: 'Other',    width: 9,  type: 'number' },
      { key: 'ot',         header: 'OT',       width: 9,  type: 'number' },
      { key: 'gross',      header: 'Gross',    width: 10, type: 'number' },
      { key: 'pf_ee',      header: 'PF',       width: 9,  type: 'number' },
      { key: 'esi_ee',     header: 'ESI',      width: 9,  type: 'number' },
      { key: 'total_ded',  header: 'T.Ded',    width: 10, type: 'number' },
      { key: 'net',        header: 'Net',      width: 11, type: 'number' },
      { key: 'signature',  header: 'Signature',width: 16 },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'FormD_WagesRegister_' + safe + '.xlsx', sheetName: 'Form D - Wages Register',
      companyData, columns: cols, rows: data,
      totalsKeys: ['basic','hra','da','other','ot','gross','pf_ee','esi_ee','total_ded','net'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Form H: OT Register ──────────────────────────────────────────────────────
ipcMain.handle('report:generate-form-h', async (_, { companyId, payrollRunId }) => {
  try {
    const { companyData, rows } = getRunEmployees(companyId, payrollRunId);
    const data = rows
      .filter(r => safeNum(r.att_ot||r.ot_hours) > 0 || safeNum(r.ot_amount) > 0)
      .map((r, i) => {
        const hrs = safeNum(r.att_ot||r.ot_hours);
        return {
          '#': i+1, emp_code: r.emp_code, name: r.full_name,
          designation: r.designation||'', department: r.department||'',
          ot_rate: hrs > 0 ? Number((safeNum(r.ot_amount)/hrs).toFixed(2)) : 0,
          ot_hours: hrs, ot_amount: safeNum(r.ot_amount),
        };
      });
    const cols = [
      { key: '#',           header: '#',           width: 5  },
      { key: 'emp_code',    header: 'Emp Code',    width: 10 },
      { key: 'name',        header: 'Name',        width: 22 },
      { key: 'designation', header: 'Designation', width: 16 },
      { key: 'department',  header: 'Department',  width: 14 },
      { key: 'ot_rate',     header: 'OT Rate/Hr',  width: 12, type: 'number' },
      { key: 'ot_hours',    header: 'OT Hours',    width: 11, type: 'number' },
      { key: 'ot_amount',   header: 'OT Amount',   width: 12, type: 'number' },
    ];
    const safe = companyData.month_label.replace(/ - /g, '_');
    const filePath = await generateExcelReport({
      filename: 'FormH_OTRegister_' + safe + '.xlsx', sheetName: 'Form H - OT Register',
      companyData, columns: cols, rows: data,
      totalsKeys: ['ot_hours','ot_amount'],
    });
    shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Open Reports Folder ───────────────────────────────────────────────────────
ipcMain.handle('report:open-folder', async () => {
  const { app } = require('electron');
  const path = require('path');
  const dir = path.join(app.getPath('documents'), 'PaySmart Pro', 'Reports');
  const fs = require('fs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  shell.openPath(dir);
  return { success: true };
});
