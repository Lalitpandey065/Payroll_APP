import ReportPageBase from '../ReportPageBase';
export default function ProfessionalTax() {
  return (
    <ReportPageBase
      title="Professional Tax"
      description="Professional tax deduction register"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generatePT({ companyId, payrollRunId })
      }
    />
  );
}
