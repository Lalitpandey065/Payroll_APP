import { create } from 'zustand';

export const useCompanyStore = create((set, get) => ({
  companies: [],
  activeCompany: null,
  loading: false,
  error: null,

  /**
   * Load all companies.
   */
  loadCompanies: async () => {
    set({ loading: true, error: null });
    try {
      const response = await window.api.company.getAll();
      if (response.success) {
        const companies = response.data;
        let active = get().activeCompany;
        
        // Attempt to restore cached selection
        const cachedId = localStorage.getItem('paysmart_active_company_id');
        if (cachedId) {
          active = companies.find(c => c.id === cachedId) || companies[0] || null;
        } else if (!active && companies.length > 0) {
          active = companies[0];
        }

        set({ companies, activeCompany: active, loading: false });
      } else {
        set({ error: response.error.message, loading: false });
      }
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },

  /**
   * Select active company.
   */
  setActiveCompany: (company) => {
    if (company) {
      localStorage.setItem('paysmart_active_company_id', company.id);
    } else {
      localStorage.removeItem('paysmart_active_company_id');
    }
    set({ activeCompany: company });
  },

  /**
   * Create a new company.
   */
  createCompany: async (companyData) => {
    set({ loading: true });
    try {
      const response = await window.api.company.create(companyData);
      if (response.success) {
        await get().loadCompanies();
        const created = response.data;
        // Select immediately
        get().setActiveCompany(created);
        return { success: true, data: created };
      } else {
        set({ error: response.error.message, loading: false });
        return { success: false, error: response.error.message };
      }
    } catch (e) {
      set({ error: e.message, loading: false });
      return { success: false, error: e.message };
    }
  },

  /**
   * Update active company settings.
   */
  updateCompany: async (id, companyData) => {
    set({ loading: true });
    try {
      const response = await window.api.company.update(id, companyData);
      if (response.success) {
        await get().loadCompanies();
        return { success: true, data: response.data };
      } else {
        set({ error: response.error.message, loading: false });
        return { success: false, error: response.error.message };
      }
    } catch (e) {
      set({ error: e.message, loading: false });
      return { success: false, error: e.message };
    }
  }
}));
