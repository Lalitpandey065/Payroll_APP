import ReportPageBase from '../ReportPageBase';
export default function LWFRegister() {
  return (
    <ReportPageBase
      title="LWF Register"
      description="Detailed Labour Welfare Fund register with department breakdown"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateLWFRegister({ companyId, payrollRunId })
      }
    />
  );
}
