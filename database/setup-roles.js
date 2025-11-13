const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function setupRoles() {
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

    // Default roles to create
    const defaultRoles = [
      {
        name: 'Admin',
        description: 'Full system administration access with all permissions',
        permissions: {
          manage_users: true,
          manage_roles: true,
          manage_infrastructure: true,
          view_reports: true,
          manage_settings: true,
          modules: ['assets', 'licenses', 'users', 'roles', 'reports', 'settings'] // Admin has access to all modules
        }
      },
      {
        name: 'IT Staff',
        description: 'IT infrastructure management permissions',
        permissions: {
          manage_users: false,
          manage_roles: false,
          manage_infrastructure: true,
          view_reports: true,
          manage_settings: false,
          modules: ['assets', 'licenses', 'reports'] // IT Staff can access these modules
        }
      },
      {
        name: 'Employee',
        description: 'Basic employee access with limited permissions',
        permissions: {
          manage_users: false,
          manage_roles: false,
          manage_infrastructure: false,
          view_reports: false,
          manage_settings: false,
          modules: [] // Employee has no module access
        }
      }
    ];

    // Insert or update default roles
    for (const role of defaultRoles) {
      const [existing] = await connection.execute(
        'SELECT Role_ID FROM Role WHERE Role_Name = ?',
        [role.name]
      );

      if (existing.length > 0) {
        console.log(`Role "${role.name}" already exists. Updating...`);
        await connection.execute(
          'UPDATE Role SET Description = ?, Permissions = ?, Is_Active = 1 WHERE Role_Name = ?',
          [role.description, JSON.stringify(role.permissions), role.name]
        );
        console.log(`Role "${role.name}" updated successfully!`);
      } else {
        await connection.execute(
          'INSERT INTO Role (Role_Name, Description, Permissions, Is_Active) VALUES (?, ?, ?, ?)',
          [role.name, role.description, JSON.stringify(role.permissions), 1]
        );
        console.log(`Role "${role.name}" created successfully!`);
      }
    }

    console.log('\n✅ Default roles setup completed!');
    console.log('\nAvailable roles:');
    defaultRoles.forEach(role => {
      console.log(`  - ${role.name}: ${role.description}`);
    });

  } catch (error) {
    console.error('Error setting up roles:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

setupRoles();
