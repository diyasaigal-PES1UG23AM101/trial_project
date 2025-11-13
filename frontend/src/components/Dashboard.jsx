import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Dashboard.css';

const DEFAULT_MODULES = ['assets', 'licenses', 'monitoring', 'reports', 'roles'];

const MODULE_CONFIG = {
  assets: { label: 'Assets', endpoint: '/api/dashboard/assets' },
  licenses: { label: 'Licenses', endpoint: '/api/dashboard/licenses' },
  monitoring: { label: 'Monitoring', endpoint: '/api/dashboard/monitoring' },
  reports: { label: 'Reports', endpoint: '/api/dashboard/reports' },
};

const QUICK_ACTIONS = {
  roles: { label: 'Manage Roles', navigateTo: '/roles' },
};

export default function Dashboard() {
  const { admin, modules, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({});
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const assignedModules = useMemo(() => {
    const modulesArr = Array.isArray(admin?.modules) ? admin.modules : null;
    if (modulesArr && modulesArr.length > 0) {
      const normalized = modulesArr
        .filter((m) => typeof m === 'string')
        .map((m) => m.trim().toLowerCase());
      const unique = [...new Set(normalized)];
      return unique.length > 0 ? unique : DEFAULT_MODULES;
    }
    return DEFAULT_MODULES;
  }, [admin?.modules]);

  const dataModuleKeys = useMemo(
    () => assignedModules.filter((m) => MODULE_CONFIG[m]),
    [assignedModules]
  );

  const quickActionKeys = useMemo(
    () => assignedModules.filter((m) => QUICK_ACTIONS[m]),
    [assignedModules]
  );

  const quickActions = useMemo(
    () => quickActionKeys.map((key) => ({ key, ...QUICK_ACTIONS[key] })),
    [quickActionKeys]
  );

  const allModules = {
    assets: { name: 'Assets', route: '/assets', description: 'Manage IT assets' },
    licenses: { name: 'Licenses', route: '/licenses', description: 'Manage software licenses' },
    users: { name: 'Users', route: '/users', description: 'Manage users' },
    roles: { name: 'Roles', route: '/roles', description: 'Manage roles and permissions' },
    reports: { name: 'Reports', route: '/reports', description: 'View reports and analytics' },
    settings: { name: 'Settings', route: '/settings', description: 'System settings' },
  };

  const accessibleModules = useMemo(() => {
    if (Array.isArray(modules) && modules.length > 0) {
      return modules.map((m) => allModules[m]).filter(Boolean);
    }
    return Object.values(allModules);
  }, [modules]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Fetch Dashboard Overview
  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/dashboard/overview')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load dashboard overview');
        return res.json();
      })
      .then((data) => setOverview(data))
      .catch((err) => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch per-module data
  useEffect(() => {
    if (!admin || dataModuleKeys.length === 0) return;
    let isActive = true;
    const start = performance.now();

    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
      const results = await Promise.allSettled(
        dataModuleKeys.map(async (key) => {
          const res = await axios.get(MODULE_CONFIG[key].endpoint);
          return [key, res?.data?.data ?? []];
        })
      );

      if (!isActive) return;
      const nextData = {};
      const failed = [];

      results.forEach((r, i) => {
        const key = dataModuleKeys[i];
        if (r.status === 'fulfilled') {
          const [, data] = r.value;
          nextData[key] = Array.isArray(data) ? data : [];
        } else {
          nextData[key] = [];
          failed.push(MODULE_CONFIG[key].label);
        }
      });

      setDashboardData(nextData);
      if (failed.length > 0) setError(`Failed to load: ${failed.join(', ')}`);
      setLoading(false);
      const duration = performance.now() - start;
      console.log(`Dashboard loaded in ${duration.toFixed(2)}ms`);
    };

    fetchDashboardData();
    return () => {
      isActive = false;
    };
  }, [admin, dataModuleKeys]);

  if (!admin || loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Welcome, {admin.fullName || admin.username}!</h1>
          <p>IT Infrastructure Management System</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

      {error && (
        <div className="dashboard-alert" role="alert">
          {error}
        </div>
      )}

      <div className="dashboard-content">
        {/* Admin Info */}
        <div className="info-card">
          <h2>Admin Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Username:</label>
              <span>{admin.username}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{admin.email}</span>
            </div>
            <div className="info-item">
              <label>Full Name:</label>
              <span>{admin.fullName}</span>
            </div>
            <div className="info-item">
              <label>Role:</label>
              <span className="role-badge">{admin.role}</span>
            </div>
          </div>
        </div>

        {/* Available Modules */}
        <div className="action-cards">
          <h2>Available Modules</h2>
          {accessibleModules.length === 0 ? (
            <p className="no-modules">No modules available. Please contact your administrator.</p>
          ) : (
            <div className="modules-grid">
              {accessibleModules.map((module) => (
                <div
                  key={module.route}
                  className="action-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(module.route)}
                  onKeyUp={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate(module.route);
                  }}
                >
                  <h3>{module.name}</h3>
                  <p>{module.description}</p>
                  <span className="action-link">Open Module →</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="welcome-card">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            {quickActions.length === 0 ? (
              <p className="no-actions">No quick actions available</p>
            ) : (
              quickActions.map(({ key, label, navigateTo }) => (
                <button key={key} onClick={() => navigate(navigateTo)} className="action-button">
                  {label}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Dashboard Data */}
        <div className="dashboard-sections">
          <h2>Dashboard Data</h2>
          {dataModuleKeys.length === 0 ? (
            <p className="no-data">No modules assigned to your account yet.</p>
          ) : (
            dataModuleKeys.map((moduleKey) => {
              const { label } = MODULE_CONFIG[moduleKey];
              const items = dashboardData[moduleKey] || [];
              return (
                <div key={moduleKey} className="section">
                  <h3>
                    {label} ({items.length})
                  </h3>
                  {items.length > 0 && (
                    <ul>
                      {items.slice(0, 3).map((item, index) => (
                        <li key={index}>{JSON.stringify(item)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* System Overview Section */}
        {overview && (
          <div className="system-overview-section">
            <h2 className="overview-title">📊 System Overview</h2>
            <div className="overview-grid">
              <div className="overview-card blue">
                <h3>Assets</h3>
                <p>Total: {overview.assets.total}</p>
                <p>Assigned: {overview.assets.assigned}</p>
                <p>Expiring Soon: {overview.assets.expiring_soon}</p>
              </div>

              <div className="overview-card green">
                <h3>Licenses</h3>
                <p>Total: {overview.licenses.total}</p>
                <p>Expiring Soon: {overview.licenses.expiring_soon}</p>
              </div>

              <div
                className={`overview-card ${
                  overview.backups.last_status === 'Failed'
                    ? 'red'
                    : overview.backups.last_status === 'No backups found'
                    ? 'gray'
                    : 'purple'
                }`}
              >
                <h3>Backups</h3>
                <p>Last: {overview.backups.last_backup || 'None'}</p>
                <p>Status: {overview.backups.last_status}</p>
                <p>Time: {overview.backups.last_modified || '—'}</p>
              </div>

              <div className="overview-card orange">
                <h3>Metrics</h3>
                <p>CPU Usage: {overview.metrics.avg_cpu_usage}</p>
                <p>Memory Usage: {overview.metrics.avg_memory_usage}</p>
              </div>
            </div>
          </div>
        )}

        {/* --- Export Reports Section --- */}
        <div className="report-download-section">
          <h2 className="overview-title">📄 Export Reports</h2>
          <div className="quick-actions">
            <button
              onClick={() => window.open('http://127.0.0.1:5000/api/reports/export?format=csv')}
              className="action-button"
            >
              Download CSV
            </button>
            <button
              onClick={() => window.open('http://127.0.0.1:5000/api/reports/export?format=pdf')}
              className="action-button"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}