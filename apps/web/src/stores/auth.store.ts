import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UtilizadorDTO } from '@clinicaplus/types';
import { getSessionStorage } from '../lib/browserStorage';

interface AuthState {
  accessToken: string | null;
  utilizador: UtilizadorDTO | null;
  isRestoring: boolean;
  setSession: (accessToken: string, utilizador: UtilizadorDTO) => void;
  setAccessToken: (accessToken: string) => void;
  setUtilizador: (utilizador: UtilizadorDTO) => void;
  clear: () => void;
  setRestoring: (isRestoring: boolean) => void;
}

/**
 * Global authentication store using Zustand with sessionStorage persistence.
 * Access token and user data are persisted in sessionStorage for session restoration.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      utilizador: null,
      isRestoring: true,
      setSession: (accessToken, utilizador) => set({ accessToken, utilizador }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUtilizador: (utilizador) => set({ utilizador }),
      clear: () => set({ accessToken: null, utilizador: null }),
      setRestoring: (isRestoring) => set({ isRestoring }),
    }),
    {
      name: 'clinicaplus-auth',
      storage: createJSONStorage(getSessionStorage), // sessionStorage for security (cleared on browser close)
      partialize: (state) => ({ 
        accessToken: state.accessToken, 
        utilizador: state.utilizador 
      }), // Only persist auth data, not isRestoring
    }
  )
);
