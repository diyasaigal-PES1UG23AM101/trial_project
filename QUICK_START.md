# 🚀 Quick Start Guide

## Run the Full Application (Frontend + Backend)

### Step 1: Start Backend Server

Open **Terminal 1**:
```powershell
cd D:\Projects_Sem_5\SEMINI\PESU_RR_AIML_B_P03_IT_infrastructure_management_software_Energisers\backend
npm start
```

Wait for: `Server is running on port 5000`

### Step 2: Start Frontend

Open **Terminal 2**:
```powershell
cd D:\Projects_Sem_5\SEMINI\PESU_RR_AIML_B_P03_IT_infrastructure_management_software_Energisers\frontend
npm install
npm run dev
```

Wait for: `Local: http://localhost:3000`

### Step 3: Open Browser

Go to: **http://localhost:3000**

### Step 4: Login

- **Username:** `admin`
- **Password:** `admin123`

## First Time Setup (If Not Done Yet)

1. **Install Backend Dependencies:**
   ```powershell
   cd backend
   npm install
   ```

2. **Set Up Database:**
   - Run: `mysql -u root -p < database/schema.sql`
   - Or execute `database/schema.sql` in MySQL Workbench

3. **Create `.env` file in `backend` folder:**
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=it_infrastructure
   PORT=5000
   JWT_SECRET=your_secret_key
   NODE_ENV=development
   ADMIN_DEFAULT_PASSWORD=admin123
   ```

4. **Create Admin User:**
   ```powershell
   node database/setup-admin.js
   ```

5. **Install Frontend Dependencies:**
   ```powershell
   cd frontend
   npm install
   ```

## Troubleshooting

- **Backend not starting?** Check MySQL is running and `.env` file is correct
- **Frontend not loading?** Make sure backend is running on port 5000
- **Can't login?** Verify admin user exists: `node database/setup-admin.js`

