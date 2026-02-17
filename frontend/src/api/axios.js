import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  "https://employee-payroll-backend-wsxi.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE_URL
});

// REQUEST INTERCEPTOR
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  error => Promise.reject(error)
);

// RESPONSE INTERCEPTOR (optional but recommended)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // token expired / invalid
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
