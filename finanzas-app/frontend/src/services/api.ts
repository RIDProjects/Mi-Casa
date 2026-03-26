import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data: any) => api.post('/auth/login', data),
  profile: () => api.get('/auth/profile'),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  getOne: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const rolesAPI = {
  getAll: () => api.get('/roles'),
  getPermissions: () => api.get('/roles/permissions'),
  create: (data: any) => api.post('/roles', data),
  update: (id: string, data: any) => api.put(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
};

export const debtsAPI = {
  getAll: () => api.get('/debts'),
  getSummary: () => api.get('/debts/summary'),
  create: (data: any) => api.post('/debts', data),
  update: (id: string, data: any) => api.put(`/debts/${id}`, data),
  delete: (id: string) => api.delete(`/debts/${id}`),
};

export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  getDashboard: () => api.get('/inventory/dashboard'),
  create: (data: any) => api.post('/inventory', data),
  update: (id: string, data: any) => api.put(`/inventory/${id}`, data),
  delete: (id: string) => api.delete(`/inventory/${id}`),
};

export const purchasesAPI = {
  getLists: () => api.get('/purchases/lists'),
  getList: (id: string) => api.get(`/purchases/lists/${id}`),
  createList: (data: any) => api.post('/purchases/lists', data),
  updateList: (id: string, data: any) => api.put(`/purchases/lists/${id}`, data),
  deleteList: (id: string) => api.delete(`/purchases/lists/${id}`),
  addItem: (listId: string, data: any) => api.post(`/purchases/lists/${listId}/items`, data),
  updateItem: (id: string, data: any) => api.put(`/purchases/items/${id}`, data),
  deleteItem: (id: string) => api.delete(`/purchases/items/${id}`),
};

export const emergencyFundAPI = {
  getAll: () => api.get('/emergency-fund'),
  getOne: (id: string) => api.get(`/emergency-fund/${id}`),
  create: (data: any) => api.post('/emergency-fund', data),
  update: (id: string, data: any) => api.put(`/emergency-fund/${id}`, data),
  delete: (id: string) => api.delete(`/emergency-fund/${id}`),
};

export default api;