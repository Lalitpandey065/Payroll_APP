import ReportPageBase from '../ReportPageBase';
export default function CostCentreReport() {
  return (
    <ReportPageBase
      title="Cost Centre Report"
      description="Payroll cost grouped by cost centre"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateCostCentre({ companyId, payrollRunId })
      }
    />
  );
}
