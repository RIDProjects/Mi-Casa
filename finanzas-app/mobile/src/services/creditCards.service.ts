import apiClient from './apiClient';
import { CreditCard, CreditCardPayload } from '../types';

export const creditCardsService = {
  getAll: async (): Promise<CreditCard[]> => {
    const res = await apiClient.get<CreditCard[]>('/credit-cards');
    return Array.isArray(res.data) ? res.data : [];
  },

  create: async (data: CreditCardPayload): Promise<CreditCard> => {
    const res = await apiClient.post<CreditCard>('/credit-cards', data);
    return res.data;
  },

  update: async (id: string, data: Partial<CreditCardPayload>): Promise<CreditCard> => {
    const res = await apiClient.put<CreditCard>(`/credit-cards/${id}`, data);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/credit-cards/${id}`);
  },
};
