import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
apiClient.interceptors.request.use(
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

// Handle 401 errors (unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Login function
 * @param {string} username - Admin username
 * @param {string} password - Admin password
 * @returns {Promise<Object>} Login response with token and admin info
 */
export async function login(username, password) {
  try {
    const response = await apiClient.post('/auth/login', {
      username,
      password,
    });
    
    if (response.data.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('admin', JSON.stringify(response.data.admin));
      return response.data;
    }
    throw new Error('Login failed');
  } catch (error) {
    throw new Error(
      error.response?.data?.error || error.message || 'Login failed'
    );
  }
}

/**
 * Logout function
 * @returns {Promise<Object>} Logout response
 */
export async function logout() {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
  }
}

/**
 * Verify token and get current admin
 * @returns {Promise<Object>} Admin info
 */
export async function verifyToken() {
  try {
    const response = await apiClient.get('/auth/verify');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || error.message || 'Token verification failed'
    );
  }
}

/**
 * Get stored admin info from localStorage
 * @returns {Object|null} Admin object or null
 */
export function getStoredAdmin() {
  const admin = localStorage.getItem('admin');
  return admin ? JSON.parse(admin) : null;
}

/**
 * Get stored token from localStorage
 * @returns {string|null} Token or null
 */
export function getToken() {
  return localStorage.getItem('token');
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if token exists
 */
export function isAuthenticated() {
  return !!localStorage.getItem('token');
}

export default apiClient;

// CommonJS export for Jest tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    login,
    logout,
    verifyToken,
    getStoredAdmin,
    getToken,
    isAuthenticated,
    default: apiClient
  };
}

