import { create } from "zustand";

interface NotificationUiState {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
}

export const useNotificationStore = create<NotificationUiState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: n }),
}));
