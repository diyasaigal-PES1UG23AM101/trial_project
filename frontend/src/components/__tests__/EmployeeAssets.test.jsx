/* global jest, describe, test, expect, beforeEach */
/* eslint react/react-in-jsx-scope: 0 */
import { render, screen, waitFor } from '@testing-library/react';
import EmployeeAssets from '../EmployeeAssets';
import { useEmployeeAuth } from '../../contexts/EmployeeAuthContext';
import { getAssignedAssets } from '../../services/assetService';

jest.mock('../../contexts/EmployeeAuthContext', () => ({
  useEmployeeAuth: jest.fn()
}));

jest.mock('../../services/assetService', () => ({
  getAssignedAssets: jest.fn()
}));

describe('EmployeeAssets Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useEmployeeAuth.mockReturnValue({
      employee: {
        fullName: 'Employee User',
        username: 'employee'
      },
      logout: jest.fn()
    });
  });

  test('renders assigned assets list', async () => {
    getAssignedAssets.mockResolvedValueOnce({
      success: true,
      assets: [
        { id: 1, name: 'Laptop', status: 'active', serialNumber: 'SN-001' }
      ]
    });

    render(<EmployeeAssets />);

    await waitFor(() => expect(getAssignedAssets).toHaveBeenCalled());
    expect(screen.getByText(/Assigned Assets/i)).toBeInTheDocument();
    expect(screen.getByText(/Laptop/i)).toBeInTheDocument();
    expect(screen.getByText(/SN-001/i)).toBeInTheDocument();
  });

  test('shows empty state when no assets are assigned', async () => {
    getAssignedAssets.mockResolvedValueOnce({ success: true, assets: [] });

    render(<EmployeeAssets />);

    await waitFor(() => expect(getAssignedAssets).toHaveBeenCalled());
    expect(screen.getByText(/No assets have been assigned/i)).toBeInTheDocument();
  });
});
