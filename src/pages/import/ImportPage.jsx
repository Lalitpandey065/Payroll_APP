import React, { useState } from 'react';
import {
  FileSpreadsheet, Download, Upload, CheckCircle,
  AlertTriangle, XCircle, Users, CalendarRange, ChevronDown
} from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { MONTH_NAMES } from '../../utils/constants';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: CURRENT_YEAR - 1, label: `${CURRENT_YEAR - 1}` },
  { value: CURRENT_YEAR,     label: `${CURRENT_YEAR}` },
  { value: CURRENT_YEAR + 1, label: `${CURRENT_YEAR + 1}` }
];

function ResultBanner({ result }) {
  if (!result) return null;
  const total   = (result.imported || 0) + (result.updated || 0) + (result.skipped || 0);
  const success = (result.imported || 0) + (result.updated || 0);
  return (
    <div className={`rounded-xl p-4 border ${success > 0 ? 'bg-[var(--success-light)] border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center space-x-3 mb-2">
        {success > 0
          ? <CheckCircle className="w-5 h-5 text-[var(--success)] shrink-0" />
          : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
        }
        <p className="text-sm font-bold text-[var(--text-primary)]">Import Complete</p>
      </div>
      <div className="flex space-x-6 text-xs font-semibold">
        {result.imported > 0 && <span className="text-emerald-700">✓ {result.imported} inserted</span>}
        {result.updated  > 0 && <span className="text-blue-700">↻ {result.updated} updated</span>}
        {result.skipped  > 0 && <span className="text-amber-700">⚠ {result.skipped} skipped</span>}
      </div>
      {result.errors?.length > 0 && (
        <div className="mt-3 max-h-40 overflow-y-auto space-y-1">
          {result.errors.map((e, i) => (
            <div key={i} className="text-[11px] bg-white/60 rounded px-2 py-1 text-rose-700 font-mono">
              Row {e.rowNum} [{e.emp_code || '—'}]: {e.errors.join(' · ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PreviewTable({ rows, type }) {
  if (!rows || rows.length === 0) return null;

  const isEmployee   = type === 'employee';
  const headers      = isEmployee
    ? ['Row', 'Emp Code', 'Name', 'DOB', 'DOJ', 'Dept', 'PAN', 'CTC']
    : ['Row', 'Emp Code', 'Present Days', 'Paid Leave', 'OT Hours', 'Notes'];

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between">
        <p className="text-xs font-bold text-[var(--text-primary)]">Preview — {rows.length} rows parsed</p>
        <span className="text-[10px] text-[var(--text-muted)]">Review before importing</span>
      </div>
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-[var(--bg-hover)] sticky top-0">
            <tr>
              {headers.map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-[var(--bg-hover)]">
                {isEmployee ? (
                  <>
                    <td className="px-3 py-2 font-mono text-[var(--text-muted)]">{row._rowNum}</td>
                    <td className="px-3 py-2 font-bold text-[var(--accent)]">{row.emp_code || '—'}</td>
                    <td className="px-3 py-2 text-[var(--text-primary)]">{[row.first_name, row.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{row.date_of_birth || '—'}</td>
                    <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{row.date_of_joining || '—'}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">{row.department || '—'}</td>
                    <td className="px-3 py-2 font-mono">{row.pan || '—'}</td>
                    <td className="px-3 py-2 font-mono text-emerald-700">{row.annual_ctc > 0 ? `₹${row.annual_ctc.toLocaleString('en-IN')}` : '—'}</td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2 font-mono text-[var(--text-muted)]">{row._rowNum}</td>
                    <td className="px-3 py-2 font-bold text-[var(--accent)]">{row.emp_code || '—'}</td>
                    <td className="px-3 py-2 font-bold text-[var(--text-primary)]">{row.present_days}</td>
                    <td className="px-3 py-2">{row.paid_leave_days}</td>
                    <td className="px-3 py-2">{row.ot_hours}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">{row.notes || '—'}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Employee Import Tab ──────────────────────────────────────────────────────

function EmployeeImport({ companyId }) {
  const [parsedRows, setParsedRows]   = useState(null);
  const [result, setResult]           = useState(null);
  const [busy, setBusy]               = useState('');
  const [error, setError]             = useState('');
  const importEnabled = !!window.api?.import;

  const handleDownloadTemplate = async () => {
    setBusy('template');
    try {
      const res = await window.api.import.downloadEmployeeTemplate();
      if (!res.success) setError(res.error?.message || 'Failed.');
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  const handleSelectFile = async () => {
    setBusy('parse');
    setError('');
    setParsedRows(null);
    setResult(null);
    try {
      const res = await window.api.import.parseEmployeeFile();
      if (res.success) {
        setParsedRows(res.data.rows);
      } else {
        setError(res.error?.message || 'Could not read file.');
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  const handleImport = async () => {
    if (!parsedRows || !companyId) return;
    setBusy('import');
    setError('');
    try {
      const res = await window.api.import.executeEmployees(parsedRows, companyId);
      if (res.success) {
        setResult(res.data);
        setParsedRows(null);
      } else {
        setError(res.error?.message || 'Import failed.');
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  return (
    <div className="space-y-5">
      {/* Step 1 */}
      <StepCard step="1" title="Download Template" desc="Get the Excel template with all required columns and a sample row.">
        <Button variant="secondary" icon={Download} onClick={handleDownloadTemplate} disabled={busy === 'template' || !importEnabled}>
          {busy === 'template' ? 'Downloading…' : 'Download Employee Template (.xlsx)'}
        </Button>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">
          Fill in the template. Required columns are marked with *. Date format: DD-MM-YYYY.
        </p>
      </StepCard>

      {/* Step 2 */}
      <StepCard step="2" title="Upload Filled File" desc="Select the filled Excel file to preview the data before importing.">
        <Button variant="primary" icon={Upload} onClick={handleSelectFile} disabled={busy === 'parse' || !importEnabled}>
          {busy === 'parse' ? 'Parsing…' : 'Select Excel File…'}
        </Button>
        {error && <p className="text-xs text-[var(--danger)] font-semibold mt-2">{error}</p>}
      </StepCard>

      {/* Preview */}
      {parsedRows && (
        <div className="space-y-4">
          <PreviewTable rows={parsedRows} type="employee" />
          <StepCard step="3" title="Confirm & Import" desc={`${parsedRows.length} rows parsed. Valid rows will be inserted, invalid rows skipped.`}>
            <div className="flex space-x-3">
              <Button variant="primary" icon={CheckCircle} onClick={handleImport} disabled={busy === 'import'}>
                {busy === 'import' ? 'Importing…' : `Import ${parsedRows.length} Employees`}
              </Button>
              <Button variant="secondary" onClick={() => setParsedRows(null)}>Cancel</Button>
            </div>
          </StepCard>
        </div>
      )}

      <ResultBanner result={result} />
    </div>
  );
}

// ─── Attendance Import Tab ────────────────────────────────────────────────────

function AttendanceImport({ companyId }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() || 12);
  const [year, setYear]   = useState(today.getFullYear());
  const [parsedRows, setParsedRows] = useState(null);
  const [result, setResult]         = useState(null);
  const [busy, setBusy]             = useState('');
  const [error, setError]           = useState('');
  const importEnabled = !!window.api?.import;

  const handleDownloadTemplate = async () => {
    setBusy('template');
    try {
      const res = await window.api.import.downloadAttendanceTemplate(companyId, month, year);
      if (!res.success) setError(res.error?.message || 'Failed.');
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  const handleSelectFile = async () => {
    setBusy('parse');
    setError('');
    setParsedRows(null);
    setResult(null);
    try {
      const res = await window.api.import.parseAttendanceFile();
      if (res.success) {
        setParsedRows(res.data.rows);
      } else {
        setError(res.error?.message || 'Could not read file.');
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  const handleImport = async () => {
    if (!parsedRows || !companyId) return;
    setBusy('import');
    setError('');
    try {
      const res = await window.api.import.executeAttendance(parsedRows, companyId, month, year);
      if (res.success) {
        setResult(res.data);
        setParsedRows(null);
      } else {
        setError(res.error?.message || 'Import failed.');
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <Card title="Select Pay Period" subTitle="Attendance data will be imported for this month and year">
        <div className="flex items-center space-x-3">
          <Select options={MONTH_NAMES} value={month} onChange={e => setMonth(parseInt(e.target.value))} className="w-36" />
          <Select options={YEAR_OPTIONS.map(y => ({ value: y.value, label: y.label }))} value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-24" />
        </div>
      </Card>

      {/* Step 1 */}
      <StepCard step="1" title="Download Template" desc="Template is pre-filled with your active employees. Just add present days.">
        <Button variant="secondary" icon={Download} onClick={handleDownloadTemplate} disabled={busy === 'template' || !importEnabled || !companyId}>
          {busy === 'template' ? 'Downloading…' : 'Download Attendance Template (.xlsx)'}
        </Button>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">
          Employee codes are pre-filled. Enter present_days for each employee.
        </p>
      </StepCard>

      {/* Step 2 */}
      <StepCard step="2" title="Upload Filled File" desc="Select the completed attendance file.">
        <Button variant="primary" icon={Upload} onClick={handleSelectFile} disabled={busy === 'parse' || !importEnabled}>
          {busy === 'parse' ? 'Parsing…' : 'Select Excel File…'}
        </Button>
        {error && <p className="text-xs text-[var(--danger)] font-semibold mt-2">{error}</p>}
      </StepCard>

      {parsedRows && (
        <div className="space-y-4">
          <PreviewTable rows={parsedRows} type="attendance" />
          <StepCard step="3" title="Confirm & Import" desc={`${parsedRows.length} rows. Existing records for this period will be updated.`}>
            <div className="flex space-x-3">
              <Button variant="primary" icon={CheckCircle} onClick={handleImport} disabled={busy === 'import'}>
                {busy === 'import' ? 'Importing…' : `Import Attendance`}
              </Button>
              <Button variant="secondary" onClick={() => setParsedRows(null)}>Cancel</Button>
            </div>
          </StepCard>
        </div>
      )}

      <ResultBanner result={result} />
    </div>
  );
}

// ─── Step card sub-component ──────────────────────────────────────────────────

function StepCard({ step, title, desc, children }) {
  return (
    <div className="flex space-x-4">
      <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
        {step}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-secondary)] mb-3">{desc}</p>
        {children}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'employees',  label: 'Employees',  icon: Users,          desc: 'Bulk import all employees from Excel' },
  { key: 'attendance', label: 'Attendance', icon: CalendarRange,  desc: 'Bulk import monthly attendance data' }
];

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState('employees');
  const activeCompany = useCompanyStore(state => state.activeCompany);
  const importEnabled = !!window.api?.import;

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg-base)]">
      <TopBar title="Excel Import" />

      <div className="flex-1 p-6 space-y-6 min-h-0 overflow-y-scroll text-left">

        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Bulk Excel Import</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Download a template, fill it in Excel, and import all data in one go.
          </p>
        </div>

        {/* Desktop-only notice */}
        {!importEnabled && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Excel import is available only in the desktop app.</span>
          </div>
        )}

        {/* No company */}
        {importEnabled && !activeCompany && (
          <div className="p-4 rounded-lg bg-[var(--danger-light)] border border-rose-200 text-[var(--danger)] text-sm font-semibold flex items-center space-x-2">
            <XCircle className="w-5 h-5 shrink-0" />
            <span>Select an active company first before importing data.</span>
          </div>
        )}

        {/* Tab selector */}
        <div className="grid grid-cols-2 gap-4 max-w-xl">
          {TABS.map(tab => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                activeTab === tab.key
                  ? 'border-[var(--accent)] bg-[var(--accent-light)]/30'
                  : 'border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--bg-hover)]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${activeTab === tab.key ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}>
                  <tab.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{tab.label}</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">{tab.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab content */}
        <div className="max-w-3xl">
          {activeTab === 'employees' && (
            <EmployeeImport companyId={activeCompany?.id} />
          )}
          {activeTab === 'attendance' && (
            <AttendanceImport companyId={activeCompany?.id} />
          )}
        </div>

      </div>
    </div>
  );
}
