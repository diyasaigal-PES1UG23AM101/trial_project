import apiClient from './authService.js';

export async function getAdminModules() {
  try {
    const response = await apiClient.get('/modules/admin');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to fetch admin modules'
    );
  }
}

export async function getUserModules(userId) {
  try {
    const response = await apiClient.get(`/modules/user/${userId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to fetch user modules'
    );
  }
}

