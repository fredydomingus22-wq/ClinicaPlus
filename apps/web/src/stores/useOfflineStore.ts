import { create } from 'zustand';
import { Mutation } from '@tanstack/react-query';

interface Conflict {
  mutationId: number;
  mutation: Mutation<unknown, unknown, unknown, unknown>;
  error: unknown;
  timestamp: number;
}

interface OfflineState {
  conflicts: Conflict[];
  isMutationManagerOpen: boolean;
  addConflict: (mutation: Mutation<unknown, unknown, unknown, unknown>, error: unknown) => void;
  resolveConflict: (mutationId: number) => void;
  setMutationManagerOpen: (open: boolean) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  conflicts: [],
  isMutationManagerOpen: false,
  
  addConflict: (mutation, error) => set((state) => ({
    conflicts: [
      ...state.conflicts.filter(c => c.mutationId !== mutation.mutationId),
      {
        mutationId: mutation.mutationId,
        mutation,
        error,
        timestamp: Date.now(),
      }
    ]
  })),

  resolveConflict: (mutationId) => set((state) => ({
    conflicts: state.conflicts.filter((c) => c.mutationId !== mutationId),
  })),

  setMutationManagerOpen: (open) => set({ isMutationManagerOpen: open }),
}));
