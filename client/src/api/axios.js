// client/src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && !error.config.url.endsWith('/auth/me')) {
        window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
