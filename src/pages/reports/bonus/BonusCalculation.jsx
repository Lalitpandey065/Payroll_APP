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

export default function BonusCalculation() {
  const [finYear, setFinYear] = useState('');

  return (
    <ReportPageBase
      title="Bonus Calculation Sheet"
      description="Min (8.33%) and max (20%) bonus calculation with payable amount"
      needsRun={false}
      extraFields={<FinYearField finYear={finYear} setFinYear={setFinYear} />}
      onGenerate={(companyId) =>
        window.api.report.generateBonusCalc({ companyId, finYear })
      }
    />
  );
}
