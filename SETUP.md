# Quick Setup Guide - Story 1.1: Secure Login/Logout

This guide will help you set up and run the IT Infrastructure Management System with secure admin authentication.

## Prerequisites

- ✅ Node.js (v14 or higher) - [Download](https://nodejs.org/)
- ✅ MySQL Server (v8.0 or higher) - [Download](https://dev.mysql.com/downloads/mysql/)
- ✅ npm (comes with Node.js)

## Step-by-Step Setup

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Database

**Option A: Using MySQL Command Line**
```bash
mysql -u root -p < ../database/schema.sql
```

**Option B: Using MySQL Workbench**
- Open MySQL Workbench
- Connect to your MySQL server
- Open `database/schema.sql` file
- Execute the SQL script

### 3. Configure Environment Variables

Create a `.env` file in the `backend` folder:

**Windows (PowerShell):**
```powershell
cd backend
Copy-Item ENV_EXAMPLE.md -Destination .env
# Or manually create .env file
```

**Or manually create `backend/.env` with:**
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=it_infrastructure
PORT=5000
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
NODE_ENV=development
ADMIN_DEFAULT_PASSWORD=admin123
```

**⚠️ Important:** Replace `your_mysql_password_here` with your actual MySQL root password!

### 4. Create Default Admin User

From the project root directory:
```bash

```

This will create a default admin user:
- **Username:** `admin`
- **Password:** `admin123`

### 5. Start the Server

From the `backend` folder:
```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

The server will start on `http://localhost:5000`

### 6. Test the API

You can test the login endpoint using curl, Postman, or any HTTP client:

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "fullName": "System Administrator",
    "role": "Super Admin"
  }
}
```

## Running Tests

From the `backend` folder:

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage
npm test -- --coverage
```

## Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check your `.env` file has correct credentials
- Ensure database `it_infrastructure` exists

### Port Already in Use
- Change `PORT` in `.env` file
- Or stop the process using port 5000

### Module Not Found Errors
- Run `npm install` again in the `backend` folder
- Verify `node_modules` folder exists

### Admin Setup Fails
- Ensure database is created first
- Check database credentials in `.env` file
- Verify MySQL user has CREATE and INSERT permissions

## Next Steps

After successful setup:
1. ✅ Test login with default credentials
2. ✅ Test logout endpoint
3. ✅ Test protected routes
4. ✅ Run unit tests to verify everything works
5. ⚠️ **Change default admin password** after first login!

