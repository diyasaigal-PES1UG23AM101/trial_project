const { generateToken, comparePassword } = require('../utils/auth');
const DEFAULT_MODULES = ['assets', 'licenses', 'monitoring', 'reports', 'roles'];
const DEFAULT_EMPLOYEE_MODULES = ['assets'];

function mergePermissions(permissionObjects = []) {
  if (!Array.isArray(permissionObjects) || permissionObjects.length === 0) {
    return null;
  }

  return permissionObjects.reduce((acc, current) => {
    if (typeof current !== 'object' || current === null) {
      return acc;
    }

    return Object.keys(current).reduce((merged, key) => {
      const value = current[key];

      if (Array.isArray(value)) {
        const existing = Array.isArray(merged[key]) ? merged[key] : [];
        merged[key] = [...new Set([...existing, ...value])];
      } else if (typeof value === 'boolean') {
        merged[key] = Boolean(merged[key]) || value;
      } else if (value !== undefined) {
        merged[key] = value;
      }

      return merged;
    }, acc);
  }, {});
}

async function getUserAccessDetails(pool, userId) {
  if (!pool || !userId) {
    return {
      roles: [],
      permissions: null,
      modules: null
    };
  }

  try {
    const [roleRows] = await pool.execute(
      `SELECT ur.User_Role_ID, r.Role_ID, r.Role_Name, r.Permissions
       FROM User_Role ur
       INNER JOIN Role r ON ur.Role_ID = r.Role_ID
       WHERE ur.User_ID = ? AND ur.Is_Active = 1 AND r.Is_Active = 1
       ORDER BY ur.Assigned_At DESC`,
      [userId]
    );

    if (!roleRows || roleRows.length === 0) {
      return {
        roles: [],
        permissions: null,
        modules: null
      };
    }

    const parsedPermissions = roleRows
      .map((row) => {
        if (!row?.Permissions) {
          return null;
        }
        if (typeof row.Permissions === 'string') {
          try {
            return JSON.parse(row.Permissions);
          } catch (error) {
            console.error('Failed to parse role permissions JSON:', error);
            return null;
          }
        }
        return row.Permissions;
      })
      .filter(Boolean);

    const mergedPermissions = mergePermissions(parsedPermissions);
    const moduleSet = new Set();

    parsedPermissions.forEach((permissions) => {
      if (Array.isArray(permissions?.modules)) {
        permissions.modules
          .filter((module) => typeof module === 'string')
          .map((module) => module.trim().toLowerCase())
          .filter(Boolean)
          .forEach((module) => moduleSet.add(module));
      }
    });

    return {
      roles: roleRows.map((row) => ({
        id: row.Role_ID,
        name: row.Role_Name
      })),
      permissions: mergedPermissions,
      modules: moduleSet.size > 0 ? [...moduleSet] : null
    };
  } catch (error) {
    console.error('Error fetching user access details:', error);
    return {
      roles: [],
      permissions: null,
      modules: null
    };
  }
}

async function getRoleDetails(pool, roleName) {
  if (!pool || !roleName || typeof roleName !== 'string') {
    return { permissions: null, modules: null };
  }

  try {
    const [roleRows] = await pool.execute(
      'SELECT Permissions FROM Role WHERE Role_Name = ? AND Is_Active = 1',
      [roleName]
    );

    if (!roleRows || roleRows.length === 0) {
      return { permissions: null, modules: null };
    }

    const rawPermissions = roleRows[0].Permissions;
    const parsedPermissions = typeof rawPermissions === 'string'
      ? JSON.parse(rawPermissions)
      : rawPermissions || null;

    const modules = Array.isArray(parsedPermissions?.modules)
      ? [...new Set(parsedPermissions.modules
          .filter((module) => typeof module === 'string')
          .map((module) => module.trim().toLowerCase())
          .filter(Boolean))]
      : null;

    return {
      permissions: parsedPermissions,
      modules
    };
  } catch (error) {
    console.error('Error fetching role details:', error);
    return { permissions: null, modules: null };
  }
}

/**
 * Login controller - authenticates admin user
 * @param {Object} pool - MySQL connection pool
 * @param {string} username - Admin username
 * @param {string} password - Plain text password
 * @returns {Promise<Object>} Login response with token and admin info
 * @throws {Error} If credentials are invalid
 */
