import React from 'react';
import { YesNoSelect } from './YesNoSelect';

/**
 * Props:
 *  label        : string — "E.P.F. Status"
 *  statusValue  : 0|1
 *  onStatusChange: fn(0|1)
 *  dateValue    : string
 *  onDateChange : fn(string)
 *  coverageDate : string
 *  onCoverageChange: fn(string)
 */
export function CoverageRow({ label, statusValue, onStatusChange, dateValue, onDateChange, coverageDate, onCoverageChange }) {
  return (
    <div className="coverage-row">
      <span className="coverage-row__label">{label}</span>
      <YesNoSelect value={statusValue} onChange={onStatusChange} size="sm" />
      {statusValue === 1 && (
        <div className="coverage-row__dates">
          <div className="coverage-row__date-group">
            <span className="coverage-row__date-label">Effective Date</span>
            <input type="date" className="coverage-row__date" value={dateValue || ''} onChange={e => onDateChange(e.target.value)} />
          </div>
          <div className="coverage-row__date-group">
            <span className="coverage-row__date-label">Coverage Date</span>
            <input type="date" className="coverage-row__date" value={coverageDate || ''} onChange={e => onCoverageChange(e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}
