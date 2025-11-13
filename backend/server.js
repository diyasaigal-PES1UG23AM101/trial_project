const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }

    const allowedOrigins = ['http://localhost:3000', 'http://localhost:3002'];
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'it_infrastructure'
};

let pool;

async function initDatabase() {
  try {
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    await pool.execute('SELECT 1');
    app.locals.pool = pool;

    if (process.env.NODE_ENV !== 'test') {
      console.log('✅ Database connection pool created and tested');
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('❌ Database connection error:', err.message);
    }
    app.locals.pool = null;
  }
}

if (process.env.NODE_ENV !== 'test') {
  initDatabase();
}

const authRoutes = require('./src/routes/auth.routes');
const roleRoutes = require('./src/routes/role.routes');
const moduleRoutes = require('./src/routes/module.routes');
const employeeRoutes = require('./src/routes/employee.routes');
const assetRoutes = require('./src/routes/asset.routes');

app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/assets', assetRoutes);

try {
  const dashboardRoutes = require('./src/routes/dashboard.routes');
  app.use('/api/dashboard', dashboardRoutes);
} catch {
  // optional dashboard routes may not exist in all deployments
}

app.get('/', (req, res) => {
  res.json({
    message: 'IT Infrastructure Management System API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: {
        login: 'POST /api/auth/login',
        verify: 'GET /api/auth/verify',
        logout: 'POST /api/auth/logout'
      },
      roles: {
        create: 'POST /api/roles',
        list: 'GET /api/roles',
        get: 'GET /api/roles/:roleId',
        findUserByEmployeeId: 'GET /api/roles/user/employee/:employeeId',
        assign: 'POST /api/roles/assign',
        getUserRoles: 'GET /api/roles/user/:userId',
        remove: 'DELETE /api/roles/assign/:userId/:roleId'
      },
      modules: {
        admin: 'GET /api/modules/admin',
        user: 'GET /api/modules/user/:userId'
      },
      employee: {
        register: 'POST /api/employee/register',
        login: 'POST /api/employee/login',
        verify: 'GET /api/employee/verify',
        logout: 'POST /api/employee/logout'
      },
      assets: {
        myAssets: 'GET /api/assets/my-assets',
        my: 'GET /api/assets/my',
        list: 'GET /api/assets',
        create: 'POST /api/assets',
        assign: 'POST /api/assets/assign'
      },
      dashboard: {
        admin: 'GET /api/admin/dashboard',
        assets: 'GET /api/dashboard/assets',
        licenses: 'GET /api/dashboard/licenses',
        monitoring: 'GET /api/dashboard/monitoring',
        reports: 'GET /api/dashboard/reports'
      }
    }
  });
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

app.get('/api/admin/dashboard', async (req, res) => {
  const { authenticateToken } = require('./src/middleware/auth');
  authenticateToken(req, res, () => {
    res.json({
      message: 'Welcome to the admin dashboard',
      admin: req.user
    });
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

module.exports = app;
