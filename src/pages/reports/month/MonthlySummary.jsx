// src/pages/reports/month/MonthlySummary.jsx
import { useState, useEffect, useCallback } from 'react';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function MonthlySummary() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [runsLoading, setRunsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.api.company.getAll();
        if (res.success) setCompanies(res.data || []);
      } catch (err) { console.error('Failed to load companies:', err); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) { setRuns([]); setSelectedRunId(''); return; }
    (async () => {
      setRunsLoading(true);
      try {
        const res = await window.api.payroll.getAllRuns(selectedCompanyId);
        if (res.success) {
          const validRuns = (res.data || []).filter(r => r.status === 'locked' || r.status === 'approved');
          setRuns(validRuns);
        }
      } catch (err) { console.error('Failed to load runs:', err); }
      setRunsLoading(false);
    })();
  }, [selectedCompanyId]);

  const handleGenerate = useCallback(async () => {
    if (!selectedCompanyId || !selectedRunId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await window.api.report.generateMonthlySummary({
        companyId: selectedCompanyId,
        payrollRunId: selectedRunId,
      });
      setResult(res);
    } catch (e) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, selectedRunId]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const selectedRun = runs.find(r => r.id === selectedRunId);

  return (
    <div className="rpt-page">
      {/* Header */}
      <div className="rpt-page-header">
        <div className="rpt-page-icon" style={{ background: 'linear-gradient(135deg, #d97706 0%, #dc2626 100%)' }}>
          <i className="ti ti-report-analytics" />
        </div>
        <div>
          <h2 className="rpt-page-title">Monthly Summary</h2>
          <p className="rpt-page-subtitle">Company-level totals &amp; statutory challan details (EPF / ESI / PT / LWF)</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="rpt-card">
        <div className="rpt-card-body">
          {/* Company Select */}
          <div className="rpt-field">
            <label className="rpt-label">
              <i className="ti ti-building" style={{ marginRight: 6 }} />
              Company
            </label>
            <select
              id="summary-company"
              className="rpt-select"
              value={selectedCompanyId}
              onChange={e => { setSelectedCompanyId(e.target.value); setSelectedRunId(''); setResult(null); }}
            >
              <option value="">— Select Company —</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Payroll Month Select */}
          <div className="rpt-field">
            <label className="rpt-label">
              <i className="ti ti-calendar-month" style={{ marginRight: 6 }} />
              Payroll Month
            </label>
            <select
              id="summary-month"
              className="rpt-select"
              value={selectedRunId}
              onChange={e => { setSelectedRunId(e.target.value); setResult(null); }}
              disabled={!selectedCompanyId || runsLoading}
            >
              <option value="">{runsLoading ? 'Loading...' : '— Select Payroll Month —'}</option>
              {runs.map(r => (
                <option key={r.id} value={r.id}>
                  {MONTH_NAMES[(r.month - 1) % 12]} {r.year} ({r.status})
                </option>
              ))}
            </select>
            {selectedCompanyId && !runsLoading && runs.length === 0 && (
              <span className="rpt-hint">No locked/approved payroll runs found</span>
            )}
          </div>

          {/* Summary Preview */}
          {selectedCompany && selectedRun && (
            <div className="rpt-preview">
              <div className="rpt-preview-row">
                <span className="rpt-preview-label">Company</span>
                <span className="rpt-preview-value">{selectedCompany.name}</span>
              </div>
              <div className="rpt-preview-row">
                <span className="rpt-preview-label">Period</span>
                <span className="rpt-preview-value">
                  {MONTH_NAMES[(selectedRun.month - 1) % 12]} {selectedRun.year}
                </span>
              </div>
              <div className="rpt-preview-row">
                <span className="rpt-preview-label">Employees</span>
                <span className="rpt-preview-value">{selectedRun.total_employees || '—'}</span>
              </div>
              <div className="rpt-preview-row">
                <span className="rpt-preview-label">Gross Salary</span>
                <span className="rpt-preview-value rpt-currency">
                  ₹{Number(selectedRun.total_gross || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="rpt-preview-row">
                <span className="rpt-preview-label">Total Net Pay</span>
                <span className="rpt-preview-value rpt-currency">
                  ₹{Number(selectedRun.total_net || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            id="summary-generate"
            className="rpt-btn rpt-btn-primary"
            onClick={handleGenerate}
            disabled={loading || !selectedCompanyId || !selectedRunId}
          >
            {loading ? (
              <>
                <span className="rpt-spinner" />
                Generating PDF…
              </>
            ) : (
              <>
                <i className="ti ti-file-type-pdf" />
                Generate Monthly Summary
              </>
            )}
          </button>
        </div>

        {/* Result */}
        {result?.success && (
          <div className="rpt-result rpt-result-success">
            <i className="ti ti-circle-check" />
            <div className="rpt-result-content">
              <strong>Summary generated successfully!</strong>
              <span className="rpt-result-path">{result.path}</span>
            </div>
            <button className="rpt-btn rpt-btn-outline" onClick={() => window.api.report.openReportsFolder()}>
              <i className="ti ti-folder-open" /> Open Folder
            </button>
          </div>
        )}
        {result?.error && (
          <div className="rpt-result rpt-result-error">
            <i className="ti ti-alert-circle" />
            <div className="rpt-result-content">
              <strong>Generation failed</strong>
              <span>{result.error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
