const assetController = require('../../src/controllers/asset.controller');
const {
  getEmployeeAssets,
  getAllAssets,
  createAsset,
  assignAssetToEmployee,
  getAssetsForUser
} = assetController;

describe('Asset Controller', () => {
  let pool;

  beforeEach(() => {
    pool = {
      execute: jest.fn()
    };
  });

  describe('getEmployeeAssets', () => {
    test('should return assets assigned to employee', async () => {
      const mockAssets = [
        {
          Assignment_ID: 1,
          User_ID: 1,
          Asset_ID: 2,
          Assigned_Date: new Date(),
          Return_Date: null,
          Notes: 'Assigned for work',
          Asset_Name: 'Laptop',
          Asset_Type: 'Hardware',
          Serial_Number: 'SN001',
          Manufacturer: 'Dell',
          Model: 'Latitude',
          Status: 'Assigned',
          Location: 'Office',
          Description: 'Work laptop'
        }
      ];

      pool.execute.mockResolvedValueOnce([mockAssets]);

      const result = await getEmployeeAssets(pool, 1);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(1);
      expect(result.assets).toHaveLength(1);
      expect(result.assets[0].assetName).toBe('Laptop');
    });

    test('should return empty array if no assets assigned', async () => {
      pool.execute.mockResolvedValueOnce([[]]);

      const result = await getEmployeeAssets(pool, 1);

      expect(result.success).toBe(true);
      expect(result.assets).toHaveLength(0);
    });

    test('should throw error if user ID is invalid', async () => {
      await expect(getEmployeeAssets(pool, null)).rejects.toThrow('Valid user ID is required');
    });
  });

  describe('getAllAssets', () => {
    test('should return all assets', async () => {
      const mockAssets = [
        {
          Asset_ID: 1,
          Asset_Name: 'Laptop',
          Asset_Type: 'Hardware',
          Serial_Number: 'SN001',
          Manufacturer: 'Dell',
          Model: 'Latitude',
          Status: 'Available',
          Location: 'Office',
          Description: 'Work laptop',
          Created_At: new Date()
        }
      ];

      pool.execute.mockResolvedValueOnce([mockAssets]);

      const result = await getAllAssets(pool);

      expect(result.success).toBe(true);
      expect(result.assets).toHaveLength(1);
      expect(result.assets[0].assetName).toBe('Laptop');
    });

    test('should return empty array if no assets', async () => {
      pool.execute.mockResolvedValueOnce([[]]);

      const result = await getAllAssets(pool);

      expect(result.success).toBe(true);
      expect(result.assets).toHaveLength(0);
    });
  });

  describe('createAsset', () => {
    test('should create asset successfully', async () => {
      const mockAsset = {
        Asset_ID: 1,
        Asset_Name: 'Laptop',
        Asset_Type: 'Hardware',
        Serial_Number: 'SN001',
        Manufacturer: 'Dell',
        Model: 'Latitude',
        Status: 'Available',
        Location: 'Office',
        Description: 'Work laptop'
      };

      pool.execute
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([[mockAsset]]);

      const result = await createAsset(pool, {
        assetName: 'Laptop',
        assetType: 'Hardware',
        serialNumber: 'SN001',
        manufacturer: 'Dell',
        model: 'Latitude',
        status: 'Available',
        location: 'Office',
        description: 'Work laptop'
      });

      expect(result.success).toBe(true);
      expect(result.asset.assetName).toBe('Laptop');
    });

    test('should throw error if asset name is missing', async () => {
      await expect(createAsset(pool, { assetType: 'Hardware' })).rejects.toThrow('Asset name and type are required');
    });
  });

  describe('assignAssetToEmployee', () => {
    test('should assign asset to employee successfully', async () => {
      const mockAsset = { Asset_ID: 1, Status: 'Available' };
      const mockUser = { User_ID: 1 };

      pool.execute
        .mockResolvedValueOnce([[mockAsset]])
        .mockResolvedValueOnce([[mockUser]])
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([{}]);

      const result = await assignAssetToEmployee(pool, 1, 1, 1, 'Test notes');

      expect(result.success).toBe(true);
      expect(result.message).toContain('assigned');
    });

    test('should throw error if asset not found', async () => {
      pool.execute.mockResolvedValueOnce([[]]);

      await expect(assignAssetToEmployee(pool, 999, 1, 1, 'Notes')).rejects.toThrow('Asset not found');
    });

    test('should throw error if user not found', async () => {
      const mockAsset = { Asset_ID: 1 };

      pool.execute
        .mockResolvedValueOnce([[mockAsset]])
        .mockResolvedValueOnce([[]]);

      await expect(assignAssetToEmployee(pool, 1, 999, 1, 'Notes')).rejects.toThrow('User not found');
    });
  });

  describe('getAssetsForUser', () => {
    test('should fetch assigned assets for a user via getEmployeeAssets wrapper', async () => {
      const mockAssets = [
        {
          Assignment_ID: 10,
          User_ID: 5,
          Asset_ID: 2,
          Assigned_Date: new Date(),
          Return_Date: null,
          Notes: 'notes',
          Asset_Name: 'Laptop',
          Asset_Type: 'Hardware',
          Serial_Number: 'SN-123',
          Manufacturer: 'Brand',
          Model: 'Model',
          Status: 'Active',
          Location: 'Office',
          Description: 'Issued laptop'
        }
      ];

      pool.execute.mockResolvedValueOnce([mockAssets]);

      const result = await getAssetsForUser(pool, {
        userId: 5,
        fullName: 'Employee User',
        username: 'employee'
      });

      expect(pool.execute).toHaveBeenCalledWith(expect.any(String), [5]);
      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.assets[0].assetName).toBe('Laptop');
    });

    test('should throw error when userId is missing', async () => {
      await expect(getAssetsForUser(pool, { userId: null })).rejects.toThrow('Valid user identifier is required');
    });
  });
});

