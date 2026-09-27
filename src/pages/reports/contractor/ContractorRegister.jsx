import ReportPageBase from '../ReportPageBase';
export default function ContractorRegister() {
  return (
    <ReportPageBase
      title="Contractor Register"
      description="Full salary register for contractor employees"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateContractorRegister({ companyId, payrollRunId })
      }
    />
  );
}
