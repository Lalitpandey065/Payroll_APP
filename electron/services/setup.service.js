const { setupRepo } = require('../db/repositories/setup.repo');

const setupService = {
  getAllSetup:      (companyId) => setupRepo.getAllSetup(companyId),
  getCompanySetup: (companyId) => setupRepo.getCompanySetup(companyId),
  saveCompanySetup:(companyId, data) => setupRepo.saveCompanySetup(companyId, data),
  getEPFSetup:     (companyId) => setupRepo.getEPFSetup(companyId),
  saveEPFSetup:    (companyId, data) => setupRepo.saveEPFSetup(companyId, data),
  getESISetup:     (companyId) => setupRepo.getESISetup(companyId),
  saveESISetup:    (companyId, data) => setupRepo.saveESISetup(companyId, data),
  getOTSetup:      (companyId) => setupRepo.getOTSetup(companyId),
  saveOTSetup:     (companyId, data) => setupRepo.saveOTSetup(companyId, data),
  getBonusSetup:   (companyId) => setupRepo.getBonusSetup(companyId),
  saveBonusSetup:  (companyId, data) => setupRepo.saveBonusSetup(companyId, data),
  getGratuitySetup:(companyId) => setupRepo.getGratuitySetup(companyId),
  saveGratuitySetup:(companyId, data) => setupRepo.saveGratuitySetup(companyId, data),
  getFactorySetup: (companyId) => setupRepo.getFactorySetup(companyId),
  saveFactorySetup:(companyId, data) => setupRepo.saveFactorySetup(companyId, data),
  getAllowances:     (companyId) => setupRepo.getAllowances(companyId),
  getAllowanceByCode:(companyId, code) => setupRepo.getAllowanceByCode(companyId, code),
  saveAllowance:     (companyId, code, data) => setupRepo.saveAllowance(companyId, code, data),
  getAllDeductions:     (companyId) => setupRepo.getAllDeductions(companyId),
  getDeductionByCode:(companyId, code) => setupRepo.getDeductionByCode(companyId, code),
  saveDeduction:     (companyId, code, data) => setupRepo.saveDeduction(companyId, code, data),
  getAttendanceSetup:(companyId) => setupRepo.getAttendanceSetup(companyId),
  saveAttendanceSetup:(companyId, rows) => {
    try {
      return setupRepo.saveAttendanceSetup(companyId, rows);
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};

module.exports = setupService;
