const EmployeeRepository = require('../db/repositories/employee.repo');
const employeeRepo = new EmployeeRepository();

class EmployeeService {
  getAllEmployees(filters = {}) {
    return employeeRepo.findAll(filters);
  }

  getEmployeeById(id) {
    return employeeRepo.findById(id);
  }

  getEmployeePackage(id) {
    return employeeRepo.getEmployeePackage(id);
  }

  createEmployee(employeeData, identityData = {}, statutoryData = {}) {
    return employeeRepo.insert(employeeData, identityData, statutoryData);
  }

  updateEmployee(id, coreData, identityData = {}, statutoryData = {}) {
    return employeeRepo.updateEmployeePackage(id, coreData, identityData, statutoryData);
  }

  deleteEmployee(id) {
    return employeeRepo.softDelete(id);
  }

  getInvestmentDeclaration(empId, finYear) {
    return employeeRepo.getInvestmentDeclaration(empId, finYear);
  }

  saveInvestmentDeclaration(declaration) {
    return employeeRepo.saveInvestmentDeclaration(declaration);
  }
}

module.exports = new EmployeeService();
