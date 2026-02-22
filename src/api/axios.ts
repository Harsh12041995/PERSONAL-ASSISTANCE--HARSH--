import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://13.234.196.105:8080/api/v1';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the auth token
apiClient.interceptors.request.use(
  (config) => {
    // Attempt to get token from localStorage first, or handled by context if preferred.
    // Assuming standard key 'accessToken' or similar. 
    // Adapting to existing auth system which seems to use 'auth' object in localStorage or similar.

    // We'll try to read from where AuthContext typically saves it.
    // A common pattern is localStorage.getItem('accessToken') or similar.
    // Based on the Context file names, it might be in an AuthContext state.
    // However, for axios interceptors, reading from localStorage is safest/easiest synchronously.

    const token = localStorage.getItem('accessToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized globally if needed (e.g. redirect to login)
    if (error.response && error.response.status === 401) {
      // Dispatch an event or handle logout
      // window.dispatchEvent(new CustomEvent('unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
