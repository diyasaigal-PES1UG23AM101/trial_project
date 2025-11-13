const { generateToken, comparePassword, hashPassword } = require('../utils/auth');

/**
 * Register a new employee
 * @param {Object} pool - MySQL connection pool
 * @param {string} username - Employee username
 * @param {string} email - Employee email
 * @param {string} password - Plain text password
 * @param {string} fullName - Employee full name
 * @param {string} employeeId - Employee ID
 * @param {string} department - Department name
 * @returns {Promise<Object>} Registration response
 */
async function registerEmployee(pool, username, email, password, fullName, employeeId, department) {
  // Validation
  if (!username || !email || !password || !fullName) {
    throw new Error('Username, email, password, and full name are required');
  }

  if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw new Error('Username, email, and password must be strings');
  }

  // Check if username already exists
  const [existingUsername] = await pool.execute(
    'SELECT User_ID FROM User WHERE Username = ?',
    [username]
  );

  if (existingUsername.length > 0) {
    throw new Error('Username already exists');
  }

  // Check if email already exists
  const [existingEmail] = await pool.execute(
    'SELECT User_ID FROM User WHERE Email = ?',
    [email]
  );

  if (existingEmail.length > 0) {
    throw new Error('Email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Insert new employee
  const [result] = await pool.execute(
    'INSERT INTO User (Username, Email, Password_Hash, Full_Name, Employee_ID, Department, Is_Active) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [username, email, passwordHash, fullName, employeeId || null, department || null, 1]
  );

  // Get created user
  const [rows] = await pool.execute(
    'SELECT User_ID, Username, Email, Full_Name, Employee_ID, Department FROM User WHERE User_ID = ?',
    [result.insertId]
  );

  return {
    success: true,
    message: 'Employee registered successfully',
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
 * Login employee
 * @param {Object} pool - MySQL connection pool
 * @param {string} username - Employee username
 * @param {string} password - Plain text password
 * @returns {Promise<Object>} Login response with token
 */
async function loginEmployee(pool, username, password) {
  // Validation
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    throw new Error('Username and password must be strings');
  }

  // Get user from database
  const [rows] = await pool.execute(
    'SELECT User_ID, Username, Password_Hash, Email, Full_Name, Employee_ID, Department FROM User WHERE Username = ? AND Is_Active = 1',
    [username]
  );

  if (rows.length === 0) {
    throw new Error('Invalid username or password');
  }

  const user = rows[0];

  // Verify password
  const isValidPassword = await comparePassword(password, user.Password_Hash);
  if (!isValidPassword) {
    throw new Error('Invalid username or password');
  }

  // Generate JWT token
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  const token = generateToken(
    {
      userId: user.User_ID,
      username: user.Username,
      userType: 'employee'
    },
    JWT_SECRET,
    '24h'
  );

  // Update last login time
  pool.execute(
    'UPDATE User SET Last_Login = NOW() WHERE User_ID = ?',
    [user.User_ID]
  ).catch(err => console.error('Error updating last login:', err));

  // Return user info (without password)
  return {
    success: true,
    token: token,
    user: {
      id: user.User_ID,
      username: user.Username,
      email: user.Email,
      fullName: user.Full_Name,
      employeeId: user.Employee_ID,
      department: user.Department
    }
  };
}

/**
 * Get current employee info
 * @param {Object} pool - MySQL connection pool
 * @param {number} userId - User ID from token
 * @returns {Promise<Object>} User information
 */
async function getCurrentEmployee(pool, userId) {
  if (!userId || typeof userId !== 'number') {
    throw new Error('Valid user ID is required');
  }

  const [rows] = await pool.execute(
    'SELECT User_ID, Username, Email, Full_Name, Employee_ID, Department FROM User WHERE User_ID = ? AND Is_Active = 1',
    [userId]
  );

  if (rows.length === 0) {
    throw new Error('User not found');
  }

  return {
    authenticated: true,
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

module.exports = {
  registerEmployee,
  loginEmployee,
  getCurrentEmployee
};

