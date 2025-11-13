const { loginAdmin, getCurrentAdmin, loginUser, getCurrentUser } = require('../../src/controllers/auth.controller');
const { hashPassword } = require('../../src/utils/auth');

// Mock dependencies
jest.mock('../../src/utils/auth', () => {
  const actualAuth = jest.requireActual('../../src/utils/auth');
  return {
    ...actualAuth,
    comparePassword: jest.fn(),
    generateToken: jest.fn()
  };
});

const { comparePassword, generateToken } = require('../../src/utils/auth');

describe('Auth Controller', () => {
  let mockPool;
  let mockExecute;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock connection pool
    mockExecute = jest.fn();
    mockPool = {
      execute: mockExecute
    };

    // Setup default environment
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loginAdmin', () => {
    test('should successfully login with valid credentials', async () => {
      const hashedPassword = await hashPassword('admin123');
      const mockAdmin = {
        Admin_ID: 1,
        Username: 'admin',
        Password_Hash: hashedPassword,
        Email: 'admin@example.com',
        Full_Name: 'Admin User',
        Role: 'Admin'
      };
      const rolePermissions = {
        manage_roles: true,
        modules: ['Assets', 'Licenses']
      };

      mockExecute
        .mockResolvedValueOnce([[mockAdmin]]) // SELECT query
        .mockResolvedValueOnce([[{ Permissions: JSON.stringify(rolePermissions) }]]) // Role query
        .mockResolvedValueOnce([{}]); // UPDATE query

      comparePassword.mockResolvedValue(true);
      generateToken.mockReturnValue('mock-jwt-token');

      const result = await loginAdmin(mockPool, 'admin', 'admin123');

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-jwt-token');
      expect(result.admin.id).toBe(1);
      expect(result.admin.username).toBe('admin');
      expect(result.admin.email).toBe('admin@example.com');
      expect(result.admin.fullName).toBe('Admin User');
      expect(result.admin.role).toBe('Admin');
      expect(result.admin.modules).toEqual(['assets', 'licenses']);
      expect(result.admin.permissions).toEqual({ ...rolePermissions, modules: ['assets', 'licenses'] });
      expect(comparePassword).toHaveBeenCalledWith('admin123', hashedPassword);
      expect(generateToken).toHaveBeenCalledWith(
        { adminId: 1, username: 'admin', role: 'Admin' },
        'test-secret-key',
        '24h'
      );
    });

    test('should throw error if username is missing', async () => {
      await expect(loginAdmin(mockPool, '', 'password')).rejects.toThrow('Username and password are required');
      await expect(loginAdmin(mockPool, null, 'password')).rejects.toThrow('Username and password are required');
      await expect(loginAdmin(mockPool, undefined, 'password')).rejects.toThrow('Username and password are required');
    });

    test('should throw error if password is missing', async () => {
      await expect(loginAdmin(mockPool, 'admin', '')).rejects.toThrow('Username and password are required');
      await expect(loginAdmin(mockPool, 'admin', null)).rejects.toThrow('Username and password are required');
      await expect(loginAdmin(mockPool, 'admin', undefined)).rejects.toThrow('Username and password are required');
    });

    test('should throw error if username is not a string', async () => {
      await expect(loginAdmin(mockPool, 123, 'password')).rejects.toThrow('Username and password must be strings');
      await expect(loginAdmin(mockPool, {}, 'password')).rejects.toThrow('Username and password must be strings');
    });

    test('should throw error if password is not a string', async () => {
      await expect(loginAdmin(mockPool, 'admin', 123)).rejects.toThrow('Username and password must be strings');
      await expect(loginAdmin(mockPool, 'admin', {})).rejects.toThrow('Username and password must be strings');
    });

    test('should throw error if admin not found', async () => {
      mockExecute.mockResolvedValueOnce([[]]); // Empty result

      await expect(loginAdmin(mockPool, 'nonexistent', 'password')).rejects.toThrow('Invalid username or password');
    });

    test('should throw error if password is incorrect', async () => {
      const hashedPassword = await hashPassword('correctpassword');
      const mockAdmin = {
        Admin_ID: 1,
        Username: 'admin',
        Password_Hash: hashedPassword,
        Email: 'admin@example.com',
        Full_Name: 'Admin User',
        Role: 'Admin'
      };

      mockExecute.mockResolvedValueOnce([[mockAdmin]]);
      comparePassword.mockResolvedValue(false);

      await expect(loginAdmin(mockPool, 'admin', 'wrongpassword')).rejects.toThrow('Invalid username or password');
      expect(comparePassword).toHaveBeenCalledWith('wrongpassword', hashedPassword);
    });

    test('should update last login time', async () => {
      const hashedPassword = await hashPassword('admin123');
      const mockAdmin = {
        Admin_ID: 1,
        Username: 'admin',
        Password_Hash: hashedPassword,
        Email: 'admin@example.com',
        Full_Name: 'Admin User',
        Role: 'Admin'
      };
      const rolePermissions = { modules: ['assets'] };

      mockExecute
        .mockResolvedValueOnce([[mockAdmin]])
        .mockResolvedValueOnce([[{ Permissions: JSON.stringify(rolePermissions) }]])
        .mockResolvedValueOnce([{}]);

      comparePassword.mockResolvedValue(true);
      generateToken.mockReturnValue('mock-jwt-token');

      await loginAdmin(mockPool, 'admin', 'admin123');

      expect(mockExecute).toHaveBeenCalledTimes(3);
      expect(mockExecute).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE Admin SET Last_Login'),
        [1]
      );
    });

    test('should only return active admins', async () => {
      mockExecute.mockResolvedValueOnce([[]]); // No active admin found

      await expect(loginAdmin(mockPool, 'inactive', 'password')).rejects.toThrow('Invalid username or password');
      
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('Is_Active = 1'),
        ['inactive']
      );
    });
  });

  describe('getCurrentAdmin', () => {
    test('should return admin info for valid admin ID', async () => {
      const mockAdmin = {
        Admin_ID: 1,
        Username: 'admin',
        Email: 'admin@example.com',
        Full_Name: 'Admin User',
        Role: 'Admin'
      };
      const rolePermissions = {
        view_reports: true,
        modules: ['Reports']
      };

      mockExecute
        .mockResolvedValueOnce([[mockAdmin]])
        .mockResolvedValueOnce([[{ Permissions: JSON.stringify(rolePermissions) }]]);

      const result = await getCurrentAdmin(mockPool, 1);

      expect(result.authenticated).toBe(true);
      expect(result.admin.id).toBe(1);
      expect(result.admin.username).toBe('admin');
      expect(result.admin.email).toBe('admin@example.com');
      expect(result.admin.fullName).toBe('Admin User');
      expect(result.admin.role).toBe('Admin');
      expect(result.admin.modules).toEqual(['reports']);
      expect(result.admin.permissions).toEqual({ ...rolePermissions, modules: ['reports'] });
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
    });

    test('should throw error if admin ID is missing', async () => {
      await expect(getCurrentAdmin(mockPool, null)).rejects.toThrow('Valid admin ID is required');
      await expect(getCurrentAdmin(mockPool, undefined)).rejects.toThrow('Valid admin ID is required');
    });

    test('should throw error if admin ID is not a number', async () => {
      await expect(getCurrentAdmin(mockPool, '1')).rejects.toThrow('Valid admin ID is required');
      await expect(getCurrentAdmin(mockPool, {})).rejects.toThrow('Valid admin ID is required');
    });

    test('should throw error if admin not found', async () => {
      mockExecute.mockResolvedValueOnce([[]]);

      await expect(getCurrentAdmin(mockPool, 999)).rejects.toThrow('Admin not found');
    });

    test('should only return active admins', async () => {
      mockExecute.mockResolvedValueOnce([[]]);

      await expect(getCurrentAdmin(mockPool, 1)).rejects.toThrow('Admin not found');
      
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('Is_Active = 1'),
        [1]
      );
    });

    test('should not include password hash in response', async () => {
      const mockAdmin = {
        Admin_ID: 1,
        Username: 'admin',
        Email: 'admin@example.com',
        Full_Name: 'Admin User',
        Role: 'Admin'
      };
      const rolePermissions = { modules: ['assets'] };

      mockExecute
        .mockResolvedValueOnce([[mockAdmin]])
        .mockResolvedValueOnce([[{ Permissions: JSON.stringify(rolePermissions) }]]);

      const result = await getCurrentAdmin(mockPool, 1);

      expect(result.admin).not.toHaveProperty('Password_Hash');
      expect(result.admin).not.toHaveProperty('password');
      expect(result.admin.modules).toEqual(['assets']);
    });
  });

  describe('loginUser', () => {
    test('should successfully login user with valid credentials and roles', async () => {
      const hashedPassword = await hashPassword('employee123');
      const mockUser = {
        User_ID: 42,
        Username: 'employee',
        Password_Hash: hashedPassword,
        Email: 'employee@example.com',
        Full_Name: 'Employee User',
        Department: 'IT'
      };

      const rolePermissions = {
        modules: ['Assets', 'Reports'],
        view_reports: true
      };

      mockExecute
        .mockResolvedValueOnce([[mockUser]])
        .mockResolvedValueOnce([[{
          User_Role_ID: 5,
          Role_ID: 3,
          Role_Name: 'Employee',
          Permissions: JSON.stringify(rolePermissions)
        }]])
        .mockResolvedValueOnce([{}]);

      comparePassword.mockResolvedValue(true);
      generateToken.mockReturnValue('mock-user-token');

      const result = await loginUser(mockPool, 'employee', 'employee123');

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-user-token');
      expect(result.user.id).toBe(42);
      expect(result.user.username).toBe('employee');
      expect(result.user.fullName).toBe('Employee User');
      expect(result.user.modules).toEqual(['assets', 'reports']);
      expect(result.user.permissions).toEqual({ ...rolePermissions, modules: ['assets', 'reports'] });
      expect(result.user.roles).toEqual([{ id: 3, name: 'Employee' }]);
    });

    test('should throw error when credentials are invalid', async () => {
      mockExecute.mockResolvedValueOnce([[]]);

      await expect(loginUser(mockPool, 'ghost', 'password')).rejects.toThrow('Invalid username or password');
    });
  });

  describe('getCurrentUser', () => {
    test('should return user profile with modules and roles', async () => {
      const mockUser = {
        User_ID: 7,
        Username: 'technician',
        Email: 'tech@example.com',
        Full_Name: 'Tech User',
        Department: 'Operations'
      };

      const rolePermissions = {
        modules: ['Assets'],
        manage_infrastructure: true
      };

      mockExecute
        .mockResolvedValueOnce([[mockUser]])
        .mockResolvedValueOnce([[{
          User_Role_ID: 9,
          Role_ID: 4,
          Role_Name: 'Technician',
          Permissions: JSON.stringify(rolePermissions)
        }]]);

      const result = await getCurrentUser(mockPool, 7);

      expect(result.authenticated).toBe(true);
      expect(result.user.id).toBe(7);
      expect(result.user.username).toBe('technician');
      expect(result.user.modules).toEqual(['assets']);
      expect(result.user.roles).toEqual([{ id: 4, name: 'Technician' }]);
    });

    test('should throw error if user ID is invalid', async () => {
      await expect(getCurrentUser(mockPool, null)).rejects.toThrow('Valid user ID is required');
      await expect(getCurrentUser(mockPool, '1')).rejects.toThrow('Valid user ID is required');
    });
  });
});

