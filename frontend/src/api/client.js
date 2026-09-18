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

// Helper to reliably convert FastAPI 422 detail objects or standard error strings into clean text
export const extractErrorMessage = (err, fallback = 'An error occurred. Please try again.') => {
  const detail = err?.response?.data?.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    // Standard FastAPI validation array [{ loc, msg, type }]
    const firstErr = detail[0];
    if (typeof firstErr === 'string') return firstErr;
    if (firstErr?.msg) {
      const field = Array.isArray(firstErr.loc) ? firstErr.loc[firstErr.loc.length - 1] : '';
      return field && field !== 'body' ? `${field}: ${firstErr.msg}` : firstErr.msg;
    }
  }

  if (err?.message && typeof err.message === 'string') {
    return err.message;
  }

  return fallback;
};

// Authentication API
export const authApi = {
  login: async (credentials) => {
    // FastAPI OAuth2PasswordRequestForm expects URL-encoded form data
    const formData = new URLSearchParams();
    const username = credentials.username || credentials.email;
    formData.append('username', username);
    formData.append('password', credentials.password);

    try {
      return await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (err) {
      // Fallback: If backend expects raw JSON body, retry with JSON
      if (err.response?.status === 422) {
        return await api.post('/auth/login', {
          username,
          email: username,
          password: credentials.password,
        });
      }
      throw err;
    }
  },
  register: (data) => api.post('/auth/register', data),
};

// Projects API
export const projectsApi = {
  list: () => api.get('/projects/'),
  create: (data) => api.post('/projects/', data),
  getProject: (id) => api.get(`/projects/${id}`),
};

// Sites API
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