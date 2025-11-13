import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance for employee API calls
const employeeApiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add employee token to requests if available
employeeApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('employee_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors
employeeApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('employee_token');
      localStorage.removeItem('employee');
      window.location.href = '/employee/login';
    }
    return Promise.reject(error);
  }
);

export async function registerEmployee(username, email, password, fullName, employeeId, department) {
  try {
    const response = await employeeApiClient.post('/employee/register', {
      username,
      email,
      password,
      fullName,
      employeeId,
      department
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to register employee'
    );
  }
}

export async function loginEmployee(username, password) {
  try {
    const response = await employeeApiClient.post('/employee/login', {
      username,
      password
    });
    
    if (response.data.success && response.data.token) {
      localStorage.setItem('employee_token', response.data.token);
      localStorage.setItem('employee', JSON.stringify(response.data.user));
      return response.data;
    }
    throw new Error('Login failed');
  } catch (error) {
    throw new Error(
      error.response?.data?.error || error.message || 'Login failed'
    );
  }
}

export async function verifyEmployeeToken() {
  try {
    const response = await employeeApiClient.get('/employee/verify');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || error.message || 'Token verification failed'
    );
  }
}

export async function logoutEmployee() {
  try {
    await employeeApiClient.post('/employee/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('employee_token');
    localStorage.removeItem('employee');
  }
}

export function getStoredEmployee() {
  const employee = localStorage.getItem('employee');
  return employee ? JSON.parse(employee) : null;
}

export function getEmployeeToken() {
  return localStorage.getItem('employee_token');
}

export function isEmployeeAuthenticated() {
  return !!localStorage.getItem('employee_token');
}

