import React, { createContext, useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { loginEmployee, logoutEmployee, verifyEmployeeToken, getStoredEmployee, isEmployeeAuthenticated } from '../services/employeeService';
import { getMyAssets } from '../services/assetService';

const EmployeeContext = createContext(null);

export function EmployeeProvider({ children }) {
  const [employee, setEmployee] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (isEmployeeAuthenticated()) {
          const storedEmployee = getStoredEmployee();
          setEmployee(storedEmployee);
          
          try {
            await verifyEmployeeToken();
            // Fetch assigned assets
            try {
              const assetsData = await getMyAssets();
              setAssets(assetsData.assets || []);
            } catch (assetsError) {
              console.error('Error fetching assets:', assetsError);
              setAssets([]);
            }
          } catch (verifyError) {
            console.error('Employee token verification failed:', verifyError);
            setEmployee(null);
            setAssets([]);
            localStorage.removeItem('employee_token');
            localStorage.removeItem('employee');
          }
        }
      } catch (authError) {
        console.error('Auth check error:', authError);
        setEmployee(null);
        setAssets([]);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      const response = await loginEmployee(username, password);
      setEmployee(response.user);
      
      // Fetch assigned assets
      try {
        const assetsData = await getMyAssets();
        setAssets(assetsData.assets || []);
      } catch (assetsError) {
        console.error('Error fetching assets:', assetsError);
        setAssets([]);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      return response;
    } catch (loginError) {
      setError(loginError.message);
      throw loginError;
    }
  };

  const logout = async () => {
    try {
      await logoutEmployee();
    } finally {
      setEmployee(null);
      setAssets([]);
      setError(null);
    }
  };

  const refreshAssets = async () => {
    try {
      const assetsData = await getMyAssets();
      setAssets(assetsData.assets || []);
    } catch (refreshError) {
      console.error('Error refreshing assets:', refreshError);
    }
  };

  const value = {
    employee,
    assets,
    loading,
    error,
    login,
    logout,
    refreshAssets,
    isAuthenticated: !!employee && isEmployeeAuthenticated(),
  };

  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
}

EmployeeProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useEmployee() {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error('useEmployee must be used within an EmployeeProvider');
  }
  return context;
}

