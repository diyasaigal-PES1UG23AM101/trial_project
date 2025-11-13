import axios from 'axios';
import employeeClient from './employeeAuthService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// axios client shared by admin + legacy endpoints
const assetApiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

assetApiClient.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem('token');
    const employeeToken = localStorage.getItem('employee_token') || localStorage.getItem('employeeToken');
    const token = adminToken || employeeToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

assetApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isEmployee = localStorage.getItem('employee_token') || localStorage.getItem('employeeToken');
      if (isEmployee) {
        localStorage.removeItem('employee_token');
        localStorage.removeItem('employeeToken');
        localStorage.removeItem('employee');
        window.location.href = '/employee/login';
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('admin');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export async function getMyAssets() {
  try {
    const response = await assetApiClient.get('/assets/my-assets');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch assets');
  }
}

export async function getAllAssets() {
  try {
    const response = await assetApiClient.get('/assets');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch assets');
  }
}

export async function createAsset(assetData) {
  try {
    const response = await assetApiClient.post('/assets', assetData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to create asset');
  }
}

export async function assignAssetToEmployee(assetId, userId, notes) {
  try {
    const response = await assetApiClient.post('/assets/assign', {
      assetId,
      userId,
      notes
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to assign asset');
  }
}

// employee-facing client (new microservice)
export async function getAssignedAssets() {
  try {
    const response = await employeeClient.get('/assets/my');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to load assets');
  }
}