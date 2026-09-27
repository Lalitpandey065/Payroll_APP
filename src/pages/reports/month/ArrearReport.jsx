import { useState, useEffect } from 'react';
import ReportPageBase from '../ReportPageBase';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

export default function ArrearReport() {
  const [companies,   setCompanies]   = useState([]);
  const [companyId,   setCompanyId]   = useState('');
  const [runs,        setRuns]        = useState([]);
  const [runId,       setRunId]       = useState('');
  const [baseRunId,   setBaseRunId]   = useState('');
  const [runsLoading, setRunsLoading] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);

  useEffect(() => {
    window.api.company.getAll().then(r => { if (r.success) setCompanies(r.data || []); });
  }, []);

  useEffect(() => {
    if (!companyId) { setRuns([]); setRunId(''); setBaseRunId(''); return; }
    setRunsLoading(true);
    window.api.payroll.getAllRuns(companyId)
      .then(r => {
        if (r.success)
          setRuns((r.data || []).filter(x => x.status === 'locked' || x.status === 'approved'));
      })
      .finally(() => setRunsLoading(false));
  }, [companyId]);

  const runLabel = r => `${MONTH_NAMES[(r.month-1)%12]} ${r.year} [${r.status}]`;
  const canGo = companyId && runId;

  const handleGenerate = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await window.api.report.generateArrear({ companyId, payrollRunId: runId, baseRunId });
      setResult(res);
    } catch(e) { setResult({ success: false, error: e.message }); }
    finally { setLoading(false); }
  };

  return (
    <div className="rpt-page">
      <div className="rpt-page-header">
        <div>
          <h2 style={{margin:0,fontSize:16,fontWeight:700,color:'#1e3a5f'}}>Arrear Report</h2>
          <p style={{margin:0,fontSize:12,color:'#64748b'}}>Net salary comparison between two runs</p>
        </div>
      </div>
      <div className="rpt-card">
        <div className="rpt-card-body" style={{display:'flex',flexWrap:'wrap',gap:16,alignItems:'flex-end'}}>
          <div className="rpt-field">
            <label className="rpt-label">Company</label>
            <select className="rpt-select" value={companyId} onChange={e=>setCompanyId(e.target.value)}>
              <option value="">— select company —</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="rpt-field">
            <label className="rpt-label">Current Run</label>
            <select className="rpt-select" value={runId} onChange={e=>setRunId(e.target.value)} disabled={!companyId||runsLoading}>
              <option value="">{runsLoading?'Loading…':'— select —'}</option>
              {runs.map(r=><option key={r.id} value={r.id}>{runLabel(r)}</option>)}
            </select>
          </div>
          <div className="rpt-field">
            <label className="rpt-label">Compare With (optional)</label>
            <select className="rpt-select" value={baseRunId} onChange={e=>setBaseRunId(e.target.value)} disabled={!companyId||runsLoading}>
              <option value="">— none —</option>
              {runs.filter(r=>r.id!==runId).map(r=><option key={r.id} value={r.id}>{runLabel(r)}</option>)}
            </select>
          </div>
          <button className={`rpt-btn rpt-btn-primary${loading?' rpt-spinner':''}`} onClick={handleGenerate} disabled={!canGo||loading}>
            {loading?'Generating…':'Generate Excel'}
          </button>
        </div>
      </div>
      {result && (
        <div style={{marginTop:12,padding:'10px 16px',background:result.success?'#f0fdf4':'#fef2f2',border:`1px solid ${result.success?'#bbf7d0':'#fecaca'}`,borderRadius:6,fontSize:13,color:result.success?'#15803d':'#b91c1c'}}>
          {result.success ? `✓ Saved: ${result.path}` : `Error: ${result.error}`}
        </div>
      )}
    </div>
  );
}
