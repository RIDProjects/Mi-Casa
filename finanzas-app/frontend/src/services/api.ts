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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'));
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  profile: () => api.get('/auth/profile'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  getOne: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  getAdminStats: () => api.get('/users/admin/stats'),
};

export const rolesAPI = {
  getAll: () => api.get('/roles'),
  getPermissions: () => api.get('/roles/permissions'),
  create: (data: any) => api.post('/roles', data),
  update: (id: string, data: any) => api.put(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
};

export const housesAPI = {
  getAll: () => api.get('/houses'),
  getOne: (id: string) => api.get(`/houses/${id}`),
  getMembers: (id: string) => api.get(`/houses/${id}/members`),
  switchHouse: (id: string) => api.post(`/houses/${id}/switch`),
  updateHouse: (id: string, data: any) => api.put(`/houses/${id}`, data),
  toggleUserActive: (houseId: string, userId: string) => api.post(`/houses/${houseId}/members/${userId}/toggle-active`, {}),
  removeUserFromHouse: (houseId: string, userId: string) => api.delete(`/houses/${houseId}/members/${userId}`),
};

export const debtsAPI = {
  getAll: () => api.get('/debts'),
  getSummary: () => api.get('/debts/summary'),
  create: (data: any) => api.post('/debts', data),
  update: (id: string, data: any) => api.put(`/debts/${id}`, data),
  delete: (id: string) => api.delete(`/debts/${id}`),
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

export const budgetAPI = {
  getAll: () => api.get('/budget'),
  getOne: (id: string) => api.get(`/budget/${id}`),
  create: (data: any) => api.post('/budget', data),
  update: (id: string, data: any) => api.put(`/budget/${id}`, data),
  delete: (id: string) => api.delete(`/budget/${id}`),

  addIncome: (budgetId: string, data: any) => api.post(`/budget/${budgetId}/income`, data),
  updateIncome: (id: string, data: any) => api.put(`/budget/income/${id}`, data),
  deleteIncome: (id: string) => api.delete(`/budget/income/${id}`),

  addCategory: (budgetId: string, data: any) => api.post(`/budget/${budgetId}/categories`, data),
  deleteCategory: (id: string) => api.delete(`/budget/categories/${id}`),

  addExpense: (categoryId: string, data: any) => api.post(`/budget/categories/${categoryId}/expenses`, data),
  updateExpense: (id: string, data: any) => api.put(`/budget/expenses/${id}`, data),
  deleteExpense: (id: string) => api.delete(`/budget/expenses/${id}`),
};

export const transactionsAPI = {
  getByMonth: (year: number, month: number) => api.get(`/transactions?year=${year}&month=${month}`),
  getSummary: (year: number, month: number, expectedIncome?: number, expectedExpenses?: number) =>
    api.get(`/transactions/summary?year=${year}&month=${month}&expectedIncome=${expectedIncome || 0}&expectedExpenses=${expectedExpenses || 0}`),
  create: (data: any) => api.post('/transactions', data),
  update: (id: string, data: any) => api.put(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
};

export const savingsGoalsAPI = {
  getAll: () => api.get('/savings-goals'),
  create: (data: any) => api.post('/savings-goals', data),
  update: (id: string, data: any) => api.put(`/savings-goals/${id}`, data),
  delete: (id: string) => api.delete(`/savings-goals/${id}`),
};

export const creditCardsAPI = {
  getAll: () => api.get('/credit-cards'),
  create: (data: any) => api.post('/credit-cards', data),
  update: (id: string, data: any) => api.put(`/credit-cards/${id}`, data),
  delete: (id: string) => api.delete(`/credit-cards/${id}`),
};

export const loansAPI = {
  getAll: () => api.get('/loans'),
  create: (data: any) => api.post('/loans', data),
  update: (id: string, data: any) => api.put(`/loans/${id}`, data),
  delete: (id: string) => api.delete(`/loans/${id}`),
};

export const assetsAPI = {
  getAll: (totalCardBalances?: number, totalLoanDebt?: number) =>
    api.get(`/net-worth?totalCardBalances=${totalCardBalances || 0}&totalLoanDebt=${totalLoanDebt || 0}`),
  create: (data: any) => api.post('/net-worth', data),
  update: (id: string, data: any) => api.put(`/net-worth/${id}`, data),
  delete: (id: string) => api.delete(`/net-worth/${id}`),
};

export const householdExpensesAPI = {
  getMonth: (month: string) => api.get(`/household-expenses?month=${month}`),
  create: (data: any) => api.post('/household-expenses', data),
  update: (id: string, data: any) => api.put(`/household-expenses/${id}`, data),
  delete: (id: string) => api.delete(`/household-expenses/${id}`),
};

export const exportTransactionsCSV = async (year: number, month: number) => {
  const response = await api.get(`/transactions/export/csv?year=${year}&month=${month}`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `transacciones-${year}-${month}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const importTransactionsCSV = async (file: File, year: number, month: number) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/transactions/import?year=${year}&month=${month}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const recurringAPI = {
  getAll: () => api.get('/recurring-transactions'),
  create: (data: any) => api.post('/recurring-transactions', data),
  update: (id: string, data: any) => api.put(`/recurring-transactions/${id}`, data),
  remove: (id: string) => api.delete(`/recurring-transactions/${id}`),
  generateForMonth: (year: number, month: number) => api.post('/recurring-transactions/generate', { year, month }),
};

export const summaryAPI = {
  getGlobal: () => api.get('/summary'),
};

export const cuotasAPI = {
  getAll: () => api.get('/cuotas'),
  getSummary: () => api.get('/cuotas/summary'),
  create: (data: any) => api.post('/cuotas', data),
  update: (id: string, data: any) => api.put(`/cuotas/${id}`, data),
  remove: (id: string) => api.delete(`/cuotas/${id}`),
  pay: (id: string) => api.post(`/cuotas/${id}/pay`),
};

export const upcomingBillsAPI = {
  get: (days?: number) => api.get(`/summary/upcoming-bills?days=${days || 30}`),
};

export const debtPayoffAPI = {
  getStrategies: (extraPayment: number) => api.get(`/debts/payoff?extraPayment=${extraPayment}`),
};

export const netWorthHistoryAPI = {
  get: (months?: number) => api.get(`/net-worth/history?months=${months || 12}`),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const emergencyFundCoverageAPI = {
  getCoverage: () => api.get('/emergency-fund/coverage'),
};

export const houseInviteAPI = {
  invite: (houseId: string, email: string, role?: string) =>
    api.post(`/houses/${houseId}/invite`, { email, role }),
};

export const insightsAPI = {
  get: () => api.get('/summary/insights'),
};

export const investmentsAPI = {
  getAll: () => api.get('/investments'),
  create: (data: any) => api.post('/investments', data),
  update: (id: string, data: any) => api.put(`/investments/${id}`, data),
  remove: (id: string) => api.delete(`/investments/${id}`),
};

export const exchangeRatesAPI = {
  getLatest: () => api.get('/exchange-rates/latest'),
  create: (data: any) => api.post('/exchange-rates', data),
};

export const houseCurrenciesAPI = {
  getAll: (houseId: string) => api.get(`/houses/${houseId}/currencies`),
  add: (houseId: string, data: any) => api.post(`/houses/${houseId}/currencies`, data),
  setBase: (houseId: string, currencyId: string) => api.put(`/houses/${houseId}/currencies/${currencyId}/set-base`, {}),
  remove: (houseId: string, currencyId: string) => api.delete(`/houses/${houseId}/currencies/${currencyId}`),
  getRates: (houseId: string) => api.get(`/houses/${houseId}/currencies/rates`),
  upsertRate: (houseId: string, data: any) => api.post(`/houses/${houseId}/currencies/rates`, data),
};

export const pushAPI = {
  getPublicKey: () => api.get('/push/vapid-public-key'),
  subscribe: (subscription: any) => api.post('/push/subscribe', subscription),
};

export const healthScoreAPI = {
  get: () => api.get('/summary/health-score'),
};

export default api;