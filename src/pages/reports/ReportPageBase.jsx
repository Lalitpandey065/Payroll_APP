// src/pages/reports/ReportPageBase.jsx
// Shared wrapper for all generated-Excel report pages.
// Props:
//   title        — page heading string
//   description  — short subtitle
//   onGenerate   — async (companyId, runId, extras) => { success, path, error }
//   needsRun     — bool (default true); false = only company selector shown
//   extras       — optional { label, render(extras, setExtras) } for bonus/arrear etc.
import { useState, useEffect } from 'react';
import { FileSpreadsheet, FolderOpen, AlertCircle, CheckCircle2 } from 'lucide-react';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

export default function ReportPageBase({
  title,
  description,
  onGenerate,
  needsRun = true,
  extraFields = null,   // JSX node or render-prop
}) {
  const [companies,         setCompanies]         = useState([]);
  const [companyId,         setCompanyId]         = useState('');
  const [runs,              setRuns]              = useState([]);
  const [runId,             setRunId]             = useState('');
  const [runsLoading,       setRunsLoading]       = useState(false);
  const [loading,           setLoading]           = useState(false);
  const [result,            setResult]            = useState(null);

  // load companies on mount
  useEffect(() => {
    window.api.company.getAll()
      .then(r => { if (r.success) setCompanies(r.data || []); })
      .catch(() => {});
  }, []);

  // load locked/approved runs when company changes
  useEffect(() => {
    if (!companyId || !needsRun) { setRuns([]); setRunId(''); return; }
    setRunsLoading(true);
    setRunId('');
    window.api.payroll.getAllRuns(companyId)
      .then(r => {
        if (r.success) {
          setRuns((r.data || []).filter(x => x.status === 'locked' || x.status === 'approved'));
        }
      })
      .catch(() => {})
      .finally(() => setRunsLoading(false));
  }, [companyId, needsRun]);

  const canGenerate = companyId && (!needsRun || runId);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await onGenerate(companyId, runId);
      setResult(res);
    } catch (e) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const runLabel = (run) => {
    if (!run) return '';
    return `${MONTH_NAMES[(run.month - 1) % 12]} ${run.year}  [${run.status}]`;
  };

  return (
    <div className="rpt-page">
      {/* ── header ─────────────────────────────────────────────── */}
      <div className="rpt-page-header">
        <FileSpreadsheet size={20} style={{ color: '#1e3a5f' }} />
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e3a5f' }}>{title}</h2>
          {description && (
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{description}</p>
          )}
        </div>
      </div>

      {/* ── selectors card ─────────────────────────────────────── */}
      <div className="rpt-card">
        <div className="rpt-card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>

          {/* Company */}
          <div className="rpt-field">
            <label className="rpt-label">Company</label>
            <select
              className="rpt-select"
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
            >
              <option value="">— select company —</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Payroll Run (optional) */}
          {needsRun && (
            <div className="rpt-field">
              <label className="rpt-label">Payroll Run</label>
              <select
                className="rpt-select"
                value={runId}
                onChange={e => setRunId(e.target.value)}
                disabled={!companyId || runsLoading}
              >
                <option value="">
                  {runsLoading ? 'Loading…' : '— select month —'}
                </option>
                {runs.map(r => (
                  <option key={r.id} value={r.id}>{runLabel(r)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Extra fields injected by parent */}
          {extraFields}

          {/* Generate button */}
          <button
            className={`rpt-btn rpt-btn-primary${loading ? ' rpt-spinner' : ''}`}
            onClick={handleGenerate}
            disabled={!canGenerate || loading}
          >
            {loading ? 'Generating…' : 'Generate Excel'}
          </button>
        </div>
      </div>

      {/* ── result ─────────────────────────────────────────────── */}
      {result && (
        <div className={`rpt-result ${result.success ? 'rpt-result--ok' : 'rpt-result--err'}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
            background: result.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 6, marginTop: 12,
          }}
        >
          {result.success
            ? <CheckCircle2 size={18} color="#16a34a" />
            : <AlertCircle  size={18} color="#dc2626" />
          }
          <span style={{ fontSize: 13, color: result.success ? '#15803d' : '#b91c1c', flex: 1 }}>
            {result.success
              ? `Report saved: ${result.path}`
              : `Error: ${result.error}`
            }
          </span>
          {result.success && (
            <button
              className="rpt-btn rpt-btn-outline"
              onClick={() => window.api.report.openReportsFolder()}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px' }}
            >
              <FolderOpen size={14} /> Open Folder
            </button>
          )}
        </div>
      )}

      {/* ── hint ───────────────────────────────────────────────── */}
      {!result && (
        <p className="rpt-hint">
          Select {needsRun ? 'a company and a locked/approved payroll run' : 'a company'}, then click <strong>Generate Excel</strong>.
          The file opens automatically and is saved to <em>Documents / PaySmart Pro / Reports</em>.
        </p>
      )}
    </div>
  );
}
