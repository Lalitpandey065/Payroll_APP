import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Edit2, Check } from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';
import TopBar from '../../components/layout/TopBar';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function CompanyList() {
  const navigate = useNavigate();
  const companies = useCompanyStore(state => state.companies);
  const activeCompany = useCompanyStore(state => state.activeCompany);
  const setActiveCompany = useCompanyStore(state => state.setActiveCompany);
  const loadCompanies = useCompanyStore(state => state.loadCompanies);
  const loading = useCompanyStore(state => state.loading);

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleSelect = (comp) => {
    setActiveCompany(comp);
  };

  const headers = [
    { label: 'Company Name' },
    { label: 'State & City' },
    { label: 'PAN Number' },
    { label: 'Statutory Registry' },
    { label: 'Status' },
    { label: 'Actions', align: 'right' }
  ];

  return (
    <div className="ps-page">
      <TopBar title="Client Companies" />

      <div className="ps-filterbar">
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold text-[var(--text-primary)]">Client Registry</span>
          <span className="text-[10px] text-[var(--text-secondary)]">Manage client organizations and statutory configurations</span>
        </div>
        <div className="flex-1" />
        <Button 
          onClick={() => navigate('/companies/new')} 
          variant="primary"
          size="sm"
          icon={Plus}
        >
          Create Company
        </Button>
      </div>

      <div className="ps-body ps-body--no-pad">
        {companies.length === 0 && !loading ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-2" />
            <h3 className="text-xs font-bold text-[var(--text-primary)]">No Registered Companies</h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
              Scaffold your client portfolio by adding a new organization.
            </p>
            <Button 
              onClick={() => navigate('/companies/new')} 
              variant="primary" 
              className="mt-4"
              size="sm"
            >
              Add First Company
            </Button>
          </div>
        ) : loading ? (
          <div className="p-4 text-xs text-[var(--text-secondary)] font-medium">Loading company registry...</div>
        ) : (
          <table className="ps-table">
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} style={{ textAlign: h.align || 'left' }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map(c => {
                const isActive = activeCompany?.id === c.id;
                
                // Compile statutory badges list
                const statBadges = [];
                if (c.is_pf_registered === 1) statBadges.push('PF');
                if (c.is_esi_registered === 1) statBadges.push('ESI');
                if (c.is_tds_deductor === 1) statBadges.push('TDS');
                if (c.is_pt_applicable === 1) statBadges.push('PT');

                return (
                  <tr 
                    key={c.id}
                    className={isActive ? 'bg-[var(--accent-light)]/20' : ''}
                  >
                    {/* Name */}
                    <td className="px-4 py-3.5 flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded font-bold flex items-center justify-center shrink-0 text-[10px]
                        ${isActive ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border border-[var(--border-strong)]'}`}>
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
                          {c.name}
                        </span>
                        {c.short_name && (
                          <span className="text-[9px] font-mono text-[var(--text-muted)]">
                            {c.short_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* State */}
                    <td>
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-[var(--text-primary)]">{c.city || 'N/A'}</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">{c.state_code}</span>
                      </div>
                    </td>

                    {/* PAN */}
                    <td className="font-mono text-xs font-semibold text-[var(--text-secondary)]">
                      {c.pan}
                    </td>

                    {/* Statutory indicators */}
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {statBadges.length === 0 ? (
                          <span className="text-[10px] text-[var(--text-muted)]">None</span>
                        ) : (
                          statBadges.map((badge, idx) => (
                            <span key={idx} className="px-1.5 py-0.2 rounded bg-[var(--bg-surface-2)] border border-[var(--border-strong)] text-[9px] font-bold text-[var(--text-secondary)] font-mono">
                              {badge}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Focus Status */}
                    <td>
                      {isActive ? (
                        <Badge status="active">Active Focus</Badge>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">Inactive</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="inline-flex gap-2">
                        <Button
                          onClick={() => handleSelect(c)}
                          variant={isActive ? 'success' : 'secondary'}
                          size="sm"
                          icon={isActive ? Check : null}
                          disabled={isActive}
                        >
                          {isActive ? 'Selected' : 'Operate'}
                        </Button>
                        
                        <Button
                          onClick={() => navigate(`/companies/edit/${c.id}`)}
                          variant="secondary"
                          size="sm"
                          icon={Edit2}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
