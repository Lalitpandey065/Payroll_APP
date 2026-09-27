import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyStore } from '../../store/company.store';

export default function SetupAttendance() {
  const navigate = useNavigate();
  const { activeCompany } = useCompanyStore();
  const companyId = activeCompany?.id;

  const [rows, setRows] = useState([]);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) loadData();
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await window.api.setup.getAttendanceSetup(companyId);
      if (Array.isArray(data) && data.length > 0) {
        setRows(data);
        setError('');
      } else {
        setError('No attendance setup data found. Restart the app to initialize defaults.');
      }
    } catch (err) {
      setError('Failed to load: ' + err.message);
    }
    setLoading(false);
    setIsDirty(false);
  };

  const handleChange = (code, field, value) => {
    setRows(prev => prev.map(r =>
      r.code === code ? { ...r, [field]: value } : r
    ));
    setIsDirty(true);
  };

  const handleSave = async () => {
    const blankRow = rows.find(r => !r.heading?.trim());
    if (blankRow) {
      setError(`"${blankRow.field_label}" heading cannot be blank.`);
      return;
    }

    setSaveState('saving');
    setError('');
    const result = await window.api.setup.saveAttendanceSetup(companyId, rows);
    if (result?.success === false) {
      setError(result.error || 'Save failed');
      setSaveState('idle');
    } else {
      setSaveState('saved');
      setIsDirty(false);
      setTimeout(() => setSaveState('idle'), 2000);
    }
  };

  const handleExit = () => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Exit anyway?')) return;
    }
    navigate(-1);
  };

  return (
    <div className="ps-page">

      {/* Header */}
      <div className="ps-header sa-header">
        <button className="sa-back-btn" onClick={handleExit}>
          <i className="ti ti-chevron-left" />
        </button>
        <div className="sa-header-title">
          <span className="sa-header-main">Setup Attendance</span>
          <span className="sa-header-sub">Configure attendance type headings for payslips and reports</span>
        </div>
        {isDirty && <span className="sat-dirty-badge">● Unsaved</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="psb" onClick={handleExit}>Exit</button>
          <button className="psb sat-update-btn" onClick={handleSave}>
            <i className="ti ti-device-floppy" />
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : 'Update'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="ps-body">
        <div className="sat-container">

          {error && (
            <div className="ps-alert-error" style={{ marginBottom: 8, padding: '6px 10px', fontSize: 11 }}>
              ⚠ {error}
            </div>
          )}

          {/* Form card */}
          <div className="sa-card">
            <div className="sat-card-header">
              <i className="ti ti-calendar-stats" style={{ fontSize: 13 }} />
              Attendance Type Headings
              <span className="sat-hint">Configure short headings shown on payslips, attendance sheets and reports</span>
            </div>

            <div className="sa-card-body">

              {/* Column headers */}
              <div className="sat-col-headers">
                <div className="sat-col-label">Attendance Type</div>
                <div className="sat-col-eng">English Heading</div>
                <div className="sat-col-hindi">Hindi Heading</div>
              </div>

              {/* Data rows */}
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: 11, color: 'var(--ps-text-muted)' }}>
                  Loading attendance setup…
                </div>
              ) : rows.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: 11, color: 'var(--ps-text-muted)' }}>
                  No data found. Restart the application to initialize defaults.
                </div>
              ) : (
                rows.map((row, idx) => (
                  <div
                    key={row.code}
                    className={`sat-row ${idx % 2 === 0 ? 'sat-row-even' : ''}`}
                  >
                    <div className="sat-row-label">{row.field_label}</div>
                    <div className="sat-row-input">
                      <input
                        type="text"
                        className="sat-input"
                        value={row.heading}
                        maxLength={20}
                        onChange={e => handleChange(row.code, 'heading', e.target.value)}
                        placeholder="Short heading…"
                      />
                    </div>
                    <div className="sat-row-input">
                      <input
                        type="text"
                        className="sat-input sat-input-hindi"
                        value={row.hindi_heading || ''}
                        maxLength={40}
                        onChange={e => handleChange(row.code, 'hindi_heading', e.target.value)}
                        placeholder="हिंदी में शीर्षक लिखें"
                      />
                    </div>
                  </div>
                ))
              )}

            </div>
          </div>

          {/* Info strip */}
          <div className="sat-info-strip">
            <i className="ti ti-info-circle" style={{ fontSize: 12, flexShrink: 0 }} />
            These headings are used as column labels in attendance entry, payslip print, and statutory reports.
            Keep them short (under 10 characters recommended).
          </div>



        </div>
      </div>

    </div>
  );
}
