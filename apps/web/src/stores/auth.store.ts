import { create } from 'zustand';
import type { UtilizadorDTO } from '@clinicaplus/types';

interface AuthState {
  accessToken: string | null;
  utilizador: UtilizadorDTO | null;
  isRestoring: boolean;
  setSession: (accessToken: string, utilizador: UtilizadorDTO) => void;
  clear: () => void;
  setRestoring: (isRestoring: boolean) => void;
}

/**
 * Global authentication store using Zustand.
 * Access token is kept only in memory for security.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  utilizador: null,
  isRestoring: true,
  setSession: (accessToken, utilizador) => set({ accessToken, utilizador }),
  clear: () => set({ accessToken: null, utilizador: null }),
  setRestoring: (isRestoring) => set({ isRestoring }),
}));
