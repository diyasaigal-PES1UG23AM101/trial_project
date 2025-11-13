/**
 * Get accessible modules for a user based on their roles
 * @param {Object} pool - MySQL connection pool
 * @param {number} userId - User ID
 * @returns {Promise<Object>} List of accessible modules
 */
async function getUserModules(pool, userId) {
  if (!userId || typeof userId !== 'number') {
    throw new Error('Valid user ID is required');
  }

  // Get all active roles for the user
  const [roleRows] = await pool.execute(
    `SELECT r.Permissions
     FROM User_Role ur
     INNER JOIN Role r ON ur.Role_ID = r.Role_ID
     WHERE ur.User_ID = ? AND ur.Is_Active = 1 AND r.Is_Active = 1`,
    [userId]
  );

  // Collect all modules from all roles
  const allModules = new Set();
  const allPermissions = {};

  for (const row of roleRows) {
    const permissions = typeof row.Permissions === 'string' 
      ? JSON.parse(row.Permissions) 
      : row.Permissions;

    // Extract modules if they exist
    if (permissions.modules && Array.isArray(permissions.modules)) {
      permissions.modules.forEach(module => allModules.add(module));
    }

    // Merge other permissions
    Object.keys(permissions).forEach(key => {
      if (key !== 'modules') {
        allPermissions[key] = allPermissions[key] || permissions[key];
      }
    });
  }

  // If no modules specified, return empty array (restricted access)
  const modules = Array.from(allModules);

  return {
    success: true,
    userId,
    modules,
    permissions: allPermissions,
    count: modules.length
  };
}

/**
 * Get accessible modules for admin based on their admin role
 * @param {Object} pool - MySQL connection pool
 * @param {number} adminId - Admin ID
 * @returns {Promise<Object>} List of accessible modules
 */
async function getAdminModules(pool, adminId) {
  if (!adminId || typeof adminId !== 'number') {
    throw new Error('Valid admin ID is required');
  }

  // Get admin info
  const [adminRows] = await pool.execute(
    'SELECT Role FROM Admin WHERE Admin_ID = ? AND Is_Active = 1',
    [adminId]
  );

  if (adminRows.length === 0) {
    throw new Error('Admin not found');
  }

  const adminRole = adminRows[0].Role;

  // Super Admin and Admin have access to all modules
  if (adminRole === 'Super Admin' || adminRole === 'Admin') {
    return {
      success: true,
      adminId,
      modules: ['assets', 'licenses', 'users', 'roles', 'reports', 'settings'],
      permissions: {
        manage_users: true,
        manage_roles: true,
        manage_infrastructure: true,
        view_reports: true,
        manage_settings: true
      },
      count: 6
    };
  }

  // Operator has limited access
  return {
    success: true,
    adminId,
    modules: ['assets', 'reports'],
    permissions: {
      manage_users: false,
      manage_roles: false,
      manage_infrastructure: true,
      view_reports: true,
      manage_settings: false
    },
    count: 2
  };
}

module.exports = {
  getUserModules,
  getAdminModules
};

