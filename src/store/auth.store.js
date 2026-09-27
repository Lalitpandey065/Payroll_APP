import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  /**
   * Log in user using credentials.
   */
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await window.api.auth.login(email, password);
      if (response.success) {
        set({ user: response.data, isAuthenticated: true, loading: false, error: null });
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
   * Logs out active user.
   */
  logout: () => {
    set({ user: null, isAuthenticated: false, error: null });
  },

  /**
   * Triggers a password update.
   */
  updatePassword: async (currentPassword, newPassword) => {
    const user = get().user;
    if (!user) return { success: false, error: 'Not authenticated.' };

    try {
      const response = await window.api.auth.updatePassword(user.id, currentPassword, newPassword);
      if (response.success) {
        // Clear force password flag locally
        set({ user: { ...user, force_password_change: 0 } });
        return { success: true };
      } else {
        return { success: false, error: response.error.message };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}));
