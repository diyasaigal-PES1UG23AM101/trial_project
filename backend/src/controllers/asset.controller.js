const ASSIGNED_ASSET_SELECT = `
  aa.Assignment_ID,
  aa.User_ID,
  aa.Asset_ID,
  aa.Assigned_Date,
  aa.Return_Date,
  aa.Notes,
  a.Asset_Name,
  a.Asset_Type,
  a.Serial_Number,
  a.Manufacturer,
  a.Model,
  a.Status,
  a.Location,
  a.Description
`;

async function getEmployeeAssets(pool, userId) {
  if (!pool) {
    throw new Error('Database connection not available');
  }

  if (!userId || typeof userId !== 'number') {
    throw new Error('Valid user ID is required');
  }

  const [rows] = await pool.execute(
    `SELECT ${ASSIGNED_ASSET_SELECT}
       FROM Asset_Assignment aa
       INNER JOIN Asset a ON aa.Asset_ID = a.Asset_ID
      WHERE aa.User_ID = ?
        AND aa.Is_Active = 1
        AND a.Is_Active = 1
      ORDER BY aa.Assigned_Date DESC`,
    [userId]
  );

  const assets = rows.map((row) => ({
    assetId: row.Asset_ID,
    assetName: row.Asset_Name,
    assetType: row.Asset_Type,
    serialNumber: row.Serial_Number,
    manufacturer: row.Manufacturer,
    model: row.Model,
    status: row.Status,
    location: row.Location,
    description: row.Description,
    assignmentId: row.Assignment_ID,
    assignedDate: row.Assigned_Date,
    returnDate: row.Return_Date,
    notes: row.Notes
  }));

  return {
    success: true,
    userId,
    assets,
    count: assets.length
  };
}

async function getAllAssets(pool) {
  if (!pool) {
    throw new Error('Database connection not available');
  }

  const [rows] = await pool.execute(
    `SELECT Asset_ID, Asset_Name, Asset_Type, Serial_Number, Manufacturer, Model, Status, Location, Description, Created_At
       FROM Asset
      WHERE Is_Active = 1
      ORDER BY Asset_Name`
  );

  const assets = rows.map((row) => ({
    assetId: row.Asset_ID,
    assetName: row.Asset_Name,
    assetType: row.Asset_Type,
    serialNumber: row.Serial_Number,
    manufacturer: row.Manufacturer,
    model: row.Model,
    status: row.Status,
    location: row.Location,
    description: row.Description,
    createdAt: row.Created_At
  }));

  return {
    success: true,
    assets,
    count: assets.length
  };
}

async function createAsset(pool, assetData) {
  if (!pool) {
    throw new Error('Database connection not available');
  }

  const {
    assetName,
    assetType,
    serialNumber,
    manufacturer,
    model,
    status,
    location,
    description
  } = assetData;

  if (!assetName || !assetType) {
    throw new Error('Asset name and type are required');
  }

  const [result] = await pool.execute(
    `INSERT INTO Asset
       (Asset_Name, Asset_Type, Serial_Number, Manufacturer, Model, Status, Location, Description, Is_Active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      assetName,
      assetType,
      serialNumber || null,
      manufacturer || null,
      model || null,
      status || 'Available',
      location || null,
      description || null
    ]
  );

  const [rows] = await pool.execute(
    `SELECT Asset_ID, Asset_Name, Asset_Type, Serial_Number, Manufacturer, Model, Status, Location, Description
       FROM Asset
      WHERE Asset_ID = ?`,
    [result.insertId]
  );

  const created = rows[0];

  return {
    success: true,
    asset: {
      assetId: created.Asset_ID,
      assetName: created.Asset_Name,
      assetType: created.Asset_Type,
      serialNumber: created.Serial_Number,
      manufacturer: created.Manufacturer,
      model: created.Model,
      status: created.Status,
      location: created.Location,
      description: created.Description
    }
  };
}

async function assignAssetToEmployee(pool, assetId, userId, assignedBy, notes) {
  if (!pool) {
    throw new Error('Database connection not available');
  }

  if (!assetId || typeof assetId !== 'number') {
    throw new Error('Valid asset ID is required');
  }

  if (!userId || typeof userId !== 'number') {
    throw new Error('Valid user ID is required');
  }

  const [assetRows] = await pool.execute(
    'SELECT Asset_ID, Status FROM Asset WHERE Asset_ID = ? AND Is_Active = 1',
    [assetId]
  );
  if (assetRows.length === 0) {
    throw new Error('Asset not found');
  }

  const [userRows] = await pool.execute(
    'SELECT User_ID FROM User WHERE User_ID = ? AND Is_Active = 1',
    [userId]
  );
  if (userRows.length === 0) {
    throw new Error('User not found');
  }

  const [result] = await pool.execute(
    `INSERT INTO Asset_Assignment
       (Asset_ID, User_ID, Assigned_By, Assigned_Date, Notes, Is_Active)
     VALUES (?, ?, ?, CURDATE(), ?, 1)`,
    [assetId, userId, assignedBy || null, notes || null]
  );

  await pool.execute(
    'UPDATE Asset SET Status = ? WHERE Asset_ID = ?',
    ['Assigned', assetId]
  );

  return {
    success: true,
    message: 'Asset assigned successfully',
    assignmentId: result.insertId
  };
}

async function getAssetsForUser(pool, identifiers = {}) {
  if (!pool) {
    throw new Error('Database connection not available');
  }

  const rawUserId = identifiers.userId ?? null;
  const numericUserId = rawUserId !== null ? Number(rawUserId) : null;

  if (!numericUserId || Number.isNaN(numericUserId)) {
    throw new Error('Valid user identifier is required');
  }

  const result = await getEmployeeAssets(pool, numericUserId);

  return {
    success: true,
    count: result.count,
    assets: result.assets
  };
}

module.exports = {
  getEmployeeAssets,
  getAllAssets,
  createAsset,
  assignAssetToEmployee,
  getAssetsForUser
};
