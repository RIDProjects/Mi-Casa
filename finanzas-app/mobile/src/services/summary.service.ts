import apiClient from './apiClient';
import { MonthlySummary } from '../types';

export const summaryService = {
  get: async (): Promise<MonthlySummary> => {
    const res = await apiClient.get<MonthlySummary>('/summary');
    return res.data;
  },
};
