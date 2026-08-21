import apiClient from './apiClient';
import { Cuota } from '../types';

export const cuotasService = {
  getAll: async (): Promise<Cuota[]> => {
    const res = await apiClient.get<Cuota[]>('/cuotas');
    return Array.isArray(res.data) ? res.data : [];
  },
};
