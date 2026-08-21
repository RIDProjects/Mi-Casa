import apiClient from './apiClient';
import { CreditCard } from '../types';

export const creditCardsService = {
  getAll: async (): Promise<CreditCard[]> => {
    const res = await apiClient.get<CreditCard[]>('/credit-cards');
    return Array.isArray(res.data) ? res.data : [];
  },
};
