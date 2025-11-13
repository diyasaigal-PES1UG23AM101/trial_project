/* global jest, describe, test, expect, beforeEach */
/* eslint react/react-in-jsx-scope: 0 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: jest.fn(() => mockNavigate)
  };
});

jest.mock('axios');

jest.mock('../../contexts/AuthContext', () => {
  const mockUseAuth = jest.fn();

  const AuthProvider = ({ children }) => children;

  return {
    useAuth: mockUseAuth,
    AuthProvider
  };
});

describe('Dashboard Component', () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogout.mockClear();
    mockNavigate.mockClear();
    axios.get.mockResolvedValue({ data: { data: [] } });
  });

  const renderDashboard = (adminOverrides = {}) => {
    useAuth.mockReturnValue({
      admin: {
        username: 'adminuser',
        fullName: 'Admin User',
        email: 'admin@example.com',
        role: 'Admin',
        modules: ['assets', 'licenses', 'roles'],
        ...adminOverrides
      },
      logout: mockLogout
    });

    return render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
  };

  test('renders admin info and assigned module sections', async () => {
    renderDashboard();

    await waitFor(() =>
      expect(screen.queryByText(/Loading dashboard/i)).not.toBeInTheDocument()
    );

    expect(screen.getByText(/Welcome, Admin User/i)).toBeInTheDocument();
    expect(screen.getByText(/adminuser/i)).toBeInTheDocument();
    expect(screen.getByText(/admin@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Admin/i, { selector: '.role-badge' })).toBeInTheDocument();

    expect(screen.getByText(/Assets \(0\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Licenses \(0\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Monitoring/i)).not.toBeInTheDocument();

    expect(screen.getByText(/Manage Roles/i)).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith('/api/dashboard/assets');
    expect(axios.get).toHaveBeenCalledWith('/api/dashboard/licenses');
  });

  test('hides manage roles quick action when module not assigned', async () => {
    renderDashboard({ modules: ['assets'] });

    await waitFor(() =>
      expect(screen.queryByText(/Loading dashboard/i)).not.toBeInTheDocument()
    );

    expect(screen.queryByText(/Manage Roles/i)).not.toBeInTheDocument();
    expect(screen.getByText(/No quick actions available/i)).toBeInTheDocument();
  });

  test('logout button triggers logout handler', async () => {
    renderDashboard();

    await waitFor(() =>
      expect(screen.queryByText(/Loading dashboard/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByText(/Logout/i));
    expect(mockLogout).toHaveBeenCalled();
  });
});
