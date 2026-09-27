// electron/services/report.service.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toWords(amount) {
  // Simple Indian number-to-words (handles up to 99,99,999)
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen',
    'Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  function convert(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n/10)] + ' ' + ones[n%10] + ' ';
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred ' + convert(n%100);
    if (n < 100000) return convert(Math.floor(n/1000)) + 'Thousand ' + convert(n%1000);
    if (n < 10000000) return convert(Math.floor(n/100000)) + 'Lakh ' + convert(n%100000);
    return convert(Math.floor(n/10000000)) + 'Crore ' + convert(n%10000000);
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let result = convert(rupees).trim();
  if (paise > 0) result += ` and ${convert(paise).trim()} Paise`;
  return `(Rupees ${result} only)`;
}

function formatCurrency(val) {
  if (!val || val === 0) return '0';
  return Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getOutputPath(filename) {
  const dir = path.join(app.getPath('documents'), 'PaySmart Pro', 'Reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
}

// ─── REPORT 1: PAY SLIP (one page per employee) ───────────────────────────────

/**
 * generatePaySlips(data, outputPath)
 * data = {
 *   company: { name, address, month_label },  // e.g. "May - 2026"
 *   employees: [ { ...all fields } ]
 * }
 */
function generatePaySlips(data, outputPath) {
  const doc = new PDFDocument({ size: 'A4', margin: 30, autoFirstPage: false });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const M = 30; // margin
  const W = PAGE_W - M * 2;

  for (const emp of data.employees) {
    doc.addPage();
    let y = M;

    // ── Company header ──
    doc.fontSize(13).font('Helvetica-Bold')
       .text(data.company.name, M, y, { align: 'right', width: W });
    y += 16;
    doc.fontSize(8).font('Helvetica')
       .text(data.company.address, M, y, { align: 'right', width: W });
    y += 20;

    // ── Title ──
    doc.fontSize(10).font('Helvetica-Bold')
       .text(`Payslip for the month of : ${data.company.month_label}`, M, y, { align: 'center', width: W });
    y += 18;

    // ── Info grid (2 columns, bordered) ──
    const infoBoxH = 90;
    doc.rect(M, y, W, infoBoxH).stroke();
    doc.moveTo(M + W/2, y).lineTo(M + W/2, y + infoBoxH).stroke();

    const leftFields = [
      ['Employee Code', emp.employee_code || ''],
      ['Employee Name', emp.name || ''],
      ["Father's / Husband Name", emp.father_name || ''],
      ['Designation', emp.designation || ''],
      ['Category', emp.category || ''],
      ['Location', emp.location || data.company.name],
      ['State', emp.state || ''],
    ];
    const rightFields = [
      ['Date of Joining', emp.date_of_joining || ''],
      ['U.A.N.', emp.uan || '0'],
      ['E.S.I.C.', emp.esic_no || ''],
      ['Bank Name', emp.bank_name || ''],
      ['Bank A/C No.', emp.bank_account || ''],
      ['I.F.S.C.', emp.ifsc || 'ZZZ'],
      ['Aadhar', emp.aadhar || ''],
    ];

    doc.fontSize(7).font('Helvetica');
    const rowH = infoBoxH / leftFields.length;
    leftFields.forEach((f, i) => {
      const ry = y + i * rowH + 3;
      doc.text(f[0], M + 4, ry, { width: W/2 - 60 });
      doc.font('Helvetica-Bold').text(f[1], M + W/2 - 60, ry, { width: 55 });
      doc.font('Helvetica');
    });
    rightFields.forEach((f, i) => {
      const ry = y + i * rowH + 3;
      doc.text(f[0], M + W/2 + 4, ry, { width: 70 });
      doc.font('Helvetica-Bold').text(f[1], M + W/2 + 75, ry, { width: W/2 - 80 });
      doc.font('Helvetica');
    });

    y += infoBoxH + 2;

    // ── Main table header ──
    const colAtt = 85;   // Attendance block
    const colPart = 110; // Particulars
    const colRate = 55;  // Rate
    const colEarn = 65;  // Earning
    const colDedL = 90;  // Deduction label
    const colDedV = 55;  // Deduction value
    const colNet = W - colAtt - colPart - colRate - colEarn - colDedL - colDedV;

    const hdrH = 14;
    doc.rect(M, y, W, hdrH).stroke();
    doc.fontSize(7).font('Helvetica-Bold');

    let cx = M;
    doc.text('Attendance', cx + 2, y + 3, { width: colAtt }); cx += colAtt;
    doc.moveTo(cx, y).lineTo(cx, y + hdrH).stroke();
    doc.text('Particulars', cx + 2, y + 3, { width: colPart }); cx += colPart;
    doc.moveTo(cx, y).lineTo(cx, y + hdrH).stroke();
    doc.text('Rate', cx + 2, y + 3, { width: colRate }); cx += colRate;
    doc.moveTo(cx, y).lineTo(cx, y + hdrH).stroke();
    doc.text('Earning', cx + 2, y + 3, { width: colEarn }); cx += colEarn;
    doc.moveTo(cx, y).lineTo(cx, y + hdrH).stroke();
    doc.text('Deductions', cx + 2, y + 3, { width: colDedL + colDedV }); cx += colDedL + colDedV;
    doc.moveTo(cx, y).lineTo(cx, y + hdrH).stroke();
    doc.text('Net Pay', cx + 2, y + 3, { width: colNet });
    y += hdrH;

    // ── Attendance rows (left) + Earnings (middle) + Deductions (right) ──
    const attRows = [
      ['Workday', emp.workday],
      ['WeekOff', emp.weekoff],
      ['N.F.H', emp.nfh || 0],
      ['E.L.', emp.el || 0],
      ['C.L.', emp.cl || 0],
      ['S.L.', emp.sl || 0],
      ['ch', emp.ch || 0],
      ['Matern.', emp.matern || 0],
      ['ol', emp.ol || 0],
      ['L.O.P', emp.lop_days || 0],
      ['PaidDay', emp.paid_days],
      ['OT.HR.', emp.ot_hours || 0],
    ];

    const earnRows = [
      ['BASIC', emp.basic_rate || 0, emp.basic_earned || 0],
      ['H.R.A.', emp.hra_rate || 0, emp.hra_earned || 0],
      ['CONVEY.', emp.convey_rate || 0, emp.convey_earned || 0],
      ['SPL.ALL', emp.spl_all_rate || 0, emp.spl_all_earned || 0],
      ['MEDICAL', emp.medical_rate || 0, emp.medical_earned || 0],
      ['CCA', emp.cca_rate || 0, emp.cca_earned || 0],
      ['PERF.BON', emp.perf_bon_rate || 0, emp.perf_bon_earned || 0],
      ['ALL-1', emp.all1_rate || 0, emp.all1_earned || 0],
      ['ARR-1', emp.arr1_rate || 0, emp.arr1_earned || 0],
      ['ARR-2', 0, emp.arr2_earned || 0],
      ['ARR-3', 0, emp.arr3_earned || 0],
      ['ATT. ALL', 0, emp.att_all_earned || 0],
      ['D.Wage-1', emp.dwage1_rate || 0, emp.dwage1_earned || 0],
      ['OT.HR.', 0, emp.ot_earned || 0],
    ];

    const dedRows = [
      ['E.P.F.', emp.epf_employee || 0],
      ['Vol. E.P.F.', emp.vol_epf || 0],
      ['E.S.I.C.', emp.esic_employee || 0],
      ['L.W.F.', emp.lwf_employee || 0],
      ['Prof.Tax', emp.prof_tax || 0],
      ['T.D.S.', emp.tds || 0],
      ['Advance', emp.advance || 0],
      ['Loan', emp.loan || 0],
      ['Food', emp.food || 0],
    ];

    const maxRows = Math.max(attRows.length, earnRows.length, dedRows.length);
    const bodyRowH = 13;
    const bodyH = maxRows * bodyRowH;

    // Draw outer border for body
    doc.rect(M, y, W, bodyH).stroke();
    // Column separators (vertical lines for entire body)
    let sep = M + colAtt;
    doc.moveTo(sep, y).lineTo(sep, y + bodyH).stroke(); sep += colPart;
    doc.moveTo(sep, y).lineTo(sep, y + bodyH).stroke(); sep += colRate;
    doc.moveTo(sep, y).lineTo(sep, y + bodyH).stroke(); sep += colEarn;
    doc.moveTo(sep, y).lineTo(sep, y + bodyH).stroke(); sep += colDedL;
    doc.moveTo(sep, y).lineTo(sep, y + bodyH).stroke(); sep += colDedV;
    doc.moveTo(sep, y).lineTo(sep, y + bodyH).stroke();

    doc.fontSize(7).font('Helvetica');
    for (let i = 0; i < maxRows; i++) {
      const ry = y + i * bodyRowH + 3;

      // Attendance
      if (attRows[i]) {
        doc.text(attRows[i][0], M + 2, ry, { width: colAtt - 30 });
        if (attRows[i][1] !== undefined)
          doc.text(String(attRows[i][1]), M + colAtt - 28, ry, { width: 26, align: 'right' });
      }

      // Earnings
      if (earnRows[i]) {
        const ex = M + colAtt;
        doc.text(earnRows[i][0], ex + 2, ry, { width: colPart - 4 });
        if (earnRows[i][1])
          doc.text(String(earnRows[i][1]), ex + colPart, ry, { width: colRate - 2, align: 'right' });
        if (earnRows[i][2])
          doc.text(String(earnRows[i][2]), ex + colPart + colRate, ry, { width: colEarn - 2, align: 'right' });
      }

      // Deductions
      if (dedRows[i]) {
        const dx = M + colAtt + colPart + colRate + colEarn;
        doc.text(dedRows[i][0], dx + 2, ry, { width: colDedL - 4 });
        doc.text(String(dedRows[i][1] || 0), dx + colDedL, ry, { width: colDedV - 2, align: 'right' });
      }
    }

    y += bodyH;

    // ── Totals row ──
    const totH = 14;
    doc.rect(M, y, W, totH).stroke();
    doc.fontSize(7).font('Helvetica-Bold');
    doc.text('Total', M + 2, y + 3, { width: colAtt - 2 });
    // earnings total
    const totalEarned = Number(emp.gross_earned || 0);
    const totalDed = Number(emp.total_deductions || 0);
    const netPay = Number(emp.net_pay || 0);
    doc.text(formatCurrency(emp.basic_rate || 0), M + colAtt + colPart, y + 3, { width: colRate - 2, align: 'right' });
    doc.text(formatCurrency(totalEarned), M + colAtt + colPart + colRate, y + 3, { width: colEarn - 2, align: 'right' });
    doc.text(formatCurrency(totalDed), M + colAtt + colPart + colRate + colEarn + colDedL, y + 3, { width: colDedV - 2, align: 'right' });
    doc.text(formatCurrency(netPay), M + colAtt + colPart + colRate + colEarn + colDedL + colDedV, y + 3, { width: colNet - 2, align: 'right' });
    y += totH;

    // ── Amount in words ──
    doc.fontSize(7).font('Helvetica-Oblique')
       .text(toWords(netPay), M, y + 4, { width: W });
    y += 18;

    // ── Note ──
    const noteText = `NOTE : This salary slip is provided solely for compliance and informational purposes. It must not be used or considered as supporting documentation for obtaining loans or financial credit from any public or private bank, NBFC, or other financial institution. Furthermore, ${data.company.name} assumes no responsibility for any loans or financial obligations incurred by the employee on the basis of this document.`;
    doc.fontSize(6.5).font('Helvetica')
       .text(noteText, M, y + 4, { width: W });
    y += 35;

    // ── Signature ──
    doc.fontSize(8).font('Helvetica')
       .text(`For ${data.company.name}`, M, y, { align: 'right', width: W });
  }

  doc.end();
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

// ─── REPORT 2: SALARY SHEET (A3 landscape factory register) ──────────────────

/**
 * generateSalarySheet(data, outputPath)
 *
 * A4 landscape salary register — exact A K Construction factory format
 * 5 sub-rows per employee:
 *   ID# | Particulars | Salary/Wage Rate | Attendance | Earned Salary/Wages | Deductions | Employer Share | Net Pay | Signature
 */
function generateSalarySheet(data, outputPath) {
  // ── Page & margin constants ────────────────────────────────────────────────
  const PW = 841.89, PH = 595.28;   // A4 landscape
  const ML = 10, MR = 10, MT = 10, MB = 10;
  const TW = PW - ML - MR;

  // ── Column widths ──────────────────────────────────────────────────────────
  const CW = {
    id:    18,    // ID #
    p_l:  105,    // Particulars left  (Name / Designation / UAN / ESIC)
    p_r:   52,    // Particulars right (DOJ / Bank A/C)
    r1:    52,    // Rate col-1: BASIC / H.R.A. / CONVEY. / D.Wage-1
    r2:    52,    // Rate col-2: SPL.ALL / MEDICAL / CCA / Total
    a1:    36,    // Attendance col-1: Workday / WeekOff / N.F.H / E.L. / OT.HR.
    a2:    36,    // Attendance col-2: C.L. / S.L. / Matern. / L.O.P / PaidDay
    e1:    52,    // Earned col-1: BASIC / H.R.A. / CONVEY. / — / D.Wage-1
    e2:    50,    // Earned col-2: SPL.ALL / MEDICAL / CCA / PERF.BON / OT.HR.
    e3:    56,    // Earned col-3: Total Earn
    d1:    52,    // Deductions col-1: E.P.F. / Vol.E.P.F.
    d2:    55,    // Deductions col-2: T.D.S. / Total Ded.
    es:    60,    // Employer Share — wide enough for single-line header
    net:   60,    // Net Salary / Wages Payable
    sign:   0,    // Signature — auto-filled to reach TW
  };
  // Auto-fill sign column to exact page width
  const fixedW = Object.entries(CW).reduce((s, [k, v]) => k !== 'sign' ? s + v : s, 0);
  CW.sign = Math.max(30, Math.floor(TW - fixedW));

  // Build x-coordinate map
  const CX = {};
  let _cx = ML;
  for (const k of Object.keys(CW)) { CX[k] = _cx; _cx += CW[k]; }

  // ── Row heights ────────────────────────────────────────────────────────────
  const CO_H = 44;         // Company header block
  const SEC_H = 10;        // Section label row
  const SH    = 9;         // Sub-header row height  (× 5 = 45 for full header)
  const DH    = 9;         // Data sub-row height    (× 5 = 45 per employee)
  const EH    = DH * 5;   // Total height per employee group

  const doc = new PDFDocument({ size: [PW, PH], margin: 0, autoFirstPage: false });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function n2(v) { const f = parseFloat(v) || 0; return f === 0 ? '0' : f.toFixed(2); }
  function nNet(v) {
    const f = parseFloat(v) || 0;
    return f.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fDate(d) {
    if (!d) return '';
    const p = String(d).split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(d);
  }

  // Draw cell — white fill + black border (explicit fill prevents colour-state leakage)
  function bdr(x, y, w, h) {
    doc.save()
       .fillColor('white').strokeColor('black').lineWidth(0.5)
       .rect(x, y, w, h).fillAndStroke()
       .restore();
  }

  // Draw text centred vertically in a cell (supports \n)
  function txt(x, y, w, h, text, size, align, bold) {
    if (text === null || text === undefined || text === '') return;
    const s = String(text);
    const lines = s.split('\n');
    const lh = (size || 5) * 1.35;
    const totalTH = lines.length * lh;
    let ty = y + (h - totalTH) / 2;
    doc.save()
       .font(bold ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(size || 5).fillColor('black');
    for (const line of lines) {
      doc.text(line, x + 1.5, Math.max(ty, y + 0.5), {
        width: w - 3, align: align || 'center', lineBreak: false,
      });
      ty += lh;
    }
    doc.restore();
  }

  // Border + text
  function cell(x, y, w, h, text, size, align, bold) {
    bdr(x, y, w, h);
    txt(x, y, w, h, text, size, align, bold);
  }

  // ── Company Header ─────────────────────────────────────────────────────────
  function drawCompanyHeader(y0, pageNum) {
    const co = data.company;
    let y = y0;
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#000').text(co.name || '', ML, y);
    y += 15;
    doc.font('Helvetica-Bold').fontSize(8).text((co.address || '').toUpperCase(), ML, y);
    y += 10;
    doc.font('Helvetica').fontSize(9).text('Salary Register for the month of :', ML, y);
    doc.font('Helvetica-Bold').fontSize(9).text(`  ${co.month_label || ''}`, ML + 192, y);
    y += 9;
    // 4th line: company name repeated (matches reference layout)
    doc.font('Helvetica').fontSize(7)
       .text(co.name || '', ML, y)
       .text(co.name || '', ML + 235, y)
       .text('-', ML + 465, y);
    // Right-side EPF / ESI / Page
    doc.font('Helvetica').fontSize(7.5)
       .text(`EPF Number : ${co.epf_number || ''}`, ML, y0 + 3,  { width: PW - ML * 2, align: 'right' })
       .text(`ESI Number : ${co.esi_number || ''}`, ML, y0 + 13, { width: PW - ML * 2, align: 'right' })
       .text(`Page Number : ${pageNum}`,             ML, y0 + 23, { width: PW - ML * 2, align: 'right' });
  }

  // ── Table Header (section row + 5 sub-header rows) ───────────────────────────
  function drawTableHeader(y) {
    const fullH = SEC_H + SH * 5;

    // ID#, Net Pay, Sign span full header height
    cell(CX.id,   y, CW.id,   fullH, 'ID #',                           6,   'center', true);
    cell(CX.net,  y, CW.net,  fullH, 'Net Salary\n/ Wages\nPayable',   6,   'center', true);
    cell(CX.sign, y, CW.sign, fullH, 'Signature\nwith\nRevenue\nStamp',5.5, 'center', true);

    // Section label row — r3 removed from Salary/Wage Rate
    cell(CX.p_l, y, CW.p_l + CW.p_r,       SEC_H, 'Particulars',            7, 'center', true);
    cell(CX.r1,  y, CW.r1  + CW.r2,         SEC_H, 'Salary / Wage Rate',    7, 'center', true);
    cell(CX.a1,  y, CW.a1  + CW.a2,         SEC_H, 'Attendance',             7, 'center', true);
    cell(CX.e1,  y, CW.e1  + CW.e2 + CW.e3,SEC_H, 'Earned Salary / Wages', 7, 'center', true);
    cell(CX.d1,  y, CW.d1  + CW.d2,         SEC_H, 'Deductions',             7, 'center', true);
    cell(CX.es,  y, CW.es,                  SEC_H, 'Employer Share',          6, 'center', true);

    // Sub-header labels — no r3 column
    const HDR = [
      ['Employee Name',        '',               'BASIC',   'SPL.ALL', 'Workday','C.L.',   'BASIC',    'SPL.ALL', 'ARR-1',    'E.P.F.',     'T.D.S.',    'Pension'    ],
      ['Father / Husband Name','',               'H.R.A.',  'MEDICAL', 'WeekOff','S.L.',   'H.R.A.',   'MEDICAL', 'ARR-2',    'E.S.I.C.',   'Advance',   'Difference' ],
      ['Designation',          '',               'CONVEY.', 'CCA',     'N.F.H', 'Matern.','CONVEY.',  'CCA',     'ARR-3',    'L.W.F.',     'Loan',      'E.S.I.C.'   ],
      ['U.A.N.',               'Date of Joining','',        'PERF.BON','E.L.',  'L.O.P', '',         'PERF.BON','ATT. ALL', 'Prof.Tax',   'Food',      'Iwfer'      ],
      ['E.S.I.C.',             'Bank A/C No.',  'D.Wage-1','Total',   'OT.HR.','PaidDay','D.Wage-1', 'OT.HR.', 'Total Earn','Vol. E.P.F.','Total Ded.','Total'      ],
    ];
    const HKEYS = ['p_l','p_r','r1','r2','a1','a2','e1','e2','e3','d1','d2','es'];

    // One merged block per group — no internal lines
    bdr(CX.p_l, y + SEC_H, CW.p_l + CW.p_r,       SH * 5);
    bdr(CX.r1,  y + SEC_H, CW.r1  + CW.r2,         SH * 5);
    bdr(CX.a1,  y + SEC_H, CW.a1  + CW.a2,         SH * 5);
    bdr(CX.e1,  y + SEC_H, CW.e1  + CW.e2 + CW.e3, SH * 5);
    bdr(CX.d1,  y + SEC_H, CW.d1  + CW.d2,         SH * 5);
    bdr(CX.es,  y + SEC_H, CW.es,                  SH * 5);

    // Text only — last row bold, p_l left-aligned
    for (let r = 0; r < 5; r++) {
      const ry   = y + SEC_H + r * SH;
      const bold = r === 4;
      for (let c = 0; c < HKEYS.length; c++) {
        const k = HKEYS[c];
        txt(CX[k], ry, CW[k], SH, HDR[r][c], 6.5, k === 'p_l' ? 'left' : 'right', bold);
      }
    }
  }

  // ── Employee Group (5 sub-rows) ────────────────────────────────────────────
  function drawEmployee(emp, sr, y) {
    const eps      = parseFloat(emp.eps_contribution || 0);
    const pfEmpr   = parseFloat(emp.pf_employer || 0);
    const esiEmpr  = parseFloat(emp.esi_employer || 0);
    const epfDiff  = Math.max(0, pfEmpr - eps);
    const totEmpr  = eps + esiEmpr + epfDiff;
    const mCTC     = parseFloat(emp.monthly_ctc || 0);

    // Spanning cells: ID#, Net Pay, Signature — no horizontal dividers
    bdr(CX.id,   y, CW.id,   EH);
    txt(CX.id,   y, CW.id,   EH, String(sr), 7, 'right', true);

    bdr(CX.net,  y, CW.net,  EH);
    txt(CX.net,  y, CW.net,  EH, nNet(emp.net_pay), 7, 'right', true);

    bdr(CX.sign, y, CW.sign, EH);

    // 5 sub-rows × 12 columns (r3 removed)
    const DATA = [
      // p_l         | p_r  | r1       | r2       | a1                            | a2               | e1                       | e2                        | e3    | d1                       | d2                       | es
      [emp.name||'', '',     n2(0),     n2(0),     n2(emp.total_working_days||0), n2(emp.cl||0),     n2(emp.basic_earned||0),   n2(emp.spl_all_earned||0), n2(0), n2(emp.epf_employee||0),  n2(emp.tds||0),           n2(eps)     ],
      ['',           '',     n2(0),     n2(0),     n2(emp.weekoff||0),            n2(emp.sl||0),     n2(emp.hra_earned||0),     n2(0),                     n2(0), n2(emp.esic_employee||0), n2(emp.advance||0),       n2(epfDiff) ],
      [emp.designation||'','',n2(0),    n2(0),     n2(emp.nfh||0),               n2(0),             n2(emp.convey_earned||0),  n2(0),                     n2(0), n2(emp.lwf_employee||0),  n2(emp.loan||0),          n2(esiEmpr) ],
      [emp.uan||'0', fDate(emp.doj),'', n2(0),     n2(emp.el||0),                n2(emp.lop_days||0),'',                       n2(0),                     n2(0), n2(emp.prof_tax||0),      n2(0),                    n2(0)       ],
      [emp.esic_no||'',emp.bank_account||'',n2(0),n2(emp.gross_earned||0),n2(emp.ot_hours||0),n2(emp.workday||0),n2(0),        n2(emp.ot_earned||0),      n2(emp.gross_earned||0),n2(0),n2(emp.total_deductions||0),n2(totEmpr)  ],
    ];
    const DKEYS = ['p_l','p_r','r1','r2','a1','a2','e1','e2','e3','d1','d2','es'];

    // One merged block per group — no internal horizontal or vertical dividers
    bdr(CX.p_l, y, CW.p_l + CW.p_r,        EH);
    bdr(CX.r1,  y, CW.r1  + CW.r2,          EH);
    bdr(CX.a1,  y, CW.a1  + CW.a2,          EH);
    bdr(CX.e1,  y, CW.e1  + CW.e2 + CW.e3,  EH);
    bdr(CX.d1,  y, CW.d1  + CW.d2,          EH);
    bdr(CX.es,  y, CW.es,                   EH);

    // Text only — row 4 bold, row 0 name bold
    for (let r = 0; r < 5; r++) {
      const ry   = y + r * DH;
      const bold = r === 4;
      txt(CX.p_l, ry, CW.p_l, DH, DATA[r][0], 6.5, 'left',  r === 0 ? true : bold);
      txt(CX.p_r, ry, CW.p_r, DH, DATA[r][1], 6.5, 'right', bold);
      for (let c = 2; c < DKEYS.length; c++) {
        const k = DKEYS[c];
        txt(CX[k], ry, CW[k], DH, DATA[r][c], 6.5, 'right', bold);
      }
    }
  }

  // ── Totals Group ───────────────────────────────────────────────────────────
  function drawTotals(y) {
    const emps = data.employees;
    const sum  = k => emps.reduce((a, e) => a + (parseFloat(e[k]) || 0), 0);
    const eps_t    = sum('eps_contribution');
    const pfE_t    = sum('pf_employer');
    const esiE_t   = sum('esi_employer');
    const diff_t   = Math.max(0, pfE_t - eps_t);
    const totE_t   = eps_t + esiE_t + diff_t;
    const mCTC_t   = sum('monthly_ctc');

    bdr(CX.id,   y, CW.id,   EH);
    bdr(CX.net,  y, CW.net,  EH);
    txt(CX.net,  y, CW.net,  EH, nNet(sum('net_pay')), 7, 'right', true);
    bdr(CX.sign, y, CW.sign, EH);

    const DKEYS = ['p_l','p_r','r1','r2','a1','a2','e1','e2','e3','d1','d2','es'];
    const TOT   = [
      // p_l      p_r  r1      r2      a1                         a2              e1                       e2                       e3      d1                        d2                        es
      ['Total','', n2(0), n2(0),  n2(sum('total_working_days')), n2(sum('cl')),  n2(sum('basic_earned')), n2(sum('spl_all_earned')),n2(0), n2(sum('epf_employee')),  n2(sum('tds')),           n2(eps_t)  ],
      ['',     '', n2(0), n2(0),  n2(sum('weekoff')),            n2(sum('sl')),  n2(sum('hra_earned')),   n2(0),                    n2(0), n2(sum('esic_employee')), n2(sum('advance')),       n2(diff_t) ],
      ['',     '', n2(0), n2(0),  n2(sum('nfh')),                n2(0),          n2(sum('convey_earned')),n2(0),                    n2(0), n2(sum('lwf_employee')),  n2(sum('loan')),          n2(esiE_t) ],
      ['',     '', '',    n2(0),  n2(sum('el')),                 n2(sum('lop_days')),'',                  n2(0),                    n2(0), n2(sum('prof_tax')),      n2(0),                    n2(0)      ],
      ['',     '', n2(0), n2(sum('gross_earned')), n2(sum('ot_hours')), n2(sum('workday')), n2(0),        n2(sum('ot_earned')),     n2(sum('gross_earned')), n2(0), n2(sum('total_deductions')),n2(totE_t) ],
    ];

    // One merged block per group — no internal horizontal or vertical dividers
    bdr(CX.p_l, y, CW.p_l + CW.p_r,        EH);
    bdr(CX.r1,  y, CW.r1  + CW.r2,          EH);
    bdr(CX.a1,  y, CW.a1  + CW.a2,          EH);
    bdr(CX.e1,  y, CW.e1  + CW.e2 + CW.e3,  EH);
    bdr(CX.d1,  y, CW.d1  + CW.d2,          EH);
    bdr(CX.es,  y, CW.es,                   EH);

    // Text only — row 0 "Total" label bold, row 4 totals bold
    for (let r = 0; r < 5; r++) {
      const ry   = y + r * DH;
      const bold = r === 0 || r === 4;
      txt(CX.p_l, ry, CW.p_l, DH, TOT[r][0], 6.5, 'left',  bold);
      txt(CX.p_r, ry, CW.p_r, DH, TOT[r][1], 6.5, 'right', bold);
      for (let c = 2; c < DKEYS.length; c++) {
        const k = DKEYS[c];
        txt(CX[k], ry, CW[k], DH, TOT[r][c], 6.5, 'right', bold);
      }
    }
  }

  // ── Pagination & render ────────────────────────────────────────────────────
  if (!data.employees || data.employees.length === 0) {
    doc.addPage({ size: [PW, PH] });
    doc.fontSize(12).text('No payroll data found for this period.', ML, 40);
    doc.end();
    return new Promise((r, j) => { stream.on('finish', () => r(outputPath)); stream.on('error', j); });
  }

  const HDR_H       = CO_H + SEC_H + SH * 5;
  const AVAIL_H     = PH - MT - MB - HDR_H;
  const EMPS_PER_PG = Math.max(1, Math.floor((AVAIL_H - EH) / EH)); // leave 1 group for totals

  let empIdx = 0, pageNum = 1;

  while (empIdx < data.employees.length) {
    doc.addPage({ size: [PW, PH] });
    doc.lineWidth(0.5).strokeColor('#000').fillColor('#000');

    drawCompanyHeader(MT, pageNum);
    const tblY = MT + CO_H;
    drawTableHeader(tblY);

    let rowY   = tblY + SEC_H + SH * 5;
    const pgEnd = Math.min(empIdx + EMPS_PER_PG, data.employees.length);

    while (empIdx < pgEnd) {
      drawEmployee(data.employees[empIdx], empIdx + 1, rowY);
      rowY  += EH;
      empIdx++;
    }

    // Totals on last page only
    if (empIdx >= data.employees.length) {
      drawTotals(rowY);
    }
    pageNum++;
  }

  doc.end();
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

// ─── REPORT 3: MONTHLY SUMMARY (SUM sheet) ────────────────────────────────────

/**
 * generateMonthlySummary(data, outputPath)
 * data = {
 *   company: { name, address, month_label },
 *   totals: { all earning heads, deductions, attendance },
 *   epf: { members, wages, employee_a1, pension_a10, employer_a1, admin_a2, edli_a21, edli_charges_a22, ... },
 *   esi: { employee, employer, wages, total },
 *   lwf: { employee, employer, total },
 *   pt: { total },
 *   employee_count: 16,
 *   epf_exempt_count: 1,
 *   epf_exempt_wages: 18548,
 * }
 */
function generateMonthlySummary(data, outputPath) {
  const doc = new PDFDocument({ size: 'A4', margin: 30, autoFirstPage: true });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const PAGE_W = 595.28;
  const M = 30;
  const W = PAGE_W - M * 2;
  let y = M;

  // ── Header ──
  doc.fontSize(12).font('Helvetica-Bold')
     .text(data.company.name, M, y, { align: 'right', width: W });
  y += 15;
  doc.fontSize(8).font('Helvetica')
     .text(data.company.address, M, y, { align: 'right', width: W });
  y += 18;
  doc.fontSize(10).font('Helvetica-Bold')
     .text(`Total Salary / Wages for the month of : ${data.company.month_label}`, M, y, { align: 'center', width: W });
  y += 20;

  const sectionTitle = (title) => {
    doc.fontSize(8).font('Helvetica-Bold')
       .text(title, M, y);
    y += 13;
  };

  const twoCol = (label, value, indent = 0) => {
    doc.fontSize(7.5).font('Helvetica')
       .text(label, M + indent, y, { width: W * 0.65 });
    doc.font('Helvetica-Bold')
       .text(String(value || 0), M + W * 0.65, y, { width: W * 0.35, align: 'right' });
    y += 12;
  };

  const divider = () => {
    doc.moveTo(M, y).lineTo(M + W, y).strokeColor('#CCCCCC').stroke().strokeColor('black');
    y += 6;
  };

  // ── Earnings Summary ──
  sectionTitle('Earning Summary');
  const { totals } = data;
  twoCol('BASIC', totals.basic);
  twoCol('H.R.A.', totals.hra || 0);
  twoCol('CONVEY.', totals.convey || 0);
  twoCol('SPL.ALL', totals.spl_all || 0);
  twoCol('MEDICAL', totals.medical || 0);
  twoCol('ALL-1 to ALL-6', totals.allowances_other || 0);
  twoCol('ARR-1 / ARR-2 / ARR-3', totals.arrears || 0);
  twoCol('ATT. ALL', totals.att_all || 0);
  twoCol('D.Wage-1 to D.Wage-6', totals.daily_wages || 0);
  twoCol('OT Amount', totals.ot_amount || 0);
  doc.fontSize(7.5).font('Helvetica-Bold')
     .text('Total Earned', M, y, { width: W * 0.65 })
     .text(String(totals.gross_earned || 0), M + W * 0.65, y, { width: W * 0.35, align: 'right' });
  y += 14;
  divider();

  // ── Deduction Summary ──
  sectionTitle('Deduction Summary (Employee)');
  twoCol('E.P.F. (Employee)', totals.epf_employee || 0);
  twoCol('E.P.F. (Voluntary)', totals.vol_epf || 0);
  twoCol('E.S.I.C. (Employee)', totals.esic_employee || 0);
  twoCol('L.W.F. (Employee)', totals.lwf_employee || 0);
  twoCol('Prof. Tax', totals.prof_tax || 0);
  twoCol('T.D.S.', totals.tds || 0);
  twoCol('Advance', totals.advance || 0);
  twoCol('Loan', totals.loan || 0);
  twoCol('Food', totals.food || 0);
  doc.fontSize(7.5).font('Helvetica-Bold')
     .text('Total Deduction', M, y, { width: W * 0.65 })
     .text(String(totals.total_deductions || 0), M + W * 0.65, y, { width: W * 0.35, align: 'right' });
  y += 14;
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1a6b1a')
     .text('Net Payable', M, y, { width: W * 0.65 })
     .text(String(totals.net_pay || 0), M + W * 0.65, y, { width: W * 0.35, align: 'right' });
  doc.fillColor('black');
  y += 14;
  divider();

  // ── Employee Count ──
  sectionTitle('Attendance Summary');
  twoCol('Total Employees', data.employee_count || 0);
  twoCol('EPF Members', data.epf?.members || 0);
  twoCol('ESI Exempt Employees', data.epf_exempt_count || 0);
  twoCol('ESI Exempt Wages', data.epf_exempt_wages || 0);
  divider();

  // ── EPF Challan ──
  sectionTitle('EPF Challan Details');
  const epf = data.epf || {};
  twoCol('Total Wages (EPF)', epf.wages || 0);
  twoCol('EPF Members', epf.members || 0);
  twoCol('Employee EPF A/C-01', epf.employee_a1 || 0);
  twoCol('Pension A/C-10', epf.pension_a10 || 0);
  twoCol('Employer EPF Difference A/C-01', epf.employer_diff_a1 || 0);
  twoCol('Admin Charges A/C-02', epf.admin_a2 || 0);
  twoCol('EDLI A/C-21', epf.edli_a21 || 0);
  twoCol('EDLI Admin Charges A/C-22', epf.edli_charges_a22 || 0);
  doc.fontSize(7.5).font('Helvetica-Bold')
     .text('Total EPF Challan Amount', M, y, { width: W * 0.65 })
     .text(String(epf.total_challan || 0), M + W * 0.65, y, { width: W * 0.35, align: 'right' });
  y += 14;
  divider();

  // ── ESI Challan ──
  sectionTitle('ESI Challan Details');
  const esi = data.esi || {};
  twoCol('Total Wages (ESI)', esi.wages || 0);
  twoCol('Employee ESI Contribution', esi.employee || 0);
  twoCol('Employer ESI Contribution', esi.employer || 0);
  doc.fontSize(7.5).font('Helvetica-Bold')
     .text('Total ESI Challan Amount', M, y, { width: W * 0.65 })
     .text(String(esi.total || 0), M + W * 0.65, y, { width: W * 0.35, align: 'right' });
  y += 14;
  divider();

  // ── LWF + PT ──
  sectionTitle('LWF & Professional Tax');
  const lwf = data.lwf || {};
  twoCol('LWF Employee', lwf.employee || 0);
  twoCol('LWF Employer', lwf.employer || 0);
  twoCol('LWF Total', lwf.total || 0);
  twoCol('Professional Tax Total', data.pt?.total || 0);

  doc.end();
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  generatePaySlips,
  generateSalarySheet,
  generateMonthlySummary,
  getOutputPath,
};
