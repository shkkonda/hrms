import axios from 'axios';

// Use environment variable or fallback to production backend URL
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://hrms-aqi6.onrender.com';
const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
