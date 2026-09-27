import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ReportPlaceholder({ title, group, description, icon = 'ti-file-analytics' }) {
  const navigate = useNavigate();

  return (
    <div className="ps-page">
      <div className="ps-header" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
        <button
          className="psb"
          style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => navigate('/reports')}
        >
          <i className="ti ti-chevron-left" style={{ fontSize: 14 }} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ps-text)' }}>
            {title}
          </span>
          <span style={{ fontSize: 10, color: 'var(--ps-text-muted)' }}>
            {group} · {description}
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="psb" disabled style={{ opacity: 0.4 }}>
            <i className="ti ti-printer" style={{ fontSize: 12 }} /> Print
          </button>
          <button className="psb" disabled style={{ opacity: 0.4 }}>
            <i className="ti ti-file-spreadsheet" style={{ fontSize: 12 }} /> Excel
          </button>
          <button className="psb psb-primary" disabled style={{ opacity: 0.4 }}>
            <i className="ti ti-file-type-pdf" style={{ fontSize: 12 }} /> PDF
          </button>
        </div>
      </div>

      <div className="ps-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--ps-text-muted)' }}>
          <i className={`ti ${icon}`} style={{ fontSize: 48, opacity: 0.3, display: 'block', marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--ps-text)' }}>
            {title}
          </div>
          <div style={{ fontSize: 11, maxWidth: 320, lineHeight: 1.6 }}>
            {description}
          </div>
          <div style={{
            marginTop: 16,
            padding: '6px 14px',
            background: 'color-mix(in srgb, var(--ps-primary) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--ps-primary) 20%, transparent)',
            borderRadius: 6,
            fontSize: 10.5,
            color: 'var(--ps-primary)',
            display: 'inline-block'
          }}>
            🚧 Coming soon — report generation will be added in next build
          </div>
        </div>
      </div>
    </div>
  );
}
