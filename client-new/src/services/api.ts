import axios from 'axios';

// 🚀 Vite automatically sets .DEV to true on your laptop, and false when deployed!
const API_URL = import.meta.env.DEV 
  ? 'http://localhost:5000/api'                  // Local Development Port
  : import.meta.env.VITE_API_URL;                // Production Render Link

const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;