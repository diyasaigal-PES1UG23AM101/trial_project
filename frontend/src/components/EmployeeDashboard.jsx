import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployee } from '../contexts/EmployeeContext';
import './Dashboard.css';

export default function EmployeeDashboard() {
  const { employee, assets, loading, logout, refreshAssets } = useEmployee();
  const navigate = useNavigate();

  useEffect(() => {
    refreshAssets();
  }, [refreshAssets]);

  const handleLogout = async () => {
    await logout();
    navigate('/employee/login');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!employee) {
    return <div className="loading">Please login...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Welcome, {employee.fullName || employee.username}!</h1>
          <p>My Assigned Assets</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

      <div className="dashboard-content">
        <div className="info-card">
          <h2>Employee Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Username:</label>
              <span>{employee.username}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{employee.email}</span>
            </div>
            <div className="info-item">
              <label>Full Name:</label>
              <span>{employee.fullName}</span>
            </div>
            {employee.employeeId && (
              <div className="info-item">
                <label>Employee ID:</label>
                <span>{employee.employeeId}</span>
              </div>
            )}
            {employee.department && (
              <div className="info-item">
                <label>Department:</label>
                <span>{employee.department}</span>
              </div>
            )}
          </div>
        </div>

        <div className="action-cards">
          <h2>My Assigned Assets ({assets.length})</h2>
          {assets.length === 0 ? (
            <p className="no-modules">No assets assigned to you yet. Please contact your administrator.</p>
          ) : (
            <div className="modules-grid">
              {assets.map((asset) => (
                <div key={asset.assetId} className="action-card">
                  <h3>{asset.assetName}</h3>
                  <div className="asset-details">
                    <p><strong>Type:</strong> {asset.assetType}</p>
                    {asset.serialNumber && <p><strong>Serial Number:</strong> {asset.serialNumber}</p>}
                    {asset.manufacturer && <p><strong>Manufacturer:</strong> {asset.manufacturer}</p>}
                    {asset.model && <p><strong>Model:</strong> {asset.model}</p>}
                    <p><strong>Status:</strong> <span className="status-badge">{asset.status}</span></p>
                    {asset.location && <p><strong>Location:</strong> {asset.location}</p>}
                    {asset.assignedDate && <p><strong>Assigned Date:</strong> {new Date(asset.assignedDate).toLocaleDateString()}</p>}
                    {asset.description && <p><strong>Description:</strong> {asset.description}</p>}
                    {asset.notes && <p><strong>Notes:</strong> {asset.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

