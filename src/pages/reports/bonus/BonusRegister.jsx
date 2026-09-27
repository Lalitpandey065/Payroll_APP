import { useState } from 'react';
import ReportPageBase from '../ReportPageBase';

function FinYearField({ finYear, setFinYear }) {
  return (
    <div className="rpt-field">
      <label className="rpt-label">Financial Year</label>
      <input
        className="rpt-select"
        type="text"
        placeholder="e.g. 2024-25"
        value={finYear}
        onChange={e => setFinYear(e.target.value)}
        style={{ width: 110 }}
      />
    </div>
  );
}

export default function BonusRegister() {
  const [finYear, setFinYear] = useState('');

  return (
    <ReportPageBase
      title="Bonus Register"
      description="Annual bonus register at 8.33% of Basic+DA (capped at ₹7,000/month)"
      needsRun={false}
      extraFields={<FinYearField finYear={finYear} setFinYear={setFinYear} />}
      onGenerate={(companyId) =>
        window.api.report.generateBonusRegister({ companyId, finYear })
      }
    />
  );
}
