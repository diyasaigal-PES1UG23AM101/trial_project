import React, { useEffect, useMemo, useState } from 'react';
import { getAssignedAssets } from '../services/assetService';
import { useEmployeeAuth } from '../contexts/EmployeeAuthContext';
import './Dashboard.css';

export default function EmployeeAssets() {
  const { employee, logout } = useEmployeeAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadAssets = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getAssignedAssets();
        if (isMounted) {
          setAssets(Array.isArray(response.assets) ? response.assets : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load assets');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAssets();

    return () => {
      isMounted = false;
    };
  }, []);

  const assetCount = useMemo(() => assets.length, [assets]);

  if (!employee) {
    return <div>Loading...</div>;
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Welcome, {employee.fullName || employee.username}!</h1>
          <p>Your assigned equipment overview</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

      {loading && <div>Loading assets...</div>}
      {error && !loading && (
        <div className="dashboard-alert" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="dashboard-sections">
          <h2>Assigned Assets ({assetCount})</h2>
          {assetCount === 0 ? (
            <p className="no-data">No assets have been assigned to you yet.</p>
          ) : (
            <div className="roles-grid">
              {assets.map((asset) => (
                <div key={asset.id} className="role-card">
                  <h3>{asset.name}</h3>
                  <p><strong>Status:</strong> {asset.status || 'Unknown'}</p>
                  {asset.serialNumber && (
                    <p><strong>Serial:</strong> {asset.serialNumber}</p>
                  )}
                  {asset.purchaseDate && (
                    <p><strong>Purchased:</strong> {new Date(asset.purchaseDate).toLocaleDateString()}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
