import axios from 'axios';

const defaultBackend = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
  ? 'https://darukaa-backend-ritx.onrender.com'
  : 'http://localhost:8000';

export const baseURL = import.meta.env.VITE_API_BASE_URL || defaultBackend;

export const api = axios.create({
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

// Helper to reliably convert FastAPI 422 detail objects, Network Errors, or standard error strings into clean UI text
export const extractErrorMessage = (err, fallback = 'An error occurred. Please try again.') => {
  if (!err) return fallback;

  if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') {
    return 'Unable to reach backend server. Please check your internet connection or backend status.';
  }

  const detail = err?.response?.data?.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const firstErr = detail[0];
    if (typeof firstErr === 'string') return firstErr;
    if (firstErr?.msg) {
      const field = Array.isArray(firstErr.loc) ? firstErr.loc[firstErr.loc.length - 1] : '';
      return field && field !== 'body' ? `${field}: ${firstErr.msg}` : firstErr.msg;
    }
  }

  if (typeof err?.message === 'string') {
    return err.message;
  }

  return fallback;
};

// Authentication API
export const authApi = {
  login: async (credentials) => {
    const formData = new URLSearchParams();
    const username = credentials.username || credentials.email;
    formData.append('username', username);
    formData.append('password', credentials.password);

    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.data?.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  register: async (data) => {
    const response = await api.post('/auth/register', {
      email: data.email,
      password: data.password,
    });
    return response.data;
  },
};

// Projects API
export const projectsApi = {
  list: async () => {
    const res = await api.get('/projects');
    return res.data;
  },
  create: async (data) => {
    const payload = typeof data === 'string' ? { name: data, description: '' } : data;
    const res = await api.post('/projects', payload);
    return res.data;
  },
  getProject: async (id) => {
    const res = await api.get(`/projects/${id}`);
    return res.data;
  },
};

// Sites API
export const sitesApi = {
  listByProject: async (projectId) => {
    const res = await api.get(`/sites/by-project/${projectId}`);
    return res.data;
  },
  create: async (siteData) => {
    let coords = siteData.polygon || siteData.boundary?.coordinates;
    if (siteData.boundary && siteData.boundary.type === 'Polygon') {
      coords = siteData.boundary.coordinates;
    }

    const payload = {
      project_id: parseInt(siteData.project_id, 10),
      name: siteData.name,
      polygon: coords,
    };

    const res = await api.post('/sites', payload);
    return res.data;
  },
  getDetail: async (siteId) => {
    const res = await api.get(`/sites/${siteId}/detail`);
    return res.data;
  },
};

// Standalone Named Functions
export const login = (credentials) => authApi.login(credentials);
export const register = (data) => authApi.register(data);
export const logout = () => {
  localStorage.removeItem('token');
};
export const isAuthenticated = () => Boolean(localStorage.getItem('token'));

export const listProjects = () => projectsApi.list();
export const getProject = (id) => projectsApi.getProject(id);
export const createProject = (name, description = '') => projectsApi.create({ name, description });

export const listSitesByProject = (projectId) => sitesApi.listByProject(projectId);
export const createSite = (data) => sitesApi.create(data);
export const getSiteDetail = (id) => sitesApi.getDetail(id);

export default api;