/**
 * Create a new role
 * @param {Object} pool - MySQL connection pool
 * @param {string} roleName - Name of the role
 * @param {string} description - Description of the role
 * @param {Object} permissions - Permissions object
 * @returns {Promise<Object>} Created role information
 * @throws {Error} If role name is invalid or already exists
 */
async function createRole(pool, roleName, description, permissions = {}) {
  // Validation
  if (!roleName || typeof roleName !== 'string' || roleName.trim().length === 0) {
    throw new Error('Role name is required');
  }

  if (roleName.length > 50) {
    throw new Error('Role name must be 50 characters or less');
  }

  // Check if role already exists
  const [existing] = await pool.execute(
    'SELECT Role_ID FROM Role WHERE Role_Name = ?',
    [roleName.trim()]
  );

  if (existing.length > 0) {
    throw new Error('Role with this name already exists');
  }

  // Validate permissions object
  if (typeof permissions !== 'object' || Array.isArray(permissions)) {
    throw new Error('Permissions must be an object');
  }

  // Insert new role
  const [result] = await pool.execute(
    'INSERT INTO Role (Role_Name, Description, Permissions, Is_Active) VALUES (?, ?, ?, ?)',
    [roleName.trim(), description || null, JSON.stringify(permissions), 1]
  );

  // Get created role
  const [rows] = await pool.execute(
    'SELECT Role_ID, Role_Name, Description, Permissions, Is_Active, Created_At FROM Role WHERE Role_ID = ?',
    [result.insertId]
  );

  return {
    success: true,
    role: {
      id: rows[0].Role_ID,
      name: rows[0].Role_Name,
      description: rows[0].Description,
      permissions: typeof rows[0].Permissions === 'string' 
        ? JSON.parse(rows[0].Permissions) 
        : rows[0].Permissions,
      isActive: rows[0].Is_Active,
      createdAt: rows[0].Created_At
    }
  };
}

/**
 * Get all roles
 * @param {Object} pool - MySQL connection pool
 * @param {boolean} includeInactive - Include inactive roles
 * @returns {Promise<Object>} List of roles
 */
async function getAllRoles(pool, includeInactive = false) {
  let query = 'SELECT Role_ID, Role_Name, Description, Permissions, Is_Active, Created_At FROM Role';
  const params = [];

  if (!includeInactive) {
    query += ' WHERE Is_Active = 1';
  }

  query += ' ORDER BY Role_Name';

  const [rows] = await pool.execute(query, params);

  const roles = rows.map(row => ({
    id: row.Role_ID,
    name: row.Role_Name,
    description: row.Description,
    permissions: typeof row.Permissions === 'string' 
      ? JSON.parse(row.Permissions) 
      : row.Permissions,
    isActive: row.Is_Active,
    createdAt: row.Created_At
  }));

  return {
    success: true,
    roles,
    count: roles.length
  };
}

/**
 * Get a single role by ID
 * @param {Object} pool - MySQL connection pool
 * @param {number} roleId - Role ID
 * @returns {Promise<Object>} Role information
 * @throws {Error} If role not found
 */
async function getRoleById(pool, roleId) {
  if (!roleId || typeof roleId !== 'number') {
    throw new Error('Valid role ID is required');
  }

  const [rows] = await pool.execute(
    'SELECT Role_ID, Role_Name, Description, Permissions, Is_Active, Created_At FROM Role WHERE Role_ID = ?',
    [roleId]
  );

  if (rows.length === 0) {
    throw new Error('Role not found');
  }

  return {
    success: true,
    role: {
      id: rows[0].Role_ID,
      name: rows[0].Role_Name,
      description: rows[0].Description,
      permissions: typeof rows[0].Permissions === 'string' 
        ? JSON.parse(rows[0].Permissions) 
        : rows[0].Permissions,
      isActive: rows[0].Is_Active,
      createdAt: rows[0].Created_At
    }
  };
}

/**
 * Find user by employee ID
 * @param {Object} pool - MySQL connection pool
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Object>} User information
 * @throws {Error} If user not found
 */
async function findUserByEmployeeId(pool, employeeId) {
  if (!employeeId || typeof employeeId !== 'string') {
    throw new Error('Valid employee ID is required');
  }

  const [rows] = await pool.execute(
    'SELECT User_ID, Username, Email, Full_Name, Employee_ID, Department FROM User WHERE Employee_ID = ? AND Is_Active = 1',
    [employeeId]
  );

  if (rows.length === 0) {
    throw new Error('User not found with the provided employee ID');
  }

  return {
    success: true,
    user: {
      id: rows[0].User_ID,
      username: rows[0].Username,
      email: rows[0].Email,
      fullName: rows[0].Full_Name,
      employeeId: rows[0].Employee_ID,
      department: rows[0].Department
    }
  };
}

/**
 * Assign a role to a user
 * @param {Object} pool - MySQL connection pool
 * @param {number} userId - User ID
 * @param {number} roleId - Role ID
 * @param {number} assignedBy - Admin ID who is assigning the role
 * @returns {Promise<Object>} Assignment information
 * @throws {Error} If user or role not found, or assignment already exists
 */
