const {
  createRole,
  getAllRoles,
  getRoleById,
  assignRoleToUser,
  getUserRoles,
  removeRoleFromUser
} = require('../../src/controllers/role.controller');

describe('Role Controller', () => {
  let mockPool;
  let mockExecute;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute = jest.fn();
    mockPool = { execute: mockExecute };
  });

  describe('createRole', () => {
    test('should create a role successfully', async () => {
      const mockRole = {
        Role_ID: 1,
        Role_Name: 'Test Role',
        Description: 'Test Description',
        Permissions: JSON.stringify({ manage_users: true }),
        Is_Active: 1,
        Created_At: new Date()
      };

      mockExecute
        .mockResolvedValueOnce([[]]) // Role doesn't exist
        .mockResolvedValueOnce([{ insertId: 1 }]) // Insert
        .mockResolvedValueOnce([[mockRole]]); // Get created

      const result = await createRole(mockPool, 'Test Role', 'Test Description', { manage_users: true });

      expect(result.success).toBe(true);
      expect(result.role.name).toBe('Test Role');
      expect(result.role.permissions).toEqual({ manage_users: true });
    });

    test('should throw error if role name is missing', async () => {
      await expect(createRole(mockPool, '', 'Description', {})).rejects.toThrow('Role name is required');
    });

    test('should throw error if role already exists', async () => {
      mockExecute.mockResolvedValueOnce([[{ Role_ID: 1 }]]); // Role exists

      await expect(createRole(mockPool, 'Existing Role', 'Description', {})).rejects.toThrow('Role with this name already exists');
    });
  });

  describe('getAllRoles', () => {
    test('should return all active roles', async () => {
      const mockRoles = [
        {
          Role_ID: 1,
          Role_Name: 'Admin',
          Description: 'Admin role',
          Permissions: JSON.stringify({}),
          Is_Active: 1,
          Created_At: new Date()
        }
      ];

      mockExecute.mockResolvedValueOnce([mockRoles]);

      const result = await getAllRoles(mockPool, false);

      expect(result.success).toBe(true);
      expect(result.roles).toHaveLength(1);
      expect(result.roles[0].name).toBe('Admin');
    });

    test('should return empty array when no roles', async () => {
      mockExecute.mockResolvedValueOnce([[]]);

      const result = await getAllRoles(mockPool, false);

      expect(result.success).toBe(true);
      expect(result.roles).toHaveLength(0);
    });
  });

  describe('getRoleById', () => {
    test('should return role by ID', async () => {
      const mockRole = {
        Role_ID: 1,
        Role_Name: 'Admin',
        Description: 'Admin role',
        Permissions: JSON.stringify({}),
        Is_Active: 1,
        Created_At: new Date()
      };

      mockExecute.mockResolvedValueOnce([[mockRole]]);

      const result = await getRoleById(mockPool, 1);

      expect(result.success).toBe(true);
      expect(result.role.id).toBe(1);
      expect(result.role.name).toBe('Admin');
    });

    test('should throw error if role not found', async () => {
      mockExecute.mockResolvedValueOnce([[]]);

      await expect(getRoleById(mockPool, 999)).rejects.toThrow('Role not found');
    });
  });

  describe('assignRoleToUser', () => {
    test('should assign role to user successfully', async () => {
      const mockUser = { User_ID: 1, Username: 'testuser', Full_Name: 'Test User' };
      const mockRole = { Role_ID: 1, Role_Name: 'Admin' };
      const mockAssignment = {
        User_Role_ID: 1,
        User_ID: 1,
        Role_ID: 1,
        Assigned_By: 1,
        Assigned_At: new Date()
      };

      mockExecute
        .mockResolvedValueOnce([[mockUser]]) // User exists
        .mockResolvedValueOnce([[mockRole]]) // Role exists
        .mockResolvedValueOnce([[]]) // Not assigned yet
        .mockResolvedValueOnce([{ insertId: 1 }]) // Insert
        .mockResolvedValueOnce([[mockAssignment]]); // Get assignment

      const result = await assignRoleToUser(mockPool, 1, 1, 1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('assigned');
    });

    test('should throw error if user not found', async () => {
      mockExecute.mockResolvedValueOnce([[]]); // User doesn't exist

      await expect(assignRoleToUser(mockPool, 999, 1, 1)).rejects.toThrow('User not found or inactive');
    });

    test('should throw error if role not found', async () => {
      const mockUser = { User_ID: 1, Username: 'testuser', Full_Name: 'Test User' };

      mockExecute
        .mockResolvedValueOnce([[mockUser]])
        .mockResolvedValueOnce([[]]); // Role doesn't exist

      await expect(assignRoleToUser(mockPool, 1, 999, 1)).rejects.toThrow('Role not found or inactive');
    });
  });

  describe('getUserRoles', () => {
    test('should return user roles', async () => {
      const mockRoles = [
        {
          User_Role_ID: 1,
          User_ID: 1,
          Role_ID: 1,
          Assigned_By: 1,
          Assigned_At: new Date(),
          Role_Name: 'Admin',
          Description: 'Admin role',
          Permissions: JSON.stringify({})
        }
      ];

      mockExecute.mockResolvedValueOnce([mockRoles]);

      const result = await getUserRoles(mockPool, 1);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(1);
      expect(result.roles).toHaveLength(1);
      expect(result.roles[0].roleName).toBe('Admin');
    });

    test('should return empty array if user has no roles', async () => {
      mockExecute.mockResolvedValueOnce([[]]);

      const result = await getUserRoles(mockPool, 1);

      expect(result.success).toBe(true);
      expect(result.roles).toHaveLength(0);
    });
  });

  describe('removeRoleFromUser', () => {
    test('should remove role from user', async () => {
      mockExecute
        .mockResolvedValueOnce([[{ User_Role_ID: 1 }]]) // Assignment exists
        .mockResolvedValueOnce([{}]); // Update

      const result = await removeRoleFromUser(mockPool, 1, 1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('removed');
    });

    test('should throw error if assignment not found', async () => {
      mockExecute.mockResolvedValueOnce([[]]); // Assignment doesn't exist

      await expect(removeRoleFromUser(mockPool, 1, 1)).rejects.toThrow('Role assignment not found');
    });
  });
});
