const {
  registerEmployee,
  loginEmployee,
  getCurrentEmployee
} = require('../../src/controllers/employee.controller');

jest.mock('../../src/utils/auth', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password'),
  comparePassword: jest.fn().mockResolvedValue(true),
  generateToken: jest.fn().mockReturnValue('test_token')
}));

describe('Employee Controller', () => {
  let mockPool;
  let mockExecute;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute = jest.fn();
    mockPool = { execute: mockExecute };
  });

  describe('registerEmployee', () => {
    test('should register employee successfully', async () => {
      const mockUser = {
        User_ID: 1,
        Username: 'testuser',
        Email: 'test@example.com',
        Full_Name: 'Test User',
        Employee_ID: 'EMP001',
        Department: 'IT'
      };

      mockExecute
        .mockResolvedValueOnce([[]]) // Username doesn't exist
        .mockResolvedValueOnce([[]]) // Email doesn't exist
        .mockResolvedValueOnce([{ insertId: 1 }]) // Insert user
        .mockResolvedValueOnce([[mockUser]]); // Get created user

      const result = await registerEmployee(
        mockPool,
        'testuser',
        'test@example.com',
        'password123',
        'Test User',
        'EMP001',
        'IT'
      );

      expect(result.success).toBe(true);
      expect(result.user.username).toBe('testuser');
      expect(result.user.email).toBe('test@example.com');
    });

    test('should throw error if username already exists', async () => {
      mockExecute.mockResolvedValueOnce([[{ User_ID: 1 }]]); // Username exists

      await expect(
        registerEmployee(mockPool, 'existing', 'test@example.com', 'password', 'Test User')
      ).rejects.toThrow('Username already exists');
    });

    test('should throw error if email already exists', async () => {
      mockExecute
        .mockResolvedValueOnce([[]]) // Username doesn't exist
        .mockResolvedValueOnce([[{ User_ID: 1 }]]); // Email exists

      await expect(
        registerEmployee(mockPool, 'testuser', 'existing@example.com', 'password', 'Test User')
      ).rejects.toThrow('Email already exists');
    });

    test('should throw error if required fields are missing', async () => {
      await expect(
        registerEmployee(mockPool, '', 'test@example.com', 'password', 'Test User')
      ).rejects.toThrow('required');
    });
  });

  describe('loginEmployee', () => {
    test('should login employee successfully', async () => {
      const mockUser = {
        User_ID: 1,
        Username: 'testuser',
        Password_Hash: 'hashed_password',
        Email: 'test@example.com',
        Full_Name: 'Test User',
        Employee_ID: 'EMP001',
        Department: 'IT'
      };

      mockExecute
        .mockResolvedValueOnce([[mockUser]]) // User exists
        .mockResolvedValueOnce([{}]); // Update last login

      const result = await loginEmployee(mockPool, 'testuser', 'password123');

      expect(result.success).toBe(true);
      expect(result.token).toBe('test_token');
      expect(result.user.username).toBe('testuser');
    });

    test('should throw error if user not found', async () => {
      mockExecute.mockResolvedValueOnce([[]]); // User doesn't exist

      await expect(
        loginEmployee(mockPool, 'nonexistent', 'password')
      ).rejects.toThrow('Invalid username or password');
    });

    test('should throw error if password is invalid', async () => {
      const { comparePassword } = require('../../src/utils/auth');
      comparePassword.mockResolvedValueOnce(false);

      const mockUser = {
        User_ID: 1,
        Username: 'testuser',
        Password_Hash: 'hashed_password',
        Email: 'test@example.com',
        Full_Name: 'Test User'
      };

      mockExecute.mockResolvedValueOnce([[mockUser]]);

      await expect(
        loginEmployee(mockPool, 'testuser', 'wrongpassword')
      ).rejects.toThrow('Invalid username or password');
    });
  });

  describe('getCurrentEmployee', () => {
    test('should return current employee info', async () => {
      const mockUser = {
        User_ID: 1,
        Username: 'testuser',
        Email: 'test@example.com',
        Full_Name: 'Test User',
        Employee_ID: 'EMP001',
        Department: 'IT'
      };

      mockExecute.mockResolvedValueOnce([[mockUser]]);

      const result = await getCurrentEmployee(mockPool, 1);

      expect(result.authenticated).toBe(true);
      expect(result.user.username).toBe('testuser');
    });

    test('should throw error if user not found', async () => {
      mockExecute.mockResolvedValueOnce([[]]);

      await expect(getCurrentEmployee(mockPool, 999)).rejects.toThrow('User not found');
    });

    test('should throw error if user ID is invalid', async () => {
      await expect(getCurrentEmployee(mockPool, null)).rejects.toThrow('Valid user ID is required');
    });
  });
});

