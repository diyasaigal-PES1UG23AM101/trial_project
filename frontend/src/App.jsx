import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EmployeeProvider, useEmployee } from './contexts/EmployeeContext';
import { EmployeeAuthProvider } from './contexts/EmployeeAuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import RoleManagement from './components/RoleManagement';
import EmployeeLogin from './components/EmployeeLogin';
import EmployeeRegister from './components/EmployeeRegister';
import EmployeeDashboard from './components/EmployeeDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import EmployeeAssets from './components/EmployeeAssets';
import EmployeeProtectedRoute from './components/EmployeeProtectedRoute';
import './App.css';

function AppRoutes() {
  const { isAuthenticated: adminAuth, loading: adminLoading } = useAuth();
  const { isAuthenticated: employeeAuth, loading: employeeLoading } = useEmployee();

  if (adminLoading || employeeLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          color: 'white',
          fontSize: '18px'
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      {/* Admin Routes */}
      <Route
        path="/login"
        element={adminAuth ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute>
            <RoleManagement />
          </ProtectedRoute>
        }
      />

      {/* Employee Routes */}
      <Route
        path="/employee/login"
        element={employeeAuth ? <Navigate to="/employee/dashboard" replace /> : <EmployeeLogin />}
      />
      <Route
        path="/employee/register"
        element={<EmployeeRegister />}
      />
      <Route
        path="/employee/dashboard"
        element={
          <ProtectedRoute employeeRoute>
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/assets"
        element={
          <EmployeeProtectedRoute>
            <EmployeeAssets />
          </EmployeeProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route
        path="/"
        element={<Navigate to={adminAuth ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <EmployeeProvider>
          <EmployeeAuthProvider>
            <AppRoutes />
          </EmployeeAuthProvider>
        </EmployeeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;