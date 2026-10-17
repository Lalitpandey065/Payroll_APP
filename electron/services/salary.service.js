const SalaryRepository = require('../db/repositories/salary.repo');
const salaryRepo = new SalaryRepository();

class SalaryService {
  createStructure(companyId, name, description, defaultCtc) {
    return salaryRepo.createStructure(companyId, name, description, defaultCtc);
  }

  getAllStructures(filters = {}) {
    return salaryRepo.findAll(filters);
  }

  getStructureWithComponents(id) {
    return salaryRepo.getStructureWithComponents(id);
  }

  assignSalaryStructure(empId, structureId, ctc, overrides = null, effectiveFrom = null) {
    return salaryRepo.assignSalaryStructure(empId, structureId, ctc, overrides, effectiveFrom);
  }

  getSalaryMappings(companyId) {
    return salaryRepo.getSalaryMappings(companyId);
  }

  getEmployeeSalary(empId) {
    return salaryRepo.getEmployeeSalary(empId);
  }

  saveStructureWithComponents(structureId, components, defaultCtc, name, description) {
    return salaryRepo.saveStructureWithComponents(structureId, components, defaultCtc, name, description);
  }
}

module.exports = new SalaryService();
