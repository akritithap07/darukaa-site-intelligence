import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Authorization header if token exists
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication API
export const authApi = {
  login: (credentials) => client.post('/auth/login', credentials),
  register: (data) => client.post('/auth/register', data),
};

// Projects API
export const projectsApi = {
  list: () => client.get('/projects/'),
  create: (data) => client.post('/projects/', data),
  getProject: (id) => client.get(`/projects/${id}`),
};

// Sites API
export const sitesApi = {
  getDetail: (id) => client.get(`/sites/${id}/detail`),
  create: (data) => client.post('/sites/', data),
};

// Standalone named function exports for direct page imports
export const getProject = (id) => projectsApi.getProject(id);
export const createSite = (data) => sitesApi.create(data);
export const getSiteDetail = (id) => sitesApi.getDetail(id);

export default client;