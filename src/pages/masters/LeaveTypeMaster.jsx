import React from 'react';
import { CalendarOff } from 'lucide-react';

export default function LeaveTypeMaster() {
  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center space-x-3 mb-6">
        <CalendarOff className="w-6 h-6 text-[var(--accent)]" />
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Leave Types Master</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">Leave type configuration coming soon.</p>
      </div>
    </div>
  );
}
