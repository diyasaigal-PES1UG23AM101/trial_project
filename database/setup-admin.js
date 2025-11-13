const mysql = require('mysql2/promise');
const path = require('path');
const { hashPassword } = require(path.join(__dirname, '../backend/src/utils/auth'));
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function setupAdmin() {
  let connection;

  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'it_infrastructure',
      multipleStatements: true
    });

    console.log('Connected to database');

    // Hash the default password
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    const hashedPassword = await hashPassword(defaultPassword);

    // Check if admin already exists
    const [existing] = await connection.execute(
      'SELECT Admin_ID FROM Admin WHERE Username = ?',
      ['admin']
    );

    if (existing.length > 0) {
      console.log('Admin user already exists. Updating password...');
      await connection.execute(
        'UPDATE Admin SET Password_Hash = ?, Is_Active = 1 WHERE Username = ?',
        [hashedPassword, 'admin']
      );
      console.log('Admin password updated successfully!');
    } else {
      // Create default admin user
      await connection.execute(
        `INSERT INTO Admin (Username, Email, Password_Hash, Full_Name, Role, Is_Active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['admin', 'admin@example.com', hashedPassword, 'System Administrator', 'Super Admin', 1]
      );
      console.log('Default admin user created successfully!');
    }

    console.log('\nDefault Admin Credentials:');
    console.log('Username: admin');
    console.log(`Password: ${defaultPassword}`);
    console.log('\n⚠️  IMPORTANT: Change the default password after first login!');

  } catch (error) {
    console.error('Error setting up admin:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

setupAdmin();

