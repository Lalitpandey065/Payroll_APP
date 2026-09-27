import ReportPageBase from '../ReportPageBase';
export default function BankStatement() {
  return (
    <ReportPageBase
      title="Bank Statement"
      description="Net salary transfer list with bank account & IFSC"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateBank({ companyId, payrollRunId })
      }
    />
  );
}
