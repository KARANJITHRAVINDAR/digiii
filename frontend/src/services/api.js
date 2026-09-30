import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token if stored
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 Unauthorized globally and normalize error details
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Ensure error.response.data.detail is always converted to a readable string
    if (error.response && error.response.data && error.response.data.detail) {
      const detail = error.response.data.detail;
      if (typeof detail !== 'string') {
        if (Array.isArray(detail)) {
          error.response.data.detail = detail
            .map((item) => {
              if (typeof item === 'string') return item;
              if (item && item.msg) {
                const field = Array.isArray(item.loc) && item.loc.length > 1 ? `${item.loc[item.loc.length - 1]}: ` : '';
                return `${field}${item.msg}`;
              }
              return JSON.stringify(item);
            })
            .join('; ');
        } else if (typeof detail === 'object' && detail !== null) {
          error.response.data.detail = detail.message || detail.msg || JSON.stringify(detail);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
