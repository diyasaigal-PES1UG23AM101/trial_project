const {
  getUserModules,
  getAdminModules
} = require('../../src/controllers/module.controller');

describe('Module Controller', () => {
  let mockPool;
  let mockExecute;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute = jest.fn();
    mockPool = { execute: mockExecute };
  });

  describe('getUserModules', () => {
    test('should return accessible modules for user', async () => {
      const mockRoles = [
        {
          Permissions: JSON.stringify({
            modules: ['assets', 'licenses'],
            manage_infrastructure: true
          })
        }
      ];

      mockExecute.mockResolvedValueOnce([mockRoles]);

      const result = await getUserModules(mockPool, 1);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(1);
      expect(result.modules).toContain('assets');
      expect(result.modules).toContain('licenses');
      expect(result.modules).toHaveLength(2);
    });

    test('should return empty modules if no roles', async () => {
      mockExecute.mockResolvedValueOnce([[]]);

      const result = await getUserModules(mockPool, 1);

      expect(result.success).toBe(true);
      expect(result.modules).toHaveLength(0);
    });

    test('should throw error if user ID is invalid', async () => {
      await expect(getUserModules(mockPool, null)).rejects.toThrow('Valid user ID is required');
    });
  });

  describe('getAdminModules', () => {
    test('should return all modules for Super Admin', async () => {
      const mockAdmin = { Role: 'Super Admin' };

      mockExecute.mockResolvedValueOnce([[mockAdmin]]);

      const result = await getAdminModules(mockPool, 1);

      expect(result.success).toBe(true);
      expect(result.adminId).toBe(1);
      expect(result.modules).toContain('assets');
      expect(result.modules).toContain('licenses');
      expect(result.modules).toContain('users');
      expect(result.modules.length).toBeGreaterThan(0);
    });

    test('should return all modules for Admin', async () => {
      const mockAdmin = { Role: 'Admin' };

      mockExecute.mockResolvedValueOnce([[mockAdmin]]);

      const result = await getAdminModules(mockPool, 1);

      expect(result.success).toBe(true);
      expect(result.modules.length).toBeGreaterThan(0);
    });

    test('should return limited modules for Operator', async () => {
      const mockAdmin = { Role: 'Operator' };

      mockExecute.mockResolvedValueOnce([[mockAdmin]]);

      const result = await getAdminModules(mockPool, 1);

      expect(result.success).toBe(true);
      expect(result.modules).toContain('assets');
      expect(result.modules).toContain('reports');
      expect(result.modules.length).toBe(2);
    });

    test('should throw error if admin not found', async () => {
      mockExecute.mockResolvedValueOnce([[]]);

      await expect(getAdminModules(mockPool, 999)).rejects.toThrow('Admin not found');
    });

    test('should throw error if admin ID is invalid', async () => {
      await expect(getAdminModules(mockPool, null)).rejects.toThrow('Valid admin ID is required');
    });
  });
});

