import React from 'react';
import { CalendarRange } from 'lucide-react';

export default function HolidayMaster() {
  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center space-x-3 mb-6">
        <CalendarRange className="w-6 h-6 text-[var(--accent)]" />
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Holiday Master</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">Holiday calendar management coming soon.</p>
      </div>
    </div>
  );
}
