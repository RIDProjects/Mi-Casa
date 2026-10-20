import apiClient from './apiClient';
import { Cuota, CuotaPayload } from '../types';

export const cuotasService = {
  getAll: async (): Promise<Cuota[]> => {
    const res = await apiClient.get<Cuota[]>('/cuotas');
    return Array.isArray(res.data) ? res.data : [];
  },

  create: async (data: CuotaPayload): Promise<Cuota> => {
    const res = await apiClient.post<Cuota>('/cuotas', data);
    return res.data;
  },

  update: async (id: string, data: Partial<CuotaPayload>): Promise<Cuota> => {
    const res = await apiClient.put<Cuota>(`/cuotas/${id}`, data);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/cuotas/${id}`);
  },

  /** Registers the next installment as paid (POST /cuotas/:id/pay). */
  pay: async (id: string): Promise<Cuota> => {
    const res = await apiClient.post<Cuota>(`/cuotas/${id}/pay`);
    return res.data;
  },
};
