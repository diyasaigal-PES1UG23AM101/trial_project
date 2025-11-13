import React, { createContext, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  login as employeeLogin,
  logout as employeeLogout,
  verifyToken,
  getStoredEmployee,
  isAuthenticated as employeeIsAuthenticated
} from '../services/employeeAuthService';

const EmployeeAuthContext = createContext(null);

export function EmployeeAuthProvider({ children }) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (employeeIsAuthenticated()) {
          const storedEmployee = getStoredEmployee();
          setEmployee(storedEmployee);

          try {
            const verification = await verifyToken();
            setEmployee(verification.user);
          } catch (verifyError) {
            console.warn('Employee token invalid, clearing session:', verifyError);
            setEmployee(null);
            localStorage.removeItem('employeeToken');
            localStorage.removeItem('employee');
          }
        }
      } catch (err) {
        console.error('Employee auth check error:', err);
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      const response = await employeeLogin(username, password);
      setEmployee(response.user);
      await new Promise((resolve) => setTimeout(resolve, 100));
      return response;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await employeeLogout();
    } finally {
      setEmployee(null);
      setError(null);
    }
  };

  const value = {
    employee,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!employee && employeeIsAuthenticated()
  };

  return (
    <EmployeeAuthContext.Provider value={value}>
      {children}
    </EmployeeAuthContext.Provider>
  );
}

EmployeeAuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useEmployeeAuth() {
  const context = useContext(EmployeeAuthContext);
  if (!context) {
    throw new Error('useEmployeeAuth must be used within an EmployeeAuthProvider');
  }
  return context;
}