async function assignRoleToUser(pool, userId, roleId, assignedBy) {
  // Validation
  if (!userId || typeof userId !== 'number') {
    throw new Error('Valid user ID is required');
  }

  if (!roleId || typeof roleId !== 'number') {
    throw new Error('Valid role ID is required');
  }

  if (!assignedBy || typeof assignedBy !== 'number') {
    throw new Error('Valid admin ID is required');
  }

  // Check if user exists
  const [userRows] = await pool.execute(
    'SELECT User_ID, Username, Full_Name FROM User WHERE User_ID = ? AND Is_Active = 1',
    [userId]
  );

  if (userRows.length === 0) {
    throw new Error('User not found or inactive');
  }

  // Check if role exists
  const [roleRows] = await pool.execute(
    'SELECT Role_ID, Role_Name FROM Role WHERE Role_ID = ? AND Is_Active = 1',
    [roleId]
  );

  if (roleRows.length === 0) {
    throw new Error('Role not found or inactive');
  }

  // Check if assignment already exists
  const [existing] = await pool.execute(
    'SELECT User_Role_ID FROM User_Role WHERE User_ID = ? AND Role_ID = ?',
    [userId, roleId]
  );

  if (existing.length > 0) {
    // Update existing assignment to active
    await pool.execute(
      'UPDATE User_Role SET Is_Active = 1, Assigned_By = ?, Assigned_At = NOW() WHERE User_ID = ? AND Role_ID = ?',
      [assignedBy, userId, roleId]
    );

    const [updated] = await pool.execute(
      'SELECT User_Role_ID, User_ID, Role_ID, Assigned_By, Assigned_At FROM User_Role WHERE User_ID = ? AND Role_ID = ?',
      [userId, roleId]
    );

    return {
      success: true,
      message: 'Role assignment updated',
      assignment: {
        id: updated[0].User_Role_ID,
        userId: updated[0].User_ID,
        roleId: updated[0].Role_ID,
        assignedBy: updated[0].Assigned_By,
        assignedAt: updated[0].Assigned_At
      }
    };
  }

  // Create new assignment
  const [result] = await pool.execute(
    'INSERT INTO User_Role (User_ID, Role_ID, Assigned_By, Is_Active) VALUES (?, ?, ?, ?)',
    [userId, roleId, assignedBy, 1]
  );

  const [rows] = await pool.execute(
    'SELECT User_Role_ID, User_ID, Role_ID, Assigned_By, Assigned_At FROM User_Role WHERE User_Role_ID = ?',
    [result.insertId]
  );

  return {
    success: true,
    message: 'Role assigned successfully',
    assignment: {
      id: rows[0].User_Role_ID,
      userId: rows[0].User_ID,
      roleId: rows[0].Role_ID,
      assignedBy: rows[0].Assigned_By,
      assignedAt: rows[0].Assigned_At
    }
  };
}

/**
 * Get all roles assigned to a user
 * @param {Object} pool - MySQL connection pool
 * @param {number} userId - User ID
 * @returns {Promise<Object>} List of user roles
 */
async function getUserRoles(pool, userId) {
  if (!userId || typeof userId !== 'number') {
    throw new Error('Valid user ID is required');
  }

  const [rows] = await pool.execute(
    `SELECT ur.User_Role_ID, ur.User_ID, ur.Role_ID, ur.Assigned_By, ur.Assigned_At,
            r.Role_Name, r.Description, r.Permissions
     FROM User_Role ur
     INNER JOIN Role r ON ur.Role_ID = r.Role_ID
     WHERE ur.User_ID = ? AND ur.Is_Active = 1 AND r.Is_Active = 1
     ORDER BY ur.Assigned_At DESC`,
    [userId]
  );

  const roles = rows.map(row => ({
    assignmentId: row.User_Role_ID,
    roleId: row.Role_ID,
    roleName: row.Role_Name,
    description: row.Description,
    permissions: typeof row.Permissions === 'string' 
      ? JSON.parse(row.Permissions) 
      : row.Permissions,
    assignedBy: row.Assigned_By,
    assignedAt: row.Assigned_At
  }));

  return {
    success: true,
    userId,
    roles,
    count: roles.length
  };
}

/**
 * Remove a role assignment from a user
 * @param {Object} pool - MySQL connection pool
 * @param {number} userId - User ID
 * @param {number} roleId - Role ID
 * @returns {Promise<Object>} Removal confirmation
 * @throws {Error} If assignment not found
 */
async function removeRoleFromUser(pool, userId, roleId) {
  if (!userId || typeof userId !== 'number') {
    throw new Error('Valid user ID is required');
  }

  if (!roleId || typeof roleId !== 'number') {
    throw new Error('Valid role ID is required');
  }

  // Check if assignment exists
  const [existing] = await pool.execute(
    'SELECT User_Role_ID FROM User_Role WHERE User_ID = ? AND Role_ID = ? AND Is_Active = 1',
    [userId, roleId]
  );

  if (existing.length === 0) {
    throw new Error('Role assignment not found');
  }

  // Soft delete (set Is_Active = 0)
  await pool.execute(
    'UPDATE User_Role SET Is_Active = 0 WHERE User_ID = ? AND Role_ID = ?',
    [userId, roleId]
  );

  return {
    success: true,
    message: 'Role removed from user successfully'
  };
}

module.exports = {
  createRole,
  getAllRoles,
  getRoleById,
  findUserByEmployeeId,
  assignRoleToUser,
  getUserRoles,
  removeRoleFromUser
};
