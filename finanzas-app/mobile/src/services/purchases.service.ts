import apiClient from './apiClient';
import {
  PurchaseList,
  CreatePurchaseListDto,
  PurchaseItem,
  CreatePurchaseItemDto,
} from '../types';

export const purchasesService = {
  getLists: async (): Promise<PurchaseList[]> => {
    const res = await apiClient.get<PurchaseList[]>('/purchases/lists');
    // La API puede devolver el array directamente o dentro de un objeto
    return Array.isArray(res.data) ? res.data : (res.data as any).data ?? [];
  },

  getList: async (id: string): Promise<PurchaseList> => {
    const res = await apiClient.get<PurchaseList>(`/purchases/lists/${id}`);
    return res.data;
  },

  createList: async (data: CreatePurchaseListDto): Promise<PurchaseList> => {
    const res = await apiClient.post<PurchaseList>('/purchases/lists', data);
    return res.data;
  },

  updateList: async (
    id: string,
    data: Partial<CreatePurchaseListDto>,
  ): Promise<PurchaseList> => {
    const res = await apiClient.put<PurchaseList>(`/purchases/lists/${id}`, data);
    return res.data;
  },

  deleteList: async (id: string): Promise<void> => {
    await apiClient.delete(`/purchases/lists/${id}`);
  },

  addItem: async (listId: string, data: CreatePurchaseItemDto): Promise<PurchaseItem> => {
    const res = await apiClient.post<PurchaseItem>(
      `/purchases/lists/${listId}/items`,
      data,
    );
    return res.data;
  },

  updateItem: async (
    id: string,
    data: Partial<CreatePurchaseItemDto>,
  ): Promise<PurchaseItem> => {
    const res = await apiClient.put<PurchaseItem>(`/purchases/items/${id}`, data);
    return res.data;
  },

  deleteItem: async (id: string): Promise<void> => {
    await apiClient.delete(`/purchases/items/${id}`);
  },
};
