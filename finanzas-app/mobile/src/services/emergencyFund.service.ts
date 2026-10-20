import apiClient from './apiClient';
import { EmergencyFund, EmergencyFundCoverage } from '../types';

export const emergencyFundService = {
  getAll: async (): Promise<EmergencyFund[]> => {
    const res = await apiClient.get<EmergencyFund[]>('/emergency-fund');
    return Array.isArray(res.data) ? res.data : [];
  },

  getCoverage: async (): Promise<EmergencyFundCoverage> => {
    const res = await apiClient.get<EmergencyFundCoverage>('/emergency-fund/coverage');
    return res.data;
  },
};
