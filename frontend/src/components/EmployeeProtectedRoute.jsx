import React from 'react';
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useEmployeeAuth } from '../contexts/EmployeeAuthContext';

export default function EmployeeProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useEmployeeAuth();

  if (loading) {
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

  if (!isAuthenticated) {
    return <Navigate to="/employee/login" replace />;
  }

  return children;
}

EmployeeProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired
};
