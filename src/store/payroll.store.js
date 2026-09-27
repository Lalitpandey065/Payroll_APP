import { create } from 'zustand';

export const usePayrollStore = create((set, get) => {
  const today = new Date();
  
  // Default to previous month for payroll processing
  let defaultMonth = today.getMonth(); // 0-indexed is previous month! (e.g. today is May (4), previous is April (3))
  let defaultYear = today.getFullYear();
  if (defaultMonth === 0) {
    defaultMonth = 12;
    defaultYear -= 1;
  }

  return {
    month: defaultMonth,
    year: defaultYear,
    companyId: null,       // remembered so addOverride can trigger a refresh
    activeRun: null,
    runDetails: [],
    preRunIssues: { errors: [], warnings: [] },
    loading: false,
    error: null,

    /**
     * Set processing period.
     */
    setPeriod: (month, year) => {
      set({ month, year, activeRun: null, runDetails: [], preRunIssues: { errors: [], warnings: [] } });
    },

    /**
     * Perform pre-run flag compliance scans.
     */
    loadPreRunFlags: async (companyId) => {
      const { month, year } = get();
      if (!companyId) return;

      try {
        const response = await window.api.payroll.bulkFlagCheck(companyId, month, year);
        if (response.success) {
          // Normalise: ensure errors/warnings arrays always exist
          const data = response.data || {};
          set({ preRunIssues: {
            errors:   Array.isArray(data.errors)   ? data.errors   : [],
            warnings: Array.isArray(data.warnings) ? data.warnings : []
          } });
        }
      } catch (e) {
        console.error('[PayrollStore] Flag Check Error: ', e);
      }
    },

    /**
     * Load existing run details for current period.
     */
    loadRun: async (companyId) => {
      const { month, year } = get();
      if (!companyId) return;

      // Remember companyId so addOverride can refresh without extra params
      set({ loading: true, error: null, companyId });
      try {
        const response = await window.api.payroll.getRun(companyId, month, year);
        if (response.success && response.data) {
          const run = response.data;
          const detailsResponse = await window.api.payroll.getRunDetails(run.id);
          set({
            activeRun: run,
            runDetails: detailsResponse.success ? detailsResponse.data : [],
            loading: false
          });
        } else {
          set({ activeRun: null, runDetails: [], loading: false });
        }
      } catch (e) {
        set({ error: e.message, loading: false });
      }
    },

    /**
     * Run draft dry-run payroll (read-only calculations).
     */
    draftRun: async (companyId, operatorName) => {
      const { month, year } = get();
      set({ loading: true, error: null });
      try {
        const response = await window.api.payroll.draftRun(companyId, month, year, operatorName);
        if (response.success) {
          set({ 
            activeRun: response.data.runData, 
            runDetails: response.data.detailsArray, 
            loading: false 
          });
          return { success: true, data: response.data };
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
     * Commit and execute payroll run into DB.
     */
    executeRun: async (companyId, operatorName) => {
      const { month, year } = get();
      set({ loading: true, error: null });
      try {
        const response = await window.api.payroll.executeRun(companyId, month, year, operatorName);
        if (response.success) {
          set({ 
            activeRun: response.data.run, 
            runDetails: response.data.details, 
            loading: false 
          });
          return { success: true };
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
     * Update status (Draft -> Under Review -> Approved -> Locked).
     */
    updateRunStatus: async (runId, status, user) => {
      set({ loading: true });
      try {
        const response = await window.api.payroll.updateStatus(runId, status, user.name);
        if (response.success) {
          set({ activeRun: response.data, loading: false });
          return { success: true };
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
     * Save an override for an employee.
     * Callers are responsible for re-running the payroll engine and calling
     * loadRun() afterwards so totals reflect the new override.
     */
    addOverride: async (overrideData) => {
      try {
        const response = await window.api.payroll.addOverride(overrideData);
        if (response.success) {
          return { success: true };
        }
        return { success: false, error: response.error?.message || 'Override save failed.' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  };
});
