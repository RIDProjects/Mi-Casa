import apiClient from './apiClient';
import { AppNotification } from '../types';

export const notificationsService = {
  getAll: async (): Promise<AppNotification[]> => {
    const res = await apiClient.get<AppNotification[]>('/notifications');
    return Array.isArray(res.data) ? res.data : [];
  },

  markRead: async (id: string): Promise<AppNotification> => {
    const res = await apiClient.patch<AppNotification>(`/notifications/${id}/read`);
    return res.data;
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  },
};
