require('dotenv').config({ path: './backend/.env' });
const request = require('supertest');
const app = require('../../server');
const mysql = require('mysql2/promise');
const { generateToken, hashPassword } = require('../../src/utils/auth');

const SKIP_INTEGRATION_TESTS = process.env.SKIP_INTEGRATION_TESTS === 'true' || !process.env.DB_HOST;
const describeTest = SKIP_INTEGRATION_TESTS ? describe.skip : describe;

describeTest('Dashboard Controller Integration Tests', () => {
  let pool;
  let testAdminId;
  let adminToken;

  beforeAll(async () => {
    // Create MySQL pool
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'it_infrastructure_test',
      waitForConnections: true,
      connectionLimit: 5
    });

    await pool.execute('SELECT 1');
    app.locals.pool = pool;

    // Create a test admin user
    const [rows] = await pool.execute('SELECT Admin_ID FROM Admin WHERE Username = ?', ['testadmin']);
    if (rows.length > 0) {
      testAdminId = rows[0].Admin_ID;
    } else {
      const hashedPassword = await hashPassword('testpassword123');
      const [res] = await pool.execute(
        'INSERT INTO Admin (Username, Email, Password_Hash, Full_Name, Role, Is_Active) VALUES (?, ?, ?, ?, ?, ?)',
        ['testadmin', 'testadmin@example.com', hashedPassword, 'Test Admin', 'Admin', 1]
      );
      testAdminId = res.insertId;
    }

    adminToken = generateToken({ adminId: testAdminId, username: 'testadmin', role: 'Admin' });
  });

  afterAll(async () => {
    if (!pool) return;

    try {
      if (testAdminId) await pool.execute('DELETE FROM Admin WHERE Admin_ID = ?', [testAdminId]);
    } catch (err) {
      console.warn('Cleanup failed:', err.message);
    }

    try {
      await pool.end();
      app.locals.pool = null;
    } catch (err) {
      console.warn('Error closing pool:', err.message);
    }
  });

  describe('GET /api/admin/dashboard', () => {
    test('should return dashboard data for authenticated admin', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Welcome to the admin dashboard');
      expect(response.body.admin.id).toBe(testAdminId);
    });

    test('should return 401 if no token is provided', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access denied. No token provided.');
    });

    test('should return 403 for invalid token', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer invalid.token');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/dashboard/device-bandwidth', () => {
    test('should return per-device bandwidth data', async () => {
      const response = await request(app)
        .get('/api/dashboard/device-bandwidth')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('bandwidth');
      expect(Array.isArray(response.body.bandwidth)).toBe(true);
    });
  });

  describe('GET /api/dashboard/downtime-alerts', () => {
    test('should return downtime and abnormal traffic alerts', async () => {
      const response = await request(app)
        .get('/api/dashboard/downtime-alerts')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('offline');
      expect(response.body).toHaveProperty('abnormalTraffic');
      expect(Array.isArray(response.body.offline)).toBe(true);
      expect(Array.isArray(response.body.abnormalTraffic)).toBe(true);
    });
  });

  describe('GET /api/health', () => {
    test('should return database connected', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.database).toBe('connected');
    });

    test('should return error if pool is null', async () => {
      const originalPool = app.locals.pool;
      app.locals.pool = null;

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
      expect(response.body.database).toBe('disconnected');

      app.locals.pool = originalPool;
    });
  });
});
