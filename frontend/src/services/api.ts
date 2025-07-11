// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

export default api;
