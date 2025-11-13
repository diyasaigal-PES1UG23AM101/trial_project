import React, { createContext, useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { login as loginService, logout as logoutService, verifyToken, getStoredAdmin, isAuthenticated } from '../services/authService';
import { getAdminModules } from '../services/moduleService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        if (isAuthenticated()) {
          const storedAdmin = getStoredAdmin();
          setAdmin(storedAdmin);
          
          // Verify token is still valid
          try {
            await verifyToken();
            try {
              const modulesData = await getAdminModules();
              setModules(modulesData.modules || []);
            } catch (moduleError) {
              console.error('Error fetching modules:', moduleError);
              setModules([]);
            }
          } catch (verifyError) {
            console.error('Token verification failed:', verifyError);
            setAdmin(null);
            setModules([]);
            localStorage.removeItem('token');
            localStorage.removeItem('admin');
          }
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      const response = await loginService(username, password);
      setAdmin(response.admin);
      
      // Fetch modules for the admin
      try {
        const modulesData = await getAdminModules();
        setModules(modulesData.modules || []);
      } catch (moduleError) {
        console.error('Error fetching modules:', moduleError);
        setModules([]);
      }
      
      // Force a small delay to ensure state is updated before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      return response;
    } catch (loginError) {
      setError(loginError.message);
      throw loginError;
    }
  };

  const logout = async () => {
    try {
      await logoutService();
    } finally {
      setAdmin(null);
      setModules([]);
      setError(null);
    }
  };

  const value = {
    admin,
    modules,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!admin && isAuthenticated(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

