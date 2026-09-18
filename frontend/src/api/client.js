import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Authorization header if token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API Helper Objects
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
};

export const projectsApi = {
  list: () => api.get('/projects/'),
  create: (data) => api.post('/projects/', data),
  getProject: (id) => api.get(`/projects/${id}`),
};

export const sitesApi = {
  getDetail: (id) => api.get(`/sites/${id}/detail`),
  create: (data) => api.post('/sites/', data),
  listByProject: (projectId) => api.get(`/projects/${projectId}/sites/`),
};

// Standalone Named Functions (Direct Page Imports)
export const login = (credentials) => authApi.login(credentials);
export const register = (data) => authApi.register(data);
export const logout = () => { localStorage.removeItem('token'); };
export const isAuthenticated = () => Boolean(localStorage.getItem('token'));

export const listProjects = () => projectsApi.list();
export const getProject = (id) => projectsApi.getProject(id);
export const createProject = (data) => projectsApi.create(data);

export const listSitesByProject = (projectId) => sitesApi.listByProject(projectId);
export const createSite = (data) => sitesApi.create(data);
export const getSiteDetail = (id) => sitesApi.getDetail(id);

export default api;