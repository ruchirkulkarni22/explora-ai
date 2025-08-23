// client/src/api/axios.js
import axios from 'axios';

// Create a custom axios instance with a base URL for our backend
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api',
});

// Axios Interceptor: This is a powerful feature that runs before every API request.
// It automatically attaches the user's authentication token to the request headers.
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            // If a token exists, add it to the 'Authorization' header
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        // Handle any request errors
        return Promise.reject(error);
    }
);

export default api;
