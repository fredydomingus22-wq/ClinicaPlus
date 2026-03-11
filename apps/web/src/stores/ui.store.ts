import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}

interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  notifications: Notification[];
  toggleSidebar: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  addNotification: (type: Notification['type'], message: string) => void;
  addToast: (options: { type: Notification['type']; title?: string; message: string }) => void;
  dismissNotification: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen:  true,
  activeModal:  null,
  notifications: [],
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal:  (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  addNotification: (type, message) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((s) => ({ 
      notifications: [{ id, type, message }, ...s.notifications].slice(0, 5) 
    }));
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter(x => x.id !== id) }));
    }, 4000);
  },
  addToast: ({ type, title, message }) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((s) => ({ 
      notifications: [
        { id, type, message, ...(title ? { title } : {}) } as Notification, 
        ...s.notifications
      ].slice(0, 5) 
    }));
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter(x => x.id !== id) }));
    }, 4000);
  },
  dismissNotification: (id) => set((s) => ({ 
    notifications: s.notifications.filter(x => x.id !== id) 
  })),
}));
