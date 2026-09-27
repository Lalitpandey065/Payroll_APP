const CompanyRepository = require('../db/repositories/company.repo');
const companyRepo = new CompanyRepository();

class CompanyService {
  getAllCompanies(filters = {}) {
    return companyRepo.findAll(filters);
  }

  getCompanyById(id) {
    return companyRepo.findById(id);
  }

  createCompany(companyData) {
    return companyRepo.insert(companyData);
  }

  updateCompany(id, companyData) {
    return companyRepo.update(id, companyData);
  }

  deleteCompany(id) {
    return companyRepo.softDelete(id);
  }
}

module.exports = new CompanyService();
