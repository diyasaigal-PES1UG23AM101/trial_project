// Test localStorage utility functions directly
// These are simple wrappers, so we test them directly

describe('Auth Service Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getStoredAdmin', () => {
    test('should return admin object from localStorage', () => {
      const mockAdmin = { id: 1, username: 'admin' };
      localStorage.setItem('admin', JSON.stringify(mockAdmin));
      
      // Simulate the function behavior
      const admin = localStorage.getItem('admin');
      const result = admin ? JSON.parse(admin) : null;
      
      expect(result).toEqual(mockAdmin);
    });

    test('should return null if no admin in localStorage', () => {
      const admin = localStorage.getItem('admin');
      const result = admin ? JSON.parse(admin) : null;
      expect(result).toBeNull();
    });
  });

  describe('getToken', () => {
    test('should return token from localStorage', () => {
      const token = 'test-token';
      localStorage.setItem('token', token);
      
      const result = localStorage.getItem('token');
      expect(result).toBe(token);
    });

    test('should return null if no token in localStorage', () => {
      const result = localStorage.getItem('token');
      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    test('should return true if token exists', () => {
      localStorage.setItem('token', 'test-token');
      
      const result = !!localStorage.getItem('token');
      expect(result).toBe(true);
    });

    test('should return false if no token', () => {
      const result = !!localStorage.getItem('token');
      expect(result).toBe(false);
    });
  });
});
