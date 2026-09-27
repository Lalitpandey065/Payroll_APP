import React from 'react';
import { useNavigate } from 'react-router-dom';

const REPORT_GROUPS = [
  {
    label: 'Month',
    icon: 'ti-calendar-month',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    count: 11,
    description: 'Monthly payroll registers, payslips, statutory reports',
    firstPath: '/reports/month/salary-register',
  },
  {
    label: 'Contractor',
    icon: 'ti-briefcase',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    count: 2,
    description: 'Contractor employee salary and payslip reports',
    firstPath: '/reports/contractor/register',
  },
  {
    label: 'Labour Welfare Fund',
    icon: 'ti-heart-handshake',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fca5a5',
    count: 2,
    description: 'LWF register and payment challan',
    firstPath: '/reports/lwf/register',
  },
  {
    label: 'M.I.S.',
    icon: 'ti-chart-bar',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    count: 3,
    description: 'Management information system reports',
    firstPath: '/reports/mis/department',
  },
  {
    label: 'Bonus',
    icon: 'ti-gift',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#86efac',
    count: 2,
    description: 'Bonus register and calculation sheet',
    firstPath: '/reports/bonus/register',
  },
  {
    label: 'Labour Act(s)',
    icon: 'ti-scale',
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
    count: 5,
    description: 'Statutory forms under Factories Act',
    firstPath: '/reports/labour/form-a',
  },
];

export default function ReportsCentre() {
  const navigate = useNavigate();

  return (
    <div className="ps-page">
      <div className="ps-header" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ps-text)' }}>Reports Centre</span>
          <span style={{ fontSize: 10.5, color: 'var(--ps-text-muted)' }}>
            Select a report group or use the sidebar to navigate directly
          </span>
        </div>
      </div>

      <div className="ps-body">
        <div className="rpt-centre-grid">
          {REPORT_GROUPS.map(group => (
            <div
              key={group.label}
              className="rpt-group-card"
              style={{ borderColor: group.border }}
              onClick={() => navigate(group.firstPath)}
            >
              <div className="rpt-group-card-header" style={{ background: group.bg, borderBottomColor: group.border }}>
                <i className={`ti ${group.icon}`} style={{ fontSize: 18, color: group.color }} />
                <span className="rpt-group-title" style={{ color: group.color }}>{group.label}</span>
                <span className="rpt-group-count" style={{ background: group.color }}>{group.count} reports</span>
              </div>
              <div className="rpt-group-card-body">
                <p className="rpt-group-desc">{group.description}</p>
                <span className="rpt-group-link" style={{ color: group.color }}>
                  Open reports <i className="ti ti-arrow-right" style={{ fontSize: 10 }} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
