# IT infrastructure management software

**Project ID:** P03  
**Course:** UE23CS341A  
**Academic Year:** 2025  
**Semester:** 5th Sem  
**Campus:** RR  
**Branch:** AIML  
**Section:** B  
**Team:** Energisers

## 📋 Project Description

This is management of hardware, software and other infrastructure related activities. Buying hardware/software, making sure that licensed software is installed on all office hardware, etc

This repository contains the source code and documentation for the IT infrastructure management software project, developed as part of the UE23CS341A course at PES University.

## 🧑‍💻 Development Team (Energisers)

- [@diyasaigal-PES1UG23AM101](https://github.com/diyasaigal-PES1UG23AM101) - Scrum Master
- [@pes1ug23am076BhanaviD](https://github.com/pes1ug23am076BhanaviD) - Developer Team
- [@dhrithikiran26](https://github.com/dhrithikiran26) - Developer Team

## 👨‍🏫 Teaching Assistant

- [@Amrutha-PES](https://github.com/Amrutha-PES)
- [@VenomBlood1207](https://github.com/VenomBlood1207)

## 👨‍⚖️ Faculty Supervisor

- [@Arpitha035](https://github.com/Arpitha035)


## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server (v8.0 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pestechnology/PESU_RR_AIML_B_P03_IT_infrastructure_management_software_Energisers.git
   cd PESU_RR_AIML_B_P03_IT_infrastructure_management_software_Energisers
   ```

2. **Set up the Database**
   
   Create the database using the provided SQL file:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
   
   Or if using MySQL Workbench, open `database/schema.sql` and execute it.

3. **Configure Backend Environment**
   
   Create a `.env` file in the `backend` folder:
   ```bash
   cd backend
   copy .env.example .env
   ```
   
   Edit `backend/.env` and update with your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=it_infrastructure
   PORT=5000
   JWT_SECRET=your_super_secret_jwt_key_here_change_this
   NODE_ENV=development
   ADMIN_DEFAULT_PASSWORD=admin123
   ```

4. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

5. **Setup Default Admin User**
   ```bash
   # From project root
   node database/setup-admin.js
   ```
   
   Default credentials:
   - Username: `admin`
   - Password: `admin123`

6. **Setup Default Roles**
   ```bash
   # From project root
   node database/setup-roles.js
   ```
   
   This creates three default roles:
   - **Admin** - Full system administration access
   - **IT Staff** - IT infrastructure management permissions
   - **Employee** - Basic employee access

7. **Install Frontend Dependencies**
   ```bash
   # From project root
   cd frontend
   npm install
   ```

8. **Run the Application**
   
   **Backend:**
   ```bash
   # From backend folder
   npm start
   # Or for development with auto-reload
   npm run dev
   ```
   The backend server will run on `http://localhost:5000`
   
   **Frontend:**
   ```bash
   # From frontend folder (in a new terminal)
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`
   
   **Or run both simultaneously:**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

### API Endpoints

**Authentication:**
- `POST /api/auth/login` - Admin login
- `GET /api/auth/verify` - Verify token and get current admin
- `POST /api/auth/logout` - Logout

**Roles:**
- `POST /api/roles` - Create a new role (requires authentication)
- `GET /api/roles` - Get all roles (requires authentication)
- `GET /api/roles/:roleId` - Get a single role by ID (requires authentication)
- `GET /api/roles/user/employee/:employeeId` - Find user by employee ID (requires authentication)
- `POST /api/roles/assign` - Assign a role to a user (requires authentication, accepts userId or employeeId)
- `GET /api/roles/user/:userId` - Get all roles assigned to a user (requires authentication)
- `DELETE /api/roles/assign/:userId/:roleId` - Remove a role assignment (requires authentication)

**Modules:**
- `GET /api/modules/admin` - Get accessible modules for current admin (requires authentication)
- `GET /api/modules/user/:userId` - Get accessible modules for a user (requires authentication)

**Employee:**
- `POST /api/employee/register` - Register a new employee
- `POST /api/employee/login` - Employee login
- `GET /api/employee/verify` - Verify employee token (requires authentication)
- `POST /api/employee/logout` - Employee logout (requires authentication)

**Assets:**
- `GET /api/assets/my-assets` - Get assets assigned to current employee (requires authentication)
- `GET /api/assets` - Get all assets (admin/IT staff only, requires authentication)
- `POST /api/assets` - Create a new asset (admin/IT staff only, requires authentication)
- `POST /api/assets/assign` - Assign asset to employee (admin/IT staff only, requires authentication)

**Other:**
- `GET /api/health` - Health check
- `GET /api/admin/dashboard` - Protected admin dashboard (requires authentication)

## 📁 Project Structure

```
PESU_RR_AIML_B_P03_IT_infrastructure_management_software_Energisers/
├── backend/                    # Backend API
│   ├── src/
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Authentication middleware
│   │   ├── controllers/       # Route controllers
│   │   └── utils/             # Utility functions (auth, etc.)
│   ├── tests/
│   │   ├── unit/              # Unit tests
│   │   └── integration/       # Integration tests
│   ├── server.js              # Main server file
│   └── package.json
├── frontend/                  # React Frontend
│   ├── src/
│   │   ├── components/        # React components (Login, Dashboard, etc.)
│   │   ├── contexts/          # React contexts (AuthContext)
│   │   ├── services/          # API services
│   │   └── __tests__/         # Frontend unit tests
│   ├── index.html
│   └── package.json
├── database/
│   ├── schema.sql            # Database schema
│   ├── setup-admin.js        # Admin user setup script
│   └── setup-roles.js        # Default roles setup script
├── src/                      # Legacy source code
├── tests/                     # Legacy tests
├── README.md                  # This file
└── package.json
```

## 📋 Story Progress

### ✅ Story 1.1: Implement secure login/logout
**As an Admin, I want to log in securely so that only authorized users can access the system.**

**Backend:**
- [x] Backend authentication routes (`/api/auth/login`, `/api/auth/logout`, `/api/auth/verify`)
- [x] JWT token generation and verification
- [x] Password hashing with bcrypt
- [x] Protected route middleware
- [x] Unit tests for all utility functions
- [x] Unit tests for controller functions
- [x] Unit tests for middleware
- [x] Integration tests for API endpoints
- [x] Database schema for Admin table
- [x] Admin setup script

**Frontend:**
- [x] React login page with modern UI
- [x] Authentication context and state management
- [x] Protected routes
- [x] Logout functionality
- [x] Dashboard page
- [x] Token-based authentication
- [x] Unit tests for authentication service

### ✅ Story 1.2: Create & assign roles (Admin, IT Staff, Employee)
**As an Admin, I want to create and assign roles (Admin, IT Staff, Employee) so that users have appropriate permissions.**

**Backend:**
- [x] Database schema for Role, User, and User_Role tables
- [x] Role controller with create, list, get, assign, and remove functions
- [x] Role API routes (`/api/roles`, `/api/roles/assign`, etc.)
- [x] Unit tests for all role controller functions
- [x] Integration tests for role API endpoints
- [x] Role setup script for default roles

**Frontend:**
- [x] Role management component with create role form
- [x] Role assignment interface
- [x] Role listing and display
- [x] Permission management UI
- [x] Role service for API integration

### ✅ Story 1.3: Restrict IT Staff to limited modules
**As an IT Staff, I want to view only modules assigned to me so that my interface is simplified.**

**Backend:**
- [x] Module controller to get accessible modules for users and admins
- [x] Module access middleware to check module permissions
- [x] Module routes (`/api/modules/*`)
- [x] Updated role setup to include module permissions
- [x] IT Staff role configured with limited modules (assets, licenses, reports)
- [x] Unit tests for module controller
- [x] Unit tests for module access middleware

**Frontend:**
- [x] Module service for API calls
- [x] Updated AuthContext to fetch and store user modules
- [x] Updated Dashboard to show only accessible modules
- [x] Module filtering based on user role permissions
- [x] UI to display available modules with descriptions

**Test Coverage:**
- ✅ Unit tests for module controller (getUserModules, getAdminModules)
- ✅ Unit tests for module access middleware
- ✅ Error handling tests (invalid IDs, missing permissions)

### ✅ Story 1.4: Restrict Employees to assigned assets only
**As an Employee, I want to see only my assigned assets so that I know what equipment is under my care.**

**Backend:**
- [x] Database schema for Asset and Asset_Assignment tables
- [x] Employee registration and login endpoints
- [x] Employee authentication with JWT tokens
- [x] Asset controller to get employee assigned assets
- [x] Asset assignment functionality
- [x] Asset routes (`/api/assets/*`)
- [x] Employee routes (`/api/employee/*`)
- [x] Unit tests for employee controller (register, login, getCurrentEmployee)
- [x] Unit tests for asset controller (getEmployeeAssets, getAllAssets, createAsset, assignAssetToEmployee)

**Frontend:**
- [x] Employee registration page
- [x] Employee login page
- [x] Employee dashboard showing only assigned assets
- [x] Employee context for authentication and asset management
- [x] Employee service for API calls
- [x] Asset service for API calls
- [x] Protected routes for employee access

**Test Coverage:**
- ✅ Unit tests for employee controller (register, login, getCurrentEmployee)
- ✅ Unit tests for asset controller (getEmployeeAssets, getAllAssets, createAsset, assignAssetToEmployee)
- ✅ Error handling tests (invalid credentials, missing data, not found)

## 🛠️ Development Guidelines

### Branching Strategy
- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches

### Commit Messages
Follow conventional commit format:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test-related changes

### Code Review Process
1. Create feature branch from `develop`
2. Make changes and commit
3. Create Pull Request to `develop`
4. Request review from team members
5. Merge after approval

## 📚 Documentation

- [API Documentation](docs/api.md)
- [User Guide](docs/user-guide.md)
- [Developer Guide](docs/developer-guide.md)

## 🧪 Testing

### Backend Tests

From the `backend` folder:

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm test -- --coverage
```

### Frontend Tests

From the `frontend` folder:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

Story 1.1 includes comprehensive unit tests for:

**Backend:**
- ✅ Authentication utility functions (token generation, password hashing, etc.)
- ✅ Authentication controller functions (login, verify)
- ✅ Authentication middleware (token verification)
- ✅ Integration tests for all API endpoints

**Frontend:**
- ✅ Authentication service functions
- ✅ Component rendering tests

### ✅ Story 1.2: Create & assign roles (Admin, IT Staff, Employee)
**As an Admin, I want to create and assign roles (Admin, IT Staff, Employee) so that users have appropriate permissions.**

**Backend:**
- [x] Database schema for Role, User, and User_Role tables
- [x] Role controller with functions: createRole, getAllRoles, getRoleById, assignRoleToUser, getUserRoles, removeRoleFromUser
- [x] Role routes (`/api/roles/*`)
- [x] Unit tests for role controller functions
- [x] Integration tests for role API endpoints
- [x] Default roles setup script (Admin, IT Staff, Employee)

**Frontend:**
- [x] Role management UI component
- [x] Create role form with permissions
- [x] List existing roles
- [x] Assign role to user functionality
- [x] Role service for API calls
- [x] Navigation from Dashboard to Role Management

**Test Coverage:**
- ✅ Unit tests for all role controller functions (create, get, assign, remove)
- ✅ Integration tests for role API endpoints
- ✅ Error handling tests (missing data, invalid IDs, duplicates)

## 📄 License

This project is developed for educational purposes as part of the PES University UE23CS341A curriculum.

---

**Course:** UE23CS341A  
**Institution:** PES University  
**Academic Year:** 2025  
**Semester:** 5th Sem
