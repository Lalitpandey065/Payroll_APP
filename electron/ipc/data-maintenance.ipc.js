const { ipcMain } = require('electron');
const { getDB, newId } = require('../db/database');

// ─── helpers ───────────────────────────────────────────────────────────────────
function ok(data)  { return { success: true,  data }; }
function err(e)    { return { success: false, error: e.message }; }

/** Base employee query shared by all pages */
function baseRows(companyId) {
  const db = getDB();
  return db.prepare(`
    SELECT
      e.id                                       AS emp_id,
      e.emp_code                                 AS id_no,
      (e.first_name || ' ' || e.last_name)       AS name,
      COALESCE(e.father_name, '')                AS father_name,
      COALESCE(ei.uan, '')                       AS uan,
      COALESCE(ei.esi_insurance_number, '')      AS esic_no,
      e.doj                                      AS joining_date,
      COALESCE(e.designation, '')                AS designation,
      COALESCE(e.department, '')                 AS department,
      COALESCE(e.location, '')                   AS branch,
      COALESCE(e.cost_centre, '')                AS location,
      e.status
    FROM employees e
    LEFT JOIN employee_identity ei ON ei.emp_id = e.id
    WHERE e.company_id = ? AND e.deleted_at IS NULL
    ORDER BY e.emp_code
  `).all(companyId);
}

/** Latest salary record per employee */
function latestSalary(companyId) {
  const db = getDB();
  return db.prepare(`
    SELECT es.*
    FROM employee_salary es
    INNER JOIN employees e ON e.id = es.emp_id
    WHERE e.company_id = ?
      AND es.id = (
        SELECT id FROM employee_salary WHERE emp_id = es.emp_id
        ORDER BY effective_from DESC LIMIT 1
      )
  `).all(companyId);
}

/** Parse component_overrides JSON safely */
function parseCO(raw) {
  if (!raw) return {};
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return {}; }
}

// ─── Page 1: Emoluments → Salary ──────────────────────────────────────────────
ipcMain.handle('data-maintenance:get-emoluments-salary', async (_, { companyId }) => {
  try {
    const rows  = baseRows(companyId);
    const salMap = {};
    for (const s of latestSalary(companyId)) salMap[s.emp_id] = s;

    const data = rows.map(r => {
      const sal = salMap[r.emp_id] || {};
      const co  = parseCO(sal.component_overrides);
      return {
        ...r,
        salary_id:  sal.id || null,
        basic:      co.BASIC      ?? co.basic      ?? 0,
        hra:        co.HRA        ?? co.hra        ?? 0,
        convey:     co.CONVEY     ?? co.convey     ?? 0,
        hea:        co.HEA        ?? co.hea        ?? 0,
        spl_all:    co.SPL_ALL    ?? co.spl_all    ?? 0,
        medical:    co.MEDICAL    ?? co.medical    ?? 0,
        cca:        co.CCA        ?? co.cca        ?? 0,
        perf_bon:   co.PERF_BON   ?? co.perf_bon   ?? 0,
        all_01:     co.ALL_01     ?? co.all_01     ?? 0,
        all_02:     co.ALL_02     ?? co.all_02     ?? 0,
        all_03:     co.ALL_03     ?? co.all_03     ?? 0,
      };
    });
    return ok(data);
  } catch (e) { return err(e); }
});

