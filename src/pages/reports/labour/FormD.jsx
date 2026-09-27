import ReportPageBase from '../ReportPageBase';
export default function FormD() {
  return (
    <ReportPageBase
      title="Form D — Wages Register"
      description="Combined wages register as per Factories Act"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateFormD({ companyId, payrollRunId })
      }
    />
  );
}
