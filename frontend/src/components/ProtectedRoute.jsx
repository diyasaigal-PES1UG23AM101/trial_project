import React from "react";
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEmployee } from '../contexts/EmployeeContext';
import PropTypes from 'prop-types';

export default function ProtectedRoute({ children, employeeRoute = false }) {
  const adminAuth = useAuth();
  const employeeAuth = useEmployee();

  const auth = employeeRoute ? employeeAuth : adminAuth;
  const loginPath = employeeRoute ? '/employee/login' : '/login';

  if (auth.loading) {
    return <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      color: 'white',
      fontSize: '18px'
    }}>Loading...</div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to={loginPath} replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  employeeRoute: PropTypes.bool
};

