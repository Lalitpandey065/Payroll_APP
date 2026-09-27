/**
 * DataMaintenanceGrid – reusable inline-edit grid for all Data Maintenance pages.
 *
 * Props:
 *   columns      : [{ key, label, width?, type?, options?, readOnly?, align? }]
 *   rows         : array of row objects (from IPC)
 *   onSave       : async (changedRows) => void
 *   onExit       : () => void
 *   loading      : bool
 *   title        : string (page heading shown in header)
 *   pageSize     : number (default 25)
 *   searchKeys   : [key, ...] – which fields to search
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Save, LogOut, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE_DEFAULT = 25;

export default function DataMaintenanceGrid({
  columns   = [],
  rows      = [],
  onSave,
  onExit,
  loading   = false,
  title     = '',
  pageSize  = PAGE_SIZE_DEFAULT,
  searchKeys = [],
}) {
  const [localRows,    setLocalRows]    = useState(() => rows.map(r => ({ ...r })));
  const [changed,      setChanged]      = useState(new Set()); // emp_ids that changed
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(1);
  const [saving,       setSaving]       = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState(null);

  // Keep localRows in sync when parent refreshes rows
  React.useEffect(() => {
    setLocalRows(rows.map(r => ({ ...r })));
    setChanged(new Set());
    setPage(1);
  }, [rows]);

  // ── search / filter ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return localRows;
    const q = search.toLowerCase();
    const keys = searchKeys.length ? searchKeys : columns.map(c => c.key);
    return localRows.filter(row =>
      keys.some(k => String(row[k] ?? '').toLowerCase().includes(q))
    );
  }, [localRows, search, searchKeys, columns]);

  // ── pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows   = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // ── cell change ───────────────────────────────────────────────────────────
  const handleChange = useCallback((empId, key, value) => {
    setLocalRows(prev =>
      prev.map(r => r.emp_id === empId ? { ...r, [key]: value } : r)
    );
    setChanged(prev => new Set([...prev, empId]));
  }, []);

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      const changedRows = localRows.filter(r => changed.has(r.emp_id));
      await onSave(changedRows);
      setChanged(new Set());
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── render cell ───────────────────────────────────────────────────────────
  const renderCell = (col, row) => {
    if (col.readOnly) {
      return (
        <span style={{ fontSize: 12, color: '#374151' }}>{row[col.key] ?? ''}</span>
      );
    }

    const isChanged = changed.has(row.emp_id);

    if (col.type === 'select') {
      return (
        <select
          value={row[col.key] ?? ''}
          onChange={e => handleChange(row.emp_id, col.key, e.target.value)}
          style={{
            width: '100%', fontSize: 12, border: '1px solid #d1d5db',
            borderRadius: 3, padding: '1px 2px', background: '#fff',
            color: '#111827'
          }}
        >
          {(col.options || []).map(opt => (
            <option key={opt.value ?? opt} value={opt.value ?? opt}>
              {opt.label ?? opt}
            </option>
          ))}
        </select>
      );
    }

    // default: number or text input
    return (
      <input
        type={col.type === 'number' ? 'number' : 'text'}
        value={row[col.key] ?? ''}
        onChange={e => handleChange(row.emp_id, col.key, e.target.value)}
        style={{
          width: '100%', fontSize: 12, border: '1px solid #d1d5db',
          borderRadius: 3, padding: '1px 3px', background: '#fff',
          color: '#111827', textAlign: col.align || (col.type === 'number' ? 'right' : 'left')
        }}
      />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f9fafb' }}>

      {/* ── top bar ── */}
      <div style={{
        background: '#1e3a5f', color: '#fff', padding: '8px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.3 }}>{title}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search..."
              style={{
                paddingLeft: 22, paddingRight: 8, paddingTop: 4, paddingBottom: 4,
                fontSize: 12, borderRadius: 4, border: '1px solid #334f70',
                background: '#16304f', color: '#e2e8f0', width: 180, outline: 'none'
              }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || changed.size === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', background: changed.size > 0 ? '#16a34a' : '#374151',
              color: '#fff', border: 'none', borderRadius: 4, cursor: changed.size > 0 ? 'pointer' : 'not-allowed',
              fontSize: 12, fontWeight: 600
            }}
          >
            <Save size={13} />
            {saving ? 'Saving…' : `Save${changed.size > 0 ? ` (${changed.size})` : ''}`}
          </button>

          <button
            onClick={onExit}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', background: '#dc2626',
              color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
              fontSize: 12, fontWeight: 600
            }}
          >
            <LogOut size={13} />
            Exit
          </button>
        </div>
      </div>

      {/* ── grid ── */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
          Loading…
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#1e3a5f', color: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ width: 36, padding: '6px 4px', fontWeight: 600, fontSize: 11, textAlign: 'center', borderRight: '1px solid #334f70' }}>
                  #
                </th>
                {columns.map(col => (
                  <th
                    key={col.key}
                    style={{
                      padding: '6px 6px', fontWeight: 600, fontSize: 11,
                      textAlign: col.align || 'left', whiteSpace: 'nowrap',
                      borderRight: '1px solid #334f70',
                      minWidth: col.width || 80
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>
                    {search ? 'No records match your search.' : 'No records found.'}
                  </td>
                </tr>
              ) : pageRows.map((row, idx) => {
                const globalIdx = (page - 1) * pageSize + idx + 1;
                const isSelected = selectedEmpId === row.emp_id;
                const isOdd = idx % 2 === 0;
                const rowBg = isSelected ? '#dbeafe' : isOdd ? '#ffffff' : '#f0f4f8';
                return (
                  <tr
                    key={row.emp_id}
                    onClick={() => setSelectedEmpId(isSelected ? null : row.emp_id)}
                    style={{
                      background: rowBg,
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ textAlign: 'center', padding: '3px 4px', color: '#6b7280', fontSize: 11, borderRight: '1px solid #e5e7eb' }}>
                      {globalIdx}
                    </td>
                    {columns.map(col => (
                      <td
                        key={col.key}
                        style={{
                          padding: '3px 6px',
                          borderRight: '1px solid #e5e7eb',
                          textAlign: col.align || (col.type === 'number' ? 'right' : 'left'),
                          maxWidth: col.width || 120
                        }}
                        onClick={e => { if (!col.readOnly) e.stopPropagation(); }}
                      >
                        {renderCell(col, row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── footer / pagination ── */}
      <div style={{
        background: '#1e3a5f', color: '#e2e8f0', padding: '5px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, fontSize: 12
      }}>
        <span>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          {changed.size > 0 && ` · ${changed.size} unsaved change${changed.size !== 1 ? 's' : ''}`}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ background: 'none', border: 'none', color: page === 1 ? '#64748b' : '#fff', cursor: page === 1 ? 'default' : 'pointer', padding: '2px 4px' }}
          >
            <ChevronLeft size={14} />
          </button>
          <span>Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ background: 'none', border: 'none', color: page === totalPages ? '#64748b' : '#fff', cursor: page === totalPages ? 'default' : 'pointer', padding: '2px 4px' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
