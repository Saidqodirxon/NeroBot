import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

const instance = axios.create({
  baseURL: API_BASE,
  // increase timeout to allow bulk uploads of many promo codes
  timeout: 60000,
});

// Request interceptor - token qo'shish
instance.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("nerobot_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Response interceptor - 401 xatolarda loginga yo'naltirish
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token eskirgan yoki noto'g'ri
      localStorage.removeItem("nerobot_token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (username, password) =>
    instance.post("/auth/login", { username, password }),
};

export const stats = {
  get: (seasonId) =>
    instance.get(`/stats${seasonId ? `?seasonId=${seasonId}` : ""}`),
};

export const seasons = {
  getAll: () => instance.get("/seasons"),
  create: (data) => instance.post("/seasons", data),
  update: (id, data) => instance.put(`/seasons/${id}`, data),
  delete: (id) => instance.delete(`/seasons/${id}`),
};

export const users = {
  getAll: (params) => instance.get("/users", { params }),
  getDetails: (telegramId, seasonId) =>
    instance.get(
      `/users/${telegramId}${seasonId ? `?seasonId=${seasonId}` : ""}`
    ),
  exportHistory: (telegramId, seasonId) =>
    instance.get(
      `/export/user/${telegramId}${seasonId ? `?seasonId=${seasonId}` : ""}`,
      {
        responseType: "blob",
      }
    ),
  block: (userId, reason) =>
    instance.post(`/users/${userId}/block`, { reason }),
  unblock: (userId) => instance.post(`/users/${userId}/unblock`),
};

export const promoCodes = {
  getAll: (params) => instance.get("/promo-codes", { params }),
  create: (data) => instance.post("/promo-codes", data),
  delete: (code) => instance.delete(`/promo-codes/${code}`),
};

export const api = instance;

export default instance;
