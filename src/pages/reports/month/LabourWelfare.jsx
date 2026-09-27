import ReportPageBase from '../ReportPageBase';
export default function LabourWelfare() {
  return (
    <ReportPageBase
      title="Labour Welfare Fund"
      description="LWF employee & employer deduction summary"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateLWF({ companyId, payrollRunId })
      }
    />
  );
}
