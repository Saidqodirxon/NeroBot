import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

const instance = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
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
  get: () => instance.get("/stats"),
};

export const api = instance;

export default instance;
