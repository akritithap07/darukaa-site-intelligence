import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("darukaa_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Authentication
export async function login(email, password) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);

  const res = await api.post("/auth/login", form, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  localStorage.setItem("darukaa_token", res.data.access_token);

  return res.data;
}

export async function register(email, password) {
  const res = await api.post("/auth/register", {
    email,
    password,
  });

  return res.data;
}

export function logout() {
  localStorage.removeItem("darukaa_token");
}

export function isAuthenticated() {
  return !!localStorage.getItem("darukaa_token");
}

// Projects
export async function listProjects() {
  const res = await api.get("/projects");
  return res.data;
}

export async function getProject(projectId) {
  const res = await api.get(`/projects/${projectId}`);
  return res.data;
}

export async function createProject(name, description) {
  const res = await api.post("/projects", {
    name,
    description,
  });

  return res.data;
}

// Sites
export async function listSitesByProject(projectId) {
  const res = await api.get(`/sites/by-project/${projectId}`);
  return res.data;
}

export async function createSite(projectId, name, polygon) {
  const res = await api.post("/sites", {
    project_id: projectId,
    name,
    polygon,
  });

  return res.data;
}

export async function getSiteDetail(siteId) {
  const res = await api.get(`/sites/${siteId}/detail`);
  return res.data;
}