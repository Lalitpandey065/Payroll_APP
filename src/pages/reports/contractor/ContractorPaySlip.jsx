import ReportPageBase from '../ReportPageBase';
export default function ContractorPaySlip() {
  return (
    <ReportPageBase
      title="Contractor Pay Slips"
      description="PDF pay slips for contractor employees"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateContractorPayslip({ companyId, payrollRunId })
      }
    />
  );
}