ipcMain.handle('data-maintenance:save-emoluments-salary', async (_, { companyId, rows }) => {
  try {
    const db = getDB();
    const COMP_KEYS = ['BASIC','HRA','CONVEY','HEA','SPL_ALL','MEDICAL','CCA','PERF_BON','ALL_01','ALL_02','ALL_03'];
    const MAP = { basic:'BASIC', hra:'HRA', convey:'CONVEY', hea:'HEA', spl_all:'SPL_ALL',
                  medical:'MEDICAL', cca:'CCA', perf_bon:'PERF_BON', all_01:'ALL_01',
                  all_02:'ALL_02', all_03:'ALL_03' };

    db.transaction(() => {
      for (const row of rows) {
        const sal = db.prepare(
          `SELECT id, component_overrides FROM employee_salary WHERE emp_id = ? ORDER BY effective_from DESC LIMIT 1`
        ).get(row.emp_id);

        if (!sal) continue; // no salary record — skip (needs a structure first)

        const co = parseCO(sal.component_overrides);
        for (const [field, key] of Object.entries(MAP)) {
          co[key] = parseFloat(row[field]) || 0;
        }
        // Recompute gross (sum of comp keys present)
        const gross = COMP_KEYS.reduce((s, k) => s + (parseFloat(co[k]) || 0), 0);

        db.prepare(`
          UPDATE employee_salary
          SET component_overrides = ?, monthly_ctc = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(JSON.stringify(co), gross, sal.id);
      }
    })();
    return ok({ saved: rows.length });
  } catch (e) { return err(e); }
});

// ─── Page 2: Deductions ────────────────────────────────────────────────────────
ipcMain.handle('data-maintenance:get-deductions', async (_, { companyId }) => {
  try {
    const db   = getDB();
    const rows = baseRows(companyId);
    const deds = db.prepare(
      `SELECT d.* FROM dm_deductions d
       INNER JOIN employees e ON e.id = d.emp_id
       WHERE e.company_id = ?`
    ).all(companyId);
    const dedMap = Object.fromEntries(deds.map(d => [d.emp_id, d]));

    return ok(rows.map(r => {
      const d = dedMap[r.emp_id] || {};
      return { ...r, advance: d.advance||0, loan: d.loan||0, tds: d.tds||0,
               vol_pf: d.vol_pf||0, vol_pf_percent: d.vol_pf_percent||0,
               food: d.food||0, transport: d.transport||0,
               ded_03: d.ded_03||0, ded_04: d.ded_04||0 };
    }));
  } catch (e) { return err(e); }
});

ipcMain.handle('data-maintenance:save-deductions', async (_, { companyId, rows }) => {
  try {
    const db = getDB();
    const upsert = db.prepare(`
      INSERT INTO dm_deductions
        (id, emp_id, company_id, advance, loan, tds, vol_pf, vol_pf_percent, food, transport, ded_03, ded_04)
      VALUES (@id, @emp_id, @company_id, @advance, @loan, @tds, @vol_pf, @vol_pf_percent, @food, @transport, @ded_03, @ded_04)
      ON CONFLICT(emp_id) DO UPDATE SET
        advance=excluded.advance, loan=excluded.loan, tds=excluded.tds,
        vol_pf=excluded.vol_pf, vol_pf_percent=excluded.vol_pf_percent,
        food=excluded.food, transport=excluded.transport,
        ded_03=excluded.ded_03, ded_04=excluded.ded_04,
        updated_at=datetime('now')
    `);
    db.transaction(() => {
      for (const row of rows) {
        upsert.run({ id: newId(), emp_id: row.emp_id, company_id: companyId,
          advance: row.advance||0, loan: row.loan||0, tds: row.tds||0,
          vol_pf: row.vol_pf||0, vol_pf_percent: row.vol_pf_percent||0,
          food: row.food||0, transport: row.transport||0,
          ded_03: row.ded_03||0, ded_04: row.ded_04||0 });
      }
    })();
    return ok({ saved: rows.length });
  } catch (e) { return err(e); }
});

// ─── Page 3: ESI Limit ────────────────────────────────────────────────────────
ipcMain.handle('data-maintenance:get-esi-limits', async (_, { companyId }) => {
  try {
    const db   = getDB();
    const rows = baseRows(companyId);
    const cfgs = db.prepare(
      `SELECT sc.* FROM employee_statutory_config sc
       WHERE sc.company_id = ?`
    ).all(companyId);
    const cfgMap = Object.fromEntries(cfgs.map(c => [c.emp_id, c]));

    return ok(rows.map(r => {
      const c = cfgMap[r.emp_id] || {};
      return { ...r,
               esi_status: c.is_esi_enabled ? 'Yes' : 'No',
               esi_limit:  c.esi_limit ?? 21000 };
    }));
  } catch (e) { return err(e); }
});

ipcMain.handle('data-maintenance:save-esi-limits', async (_, { companyId, rows }) => {
  try {
    const db = getDB();
    const upd = db.prepare(
      `UPDATE employee_statutory_config SET esi_limit = ?, updated_at = datetime('now')
       WHERE emp_id = ? AND company_id = ?`
    );
    db.transaction(() => {
      for (const row of rows) upd.run(parseFloat(row.esi_limit)||21000, row.emp_id, companyId);
    })();
    return ok({ saved: rows.length });
  } catch (e) { return err(e); }
});

// ─── Page 4: KYC → Statutory Numbers ──────────────────────────────────────────
ipcMain.handle('data-maintenance:get-statutory-numbers', async (_, { companyId }) => {
  try {
    const db   = getDB();
    const rows = baseRows(companyId);
    const ids  = db.prepare(
      `SELECT ei.* FROM employee_identity ei
       INNER JOIN employees e ON e.id = ei.emp_id
       WHERE e.company_id = ?`
    ).all(companyId);
    const idMap = Object.fromEntries(ids.map(i => [i.emp_id, i]));
    const cfgs  = db.prepare(
      `SELECT sc.emp_id, sc.is_pf_enabled, sc.is_esi_enabled, sc.is_lwf_enabled, sc.is_pt_enabled
       FROM employee_statutory_config sc WHERE sc.company_id = ?`
    ).all(companyId);
    const cfgMap = Object.fromEntries(cfgs.map(c => [c.emp_id, c]));

    return ok(rows.map(r => {
      const id  = idMap[r.emp_id]  || {};
      const cfg = cfgMap[r.emp_id] || {};
      return { ...r,
        epf_status:  cfg.is_pf_enabled  ? 'Yes' : 'No',
        uan:         id.uan              || '',
        epf_no:      id.pf_account_number || '',
        esi_status:  cfg.is_esi_enabled  ? 'Yes' : 'No',
        esic_no:     id.esi_insurance_number || '',
        lwf_status:  cfg.is_lwf_enabled  ? 'Yes' : 'No',
        lwf_no:      id.lwf_no           || '',
        pt_status:   cfg.is_pt_enabled   ? 'Yes' : 'No',
        ptax_no:     id.ptax_no          || '',
      };
    }));
  } catch (e) { return err(e); }
});

ipcMain.handle('data-maintenance:save-statutory-numbers', async (_, { companyId, rows }) => {
  try {
    const db = getDB();
    const upd = db.prepare(`
      UPDATE employee_identity SET
        uan = ?, pf_account_number = ?, esi_insurance_number = ?,
        lwf_no = ?, ptax_no = ?, updated_at = datetime('now')
      WHERE emp_id = ?
    `);
    db.transaction(() => {
      for (const row of rows)
        upd.run(row.uan||'', row.epf_no||'', row.esic_no||'',
                row.lwf_no||'', row.ptax_no||'', row.emp_id);
    })();
    return ok({ saved: rows.length });
  } catch (e) { return err(e); }
});

ipcMain.handle('data-maintenance:export-statutory-numbers-excel', async (_, { companyId, companyName }) => {
  try {
    const ExcelJS = require('exceljs');
    const path    = require('path');
    const { app } = require('electron');
    const db      = getDB();

    // Fetch data directly
    const rows = baseRows(companyId);
    const ids  = db.prepare(`SELECT ei.* FROM employee_identity ei INNER JOIN employees e ON e.id = ei.emp_id WHERE e.company_id = ?`).all(companyId);
    const idMap = Object.fromEntries(ids.map(i => [i.emp_id, i]));
    const cfgs  = db.prepare(`SELECT sc.emp_id, sc.is_pf_enabled, sc.is_esi_enabled, sc.is_lwf_enabled, sc.is_pt_enabled FROM employee_statutory_config sc WHERE sc.company_id = ?`).all(companyId);
    const cfgMap = Object.fromEntries(cfgs.map(c => [c.emp_id, c]));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Statutory Numbers');

    ws.columns = [
      { header: 'System #',     key: 'sys',        width: 10 },
      { header: 'ID #',         key: 'id_no',       width: 12 },
      { header: 'Name',         key: 'name',        width: 25 },
      { header: 'Father Name',  key: 'father_name', width: 25 },
      { header: 'Joining Date', key: 'doj',         width: 14 },
      { header: 'EPF Status',   key: 'epf_status',  width: 12 },
      { header: 'UAN',          key: 'uan',         width: 18 },
      { header: 'EPF No.',      key: 'epf_no',      width: 18 },
      { header: 'ESI Status',   key: 'esi_status',  width: 12 },
      { header: 'ESIC No.',     key: 'esic_no',     width: 18 },
      { header: 'LWF Status',   key: 'lwf_status',  width: 12 },
      { header: 'LWF No.',      key: 'lwf_no',      width: 14 },
      { header: 'PTax Status',  key: 'pt_status',   width: 12 },
      { header: 'PTax No.',     key: 'ptax_no',     width: 14 },
    ];

    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    rows.forEach((r, i) => {
      const id  = idMap[r.emp_id]  || {};
      const cfg = cfgMap[r.emp_id] || {};
      ws.addRow({
        sys:        i + 1,
        id_no:      r.id_no,
        name:       r.name,
        father_name: r.father_name,
        doj:        r.joining_date,
        epf_status: cfg.is_pf_enabled  ? 'Yes' : 'No',
        uan:        id.uan             || '',
        epf_no:     id.pf_account_number || '',
        esi_status: cfg.is_esi_enabled  ? 'Yes' : 'No',
        esic_no:    id.esi_insurance_number || '',
        lwf_status: cfg.is_lwf_enabled  ? 'Yes' : 'No',
        lwf_no:     id.lwf_no          || '',
        pt_status:  cfg.is_pt_enabled   ? 'Yes' : 'No',
        ptax_no:    id.ptax_no         || '',
      });
    });

    const date    = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const safe    = (companyName || 'Company').replace(/[^a-zA-Z0-9]/g,'_');
    const outDir  = app.getPath('downloads');
    const outPath = path.join(outDir, `StatutoryNumbers_${safe}_${date}.xlsx`);
    await wb.xlsx.writeFile(outPath);

    const { shell } = require('electron');
    shell.openPath(outPath);
    return ok({ path: outPath });
  } catch (e) { return err(e); }
});

// ─── Page 5: KYC → Statutory Status ──────────────────────────────────────────
ipcMain.handle('data-maintenance:get-statutory-status', async (_, { companyId }) => {
  try {
    const db   = getDB();
    const rows = baseRows(companyId);
    const cfgs = db.prepare(
      `SELECT * FROM employee_statutory_config WHERE company_id = ?`
    ).all(companyId);
    const cfgMap = Object.fromEntries(cfgs.map(c => [c.emp_id, c]));

    return ok(rows.map(r => {
      const c = cfgMap[r.emp_id] || {};
      return { ...r,
        epf_status:     c.is_pf_enabled   ? 'Yes' : 'No',
        pension_status: c.pension_applicable || 'No',
        edli_status:    c.edli_applicable    || 'No',
        esi_status:     c.is_esi_enabled  ? 'Yes' : 'No',
        lwf_status:     c.lwf_applicable   || 'No',
        pt_status:      c.pt_applicable    || 'No',
      };
    }));
  } catch (e) { return err(e); }
});

ipcMain.handle('data-maintenance:save-statutory-status', async (_, { companyId, rows }) => {
  try {
    const db = getDB();
    const upd = db.prepare(`
      UPDATE employee_statutory_config SET
        is_pf_enabled = ?, pension_applicable = ?, edli_applicable = ?,
        is_esi_enabled = ?,
        is_lwf_enabled = ?, lwf_applicable = ?,
        is_pt_enabled  = ?, pt_applicable = ?,
        updated_at = datetime('now')
      WHERE emp_id = ? AND company_id = ?
    `);
    db.transaction(() => {
      for (const row of rows) {
        const lwfYes = row.lwf_status === 'Yes' ? 1 : 0;
        const ptYes  = row.pt_status  === 'Yes' ? 1 : 0;
        upd.run(
          row.epf_status     === 'Yes' ? 1 : 0,
          row.pension_status || 'No',
          row.edli_status    || 'No',
          row.esi_status     === 'Yes' ? 1 : 0,
          lwfYes, row.lwf_status || 'No',
          ptYes,  row.pt_status  || 'No',
          row.emp_id, companyId
        );
      }
    })();
    return ok({ saved: rows.length });
  } catch (e) { return err(e); }
});

// ─── Page 6: KYC → Salary/OT Type ────────────────────────────────────────────
ipcMain.handle('data-maintenance:get-salary-ot-type', async (_, { companyId }) => {
  try {
    const rows   = baseRows(companyId);
    const salMap = {};
    for (const s of latestSalary(companyId)) salMap[s.emp_id] = s;

    return ok(rows.map(r => {
      const s = salMap[r.emp_id] || {};
      return { ...r,
        salary_id:   s.id        || null,
        month_type:  s.salary_type || 'Month',
        ot_type:     s.ot_type    || 'Salary' };
    }));
  } catch (e) { return err(e); }
});

ipcMain.handle('data-maintenance:save-salary-ot-type', async (_, { companyId, rows }) => {
  try {
    const db  = getDB();
    const upd = db.prepare(`
      UPDATE employee_salary SET salary_type = ?, ot_type = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    db.transaction(() => {
      for (const row of rows) {
        if (row.salary_id) upd.run(row.month_type||'Month', row.ot_type||'Salary', row.salary_id);
      }
    })();
    return ok({ saved: rows.length });
  } catch (e) { return err(e); }
});

// ─── Page 7: Master → ICard ───────────────────────────────────────────────────
ipcMain.handle('data-maintenance:get-icard-list', async (_, { companyId }) => {
  try {
    const db   = getDB();
    const rows = baseRows(companyId);
    const salMap = {};
    for (const s of latestSalary(companyId)) salMap[s.emp_id] = s;

    return ok(rows.map((r, i) => {
      const sal = salMap[r.emp_id] || {};
      const co  = parseCO(sal.component_overrides);
      const gross = Object.values(co).reduce((s, v) => s + (parseFloat(v)||0), 0);
      return { ...r,
        sys_no:    i + 1,
        new_id:    r.id_no,
        state:     '',
        category:  '',
        basic:     co.BASIC ?? co.basic ?? 0,
        gross:     sal.monthly_ctc || gross,
        salary_type: sal.salary_type || 'Month',
      };
    }));
  } catch (e) { return err(e); }
});

ipcMain.handle('data-maintenance:save-icard', async (_, { companyId, rows }) => {
  try {
    const db  = getDB();
    const upd = db.prepare(
      `UPDATE employees SET emp_code = ?, updated_at = datetime('now') WHERE id = ? AND company_id = ?`
    );
    db.transaction(() => {
      for (const row of rows) {
        if (row.new_id && row.new_id !== row.id_no) upd.run(row.new_id, row.emp_id, companyId);
      }
    })();
    return ok({ saved: rows.length });
  } catch (e) { return err(e); }
});