async function loginAdmin(pool, username, password) {
  // Validation
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    throw new Error('Username and password must be strings');
  }

  // Get admin from database
  const [rows] = await pool.execute(
    'SELECT Admin_ID, Username, Password_Hash, Email, Full_Name, Role FROM Admin WHERE Username = ? AND Is_Active = 1',
    [username]
  );

  if (rows.length === 0) {
    throw new Error('Invalid username or password');
  }

  const admin = rows[0];

  // Verify password
  const isValidPassword = await comparePassword(password, admin.Password_Hash);
  if (!isValidPassword) {
    throw new Error('Invalid username or password');
  }

  const { permissions, modules } = await getRoleDetails(pool, admin.Role);
  const assignedModules = Array.isArray(modules) && modules.length > 0 ? modules : DEFAULT_MODULES;
  const permissionsWithModules = permissions
    ? { ...permissions, modules: assignedModules }
    : null;

  // Generate JWT token
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  const token = generateToken(
    {
      adminId: admin.Admin_ID,
      username: admin.Username,
      role: admin.Role
    },
    JWT_SECRET,
    '24h'
  );

  // Update last login time (don't wait for it to complete)
  pool.execute(
    'UPDATE Admin SET Last_Login = NOW() WHERE Admin_ID = ?',
    [admin.Admin_ID]
  ).catch(err => console.error('Error updating last login:', err));

  // Return admin info (without password)
  return {
    success: true,
    token: token,
    admin: {
      id: admin.Admin_ID,
      username: admin.Username,
      email: admin.Email,
      fullName: admin.Full_Name,
      role: admin.Role,
      permissions: permissionsWithModules,
      modules: assignedModules
    }
  };
}

/**
 * Verify token and get current admin info
 * @param {Object} pool - MySQL connection pool
 * @param {number} adminId - Admin ID from token
 * @returns {Promise<Object>} Admin information
 * @throws {Error} If admin not found
 */
async function getCurrentAdmin(pool, adminId) {
  if (!adminId || typeof adminId !== 'number') {
    throw new Error('Valid admin ID is required');
  }

  const [rows] = await pool.execute(
    'SELECT Admin_ID, Username, Email, Full_Name, Role FROM Admin WHERE Admin_ID = ? AND Is_Active = 1',
    [adminId]
  );

  if (rows.length === 0) {
    throw new Error('Admin not found');
  }

  const { permissions, modules } = await getRoleDetails(pool, rows[0].Role);
  const assignedModules = Array.isArray(modules) && modules.length > 0 ? modules : DEFAULT_MODULES;
  const permissionsWithModules = permissions
    ? { ...permissions, modules: assignedModules }
    : null;

  return {
    authenticated: true,
    admin: {
      id: rows[0].Admin_ID,
      username: rows[0].Username,
      email: rows[0].Email,
      fullName: rows[0].Full_Name,
      role: rows[0].Role,
      permissions: permissionsWithModules,
      modules: assignedModules
    }
  };
}

async function loginUser(pool, username, password) {
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    throw new Error('Username and password must be strings');
  }

  const [rows] = await pool.execute(
    `SELECT User_ID, Username, Password_Hash, Email, Full_Name, Department
     FROM User
     WHERE Username = ? AND Is_Active = 1`,
    [username]
  );

  if (!rows || rows.length === 0) {
    throw new Error('Invalid username or password');
  }

  const user = rows[0];
  const isValidPassword = await comparePassword(password, user.Password_Hash);
  if (!isValidPassword) {
    throw new Error('Invalid username or password');
  }

  const { roles, permissions, modules } = await getUserAccessDetails(pool, user.User_ID);
  const assignedModules = Array.isArray(modules) && modules.length > 0 ? modules : DEFAULT_EMPLOYEE_MODULES;
  const permissionsWithModules = permissions
    ? { ...permissions, modules: assignedModules }
    : null;

  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  const token = generateToken(
    {
      userId: user.User_ID,
      username: user.Username,
      fullName: user.Full_Name,
      department: user.Department,
      roles: roles.map((role) => role.name)
    },
    JWT_SECRET,
    '24h'
  );

  pool.execute(
    'UPDATE User SET Last_Login = NOW() WHERE User_ID = ?',
    [user.User_ID]
  ).catch((error) => console.error('Error updating user last login:', error));

  return {
    success: true,
    token,
    user: {
      id: user.User_ID,
      username: user.Username,
      email: user.Email,
      fullName: user.Full_Name,
      department: user.Department,
      roles,
      permissions: permissionsWithModules,
      modules: assignedModules
    }
  };
}

async function getCurrentUser(pool, userId) {
  if (!userId || typeof userId !== 'number') {
    throw new Error('Valid user ID is required');
  }

  const [rows] = await pool.execute(
    `SELECT User_ID, Username, Email, Full_Name, Department
     FROM User
     WHERE User_ID = ? AND Is_Active = 1`,
    [userId]
  );

  if (!rows || rows.length === 0) {
    throw new Error('User not found');
  }

  const user = rows[0];
  const { roles, permissions, modules } = await getUserAccessDetails(pool, user.User_ID);
  const assignedModules = Array.isArray(modules) && modules.length > 0 ? modules : DEFAULT_EMPLOYEE_MODULES;
  const permissionsWithModules = permissions
    ? { ...permissions, modules: assignedModules }
    : null;

  return {
    authenticated: true,
    user: {
      id: user.User_ID,
      username: user.Username,
      email: user.Email,
      fullName: user.Full_Name,
      department: user.Department,
      roles,
      permissions: permissionsWithModules,
      modules: assignedModules
    }
  };
}

module.exports = {
  loginAdmin,
  getCurrentAdmin,
  loginUser,
  getCurrentUser
};

