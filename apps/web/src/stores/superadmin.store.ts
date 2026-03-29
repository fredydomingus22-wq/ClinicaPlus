/* eslint-disable no-restricted-globals */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ImpersonationData {
  token: string;
  clinicaNome: string | null;
  expiresAt: Date | string;
}

interface SuperAdminStore {
  isImpersonating: boolean;
  clinicaNome: string | null;
  expiresAt: string | null;
  saToken: string | null;
  startImpersonation: (data: ImpersonationData) => void;
  endImpersonation: () => void;
}

export const useSuperAdminStore = create<SuperAdminStore>()(
  persist(
    (set) => ({
      isImpersonating: false,
      clinicaNome: null,
      expiresAt: null,
      saToken: null,
      
      startImpersonation: (data: ImpersonationData) => set({
        isImpersonating: true,
        clinicaNome: data.clinicaNome,
        expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : data.expiresAt.toISOString(),
        saToken: data.token
      }),

      endImpersonation: () => set({
        isImpersonating: false,
        clinicaNome: null,
        expiresAt: null,
        saToken: null
      })
    }),
    {
      name: 'superadmin-storage',
      storage: createJSONStorage(() => sessionStorage), // Usar sessionStorage para isolar impersonation
    }
  )
);
