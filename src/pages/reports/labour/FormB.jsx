import ReportPageBase from '../ReportPageBase';
export default function FormB() {
  return (
    <ReportPageBase
      title="Form B — Leave Register"
      description="Leave record as per Factories Act"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateFormB({ companyId, payrollRunId })
      }
    />
  );
}
