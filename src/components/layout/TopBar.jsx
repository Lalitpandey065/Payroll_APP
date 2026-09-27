import React from 'react';
import { Calendar, Building } from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';
import { CURRENT_FIN_YEAR } from '../../utils/constants';

export default function TopBar({ title = 'System Dashboard' }) {
  const activeCompany = useCompanyStore(state => state.activeCompany);
  const finYear = CURRENT_FIN_YEAR();

  return (
    <div className="h-14 border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 flex items-center justify-between shrink-0 select-none">
      
      {/* Left: Page Title Breadcrumb */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-[var(--text-secondary)] font-medium">PaySmart Pro</span>
        <span className="text-[var(--text-muted)] text-sm">/</span>
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </span>
      </div>

      {/* Right: Active Context (Company name + active financial year) */}
      <div className="flex items-center space-x-4">
        {activeCompany ? (
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-[var(--bg-surface-2)] rounded-md border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)]">
            <Building className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="truncate max-w-[150px]">{activeCompany.name}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-[var(--danger-light)] rounded-md border border-[var(--danger-light)] text-xs font-semibold text-[var(--danger)]">
            <span>No active company</span>
          </div>
        )}

        <div className="flex items-center space-x-1.5 px-3 py-1 bg-[var(--bg-surface-2)] rounded-md border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] font-mono">
          <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>FY: {finYear}</span>
        </div>
      </div>

    </div>
  );
}
