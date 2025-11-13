/* global jest, describe, test, expect, beforeEach */
/* eslint react/react-in-jsx-scope: 0 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EmployeeLogin from '../EmployeeLogin';
import { useEmployeeAuth } from '../../contexts/EmployeeAuthContext';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

jest.mock('../../contexts/EmployeeAuthContext', () => ({
  useEmployeeAuth: jest.fn()
}));

describe('EmployeeLogin Component', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    useEmployeeAuth.mockReturnValue({
      login: mockLogin
    });
  });

  test('renders employee login form', () => {
    render(
      <MemoryRouter>
        <EmployeeLogin />
      </MemoryRouter>
    );

    expect(screen.getByText(/Employee Portal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  test('submits credentials and navigates on success', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });

    render(
      <MemoryRouter>
        <EmployeeLogin />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'employee' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('employee', 'secret'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/employee/assets', { replace: true }));
  });
});
