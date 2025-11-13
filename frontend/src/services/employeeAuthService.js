import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const employeeClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

employeeClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('employeeToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

employeeClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('employeeToken');
      localStorage.removeItem('employee');
      window.location.href = '/employee/login';
    }
    return Promise.reject(error);
  }
);

export async function login(username, password) {
  try {
    const response = await employeeClient.post('/auth/user/login', { username, password });

    if (response.data.success && response.data.token) {
      localStorage.setItem('employeeToken', response.data.token);
      localStorage.setItem('employee', JSON.stringify(response.data.user));
      return response.data;
    }

    throw new Error('Login failed');
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Login failed');
  }
}

export async function logout() {
  try {
    await employeeClient.post('/auth/user/logout');
  } catch (error) {
    console.error('Employee logout error:', error);
  } finally {
    localStorage.removeItem('employeeToken');
    localStorage.removeItem('employee');
  }
}

export async function verifyToken() {
  try {
    const response = await employeeClient.get('/auth/user/verify');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Token verification failed');
  }
}

export function getStoredEmployee() {
  const employee = localStorage.getItem('employee');
  return employee ? JSON.parse(employee) : null;
}

export function getToken() {
  return localStorage.getItem('employeeToken');
}

export function isAuthenticated() {
  return !!localStorage.getItem('employeeToken');
}

export default employeeClient;
