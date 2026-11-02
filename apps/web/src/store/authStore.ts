// Auth store - Zustand store untuk state autentikasi

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, AuthResponse } from '@sipedes/shared';
import { api } from '../lib/api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isWarga: boolean;
  /** True bila user wajib ganti password awal (login pertama) */
  mustChangePassword: boolean;
  setAuth: (data: AuthResponse) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  clearMustChangePassword: () => void;
  logout: () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isStaff: false,
      isAdmin: false,
      isWarga: false,
      mustChangePassword: false,
      setAuth: (data) => {
        set({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          isStaff: data.user.role === 'petugas' || data.user.role === 'admin',
          isAdmin: data.user.role === 'admin',
          isWarga: data.user.role === 'warga',
          mustChangePassword: data.mustChangePassword ?? false,
        });
      },
      updateUser: (partial) => {
        const current = get().user;
        if (current) {
          set({ user: { ...current, ...partial } });
        }
      },
      clearMustChangePassword: () => set({ mustChangePassword: false }),
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isStaff: false,
          isAdmin: false,
          isWarga: false,
          mustChangePassword: false,
        });
      },
      fetchProfile: async () => {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success && res.data.data) {
            const { user, resident, mustChangePassword } = res.data.data as {
              user: AuthUser;
              resident: unknown;
              mustChangePassword?: boolean;
            };
            set({
              user,
              isAuthenticated: true,
              isStaff: user.role === 'petugas' || user.role === 'admin',
              isAdmin: user.role === 'admin',
              isWarga: user.role === 'warga',
              mustChangePassword: mustChangePassword ?? false,
            });
            // simpan resident untuk komponen lain
            (get() as unknown as { _resident?: unknown })._resident = resident;
          }
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: 'sipedes-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        mustChangePassword: state.mustChangePassword,
      }),
    }
  )
);
