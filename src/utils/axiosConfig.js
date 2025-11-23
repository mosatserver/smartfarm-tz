import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 60000, // Increased to 60 seconds for AI processing
});

// Request interceptor to add JWT token
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

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Only redirect for authentication errors, not authorization errors with specific messages
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to landing page (where login modal is)
      window.location.href = '/';
    } else if (error.response?.status === 403) {
      // Forbidden - could be role-based, let the component handle it
      console.warn('Access forbidden:', error.response.data?.message || 'Insufficient permissions');
      // Don't auto-redirect for 403, let the form handle the error message
    }
    return Promise.reject(error);
  }
);

export default api;
