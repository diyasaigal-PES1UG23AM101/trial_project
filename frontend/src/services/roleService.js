import apiClient from './authService';

/**
 * Create a new role
 * @param {string} roleName - Name of the role
 * @param {string} description - Description of the role
 * @param {Object} permissions - Permissions object
 * @returns {Promise<Object>} Created role
 */
export async function createRole(roleName, description, permissions = {}) {
  try {
    const response = await apiClient.post('/roles', {
      roleName,
      description,
      permissions
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to create role'
    );
  }
}

/**
 * Get all roles
 * @param {boolean} includeInactive - Include inactive roles
 * @returns {Promise<Object>} List of roles
 */
export async function getAllRoles(includeInactive = false) {
  try {
    const response = await apiClient.get('/roles', {
      params: { includeInactive }
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to fetch roles'
    );
  }
}

/**
 * Get a single role by ID
 * @param {number} roleId - Role ID
 * @returns {Promise<Object>} Role information
 */
export async function getRoleById(roleId) {
  try {
    const response = await apiClient.get(`/roles/${roleId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to fetch role'
    );
  }
}

/**
 * Find user by employee ID
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Object>} User information
 */
export async function findUserByEmployeeId(employeeId) {
  try {
    const response = await apiClient.get(`/roles/user/employee/${employeeId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to find user'
    );
  }
}

/**
 * Assign a role to a user
 * @param {number} userId - User ID (optional if employeeId is provided)
 * @param {number} roleId - Role ID
 * @param {string} employeeId - Employee ID (optional if userId is provided)
 * @returns {Promise<Object>} Assignment information
 */
export async function assignRoleToUser(userId, roleId, employeeId = null) {
  try {
    const response = await apiClient.post('/roles/assign', {
      userId: userId || null,
      employeeId: employeeId || null,
      roleId
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to assign role'
    );
  }
}

/**
 * Get all roles assigned to a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} List of user roles
 */
export async function getUserRoles(userId) {
  try {
    const response = await apiClient.get(`/roles/user/${userId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to fetch user roles'
    );
  }
}

/**
 * Remove a role assignment from a user
 * @param {number} userId - User ID
 * @param {number} roleId - Role ID
 * @returns {Promise<Object>} Removal confirmation
 */
export async function removeRoleFromUser(userId, roleId) {
  try {
    const response = await apiClient.delete(`/roles/assign/${userId}/${roleId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to remove role'
    );
  }
}
