import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useEmployee } from '../contexts/EmployeeContext';
import { useEmployeeAuth } from '../contexts/EmployeeAuthContext';
import './Login.css';

export default function EmployeeLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const legacyEmployee = useEmployee();
  const employeeAuth = useEmployeeAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (employeeAuth?.login) {
        await employeeAuth.login(username, password);
        setTimeout(() => {
          navigate('/employee/assets', { replace: true });
        }, 150);
      } else if (legacyEmployee?.login) {
        await legacyEmployee.login(username, password);
        navigate('/employee/dashboard');
      } else {
        throw new Error('Employee authentication is not configured');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Employee Portal</h1>
          <p>Access your assigned assets</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="employee-username">Username</label>
            <input
              id="employee-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="employee-password">Password</label>
            <input
              id="employee-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>Don&apos;t have an account? <a href="/employee/register">Register here</a></p>
          <p>
            Need admin access? <Link to="/login">Go to admin login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}