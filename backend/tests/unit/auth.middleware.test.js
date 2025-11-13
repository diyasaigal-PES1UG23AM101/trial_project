const { authenticateToken } = require('../../src/middleware/auth');
const { verifyToken, extractTokenFromHeader } = require('../../src/utils/auth');

// Mock the utils
jest.mock('../../src/utils/auth', () => ({
  verifyToken: jest.fn(),
  extractTokenFromHeader: jest.fn()
}));

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    
    process.env.JWT_SECRET = 'test-secret-key';
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('authenticateToken', () => {
    test('should call next() for valid token', () => {
      const mockToken = 'valid-token';
      const mockDecoded = { adminId: 1, username: 'admin', role: 'Admin' };

      req.headers['authorization'] = `Bearer ${mockToken}`;
      
      extractTokenFromHeader.mockReturnValue(mockToken);
      verifyToken.mockReturnValue(mockDecoded);

      authenticateToken(req, res, next);

      expect(extractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${mockToken}`);
      expect(verifyToken).toHaveBeenCalledWith(mockToken, 'test-secret-key');
      expect(req.user).toEqual(mockDecoded);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 401 if no token provided', () => {
      req.headers['authorization'] = undefined;
      extractTokenFromHeader.mockReturnValue(null);

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. No token provided.' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 if Authorization header is missing', () => {
      delete req.headers['authorization'];
      extractTokenFromHeader.mockReturnValue(null);

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. No token provided.' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 if token is expired', () => {
      const mockToken = 'expired-token';
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';

      req.headers['authorization'] = `Bearer ${mockToken}`;
      extractTokenFromHeader.mockReturnValue(mockToken);
      verifyToken.mockImplementation(() => {
        throw expiredError;
      });

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token has expired. Please login again.' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 if token is invalid', () => {
      const mockToken = 'invalid-token';
      const invalidError = new Error('Invalid token');
      invalidError.name = 'JsonWebTokenError';

      req.headers['authorization'] = `Bearer ${mockToken}`;
      extractTokenFromHeader.mockReturnValue(mockToken);
      verifyToken.mockImplementation(() => {
        throw invalidError;
      });

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token.' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 for other token verification errors', () => {
      const mockToken = 'bad-token';
      const genericError = new Error('Some other error');

      req.headers['authorization'] = `Bearer ${mockToken}`;
      extractTokenFromHeader.mockReturnValue(mockToken);
      verifyToken.mockImplementation(() => {
        throw genericError;
      });

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token verification failed.' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should use default JWT_SECRET if not set', () => {
      delete process.env.JWT_SECRET;
      const mockToken = 'valid-token';
      const mockDecoded = { adminId: 1, username: 'admin' };

      req.headers['authorization'] = `Bearer ${mockToken}`;
      extractTokenFromHeader.mockReturnValue(mockToken);
      verifyToken.mockReturnValue(mockDecoded);

      authenticateToken(req, res, next);

      expect(verifyToken).toHaveBeenCalledWith(mockToken, 'your-secret-key-change-in-production');
      expect(next).toHaveBeenCalled();
    });

    test('should handle token extraction from different header formats', () => {
      const mockToken = 'valid-token';
      const mockDecoded = { adminId: 1, username: 'admin' };

      req.headers['authorization'] = 'Bearer valid-token';
      extractTokenFromHeader.mockReturnValue(mockToken);
      verifyToken.mockReturnValue(mockDecoded);

      authenticateToken(req, res, next);

      expect(extractTokenFromHeader).toHaveBeenCalledWith('Bearer valid-token');
      expect(next).toHaveBeenCalled();
    });

    test('should attach decoded user to request object', () => {
      const mockToken = 'valid-token';
      const mockDecoded = { adminId: 1, username: 'admin', role: 'Admin' };

      req.headers['authorization'] = `Bearer ${mockToken}`;
      extractTokenFromHeader.mockReturnValue(mockToken);
      verifyToken.mockReturnValue(mockDecoded);

      authenticateToken(req, res, next);

      expect(req.user).toEqual(mockDecoded);
      expect(req.user.adminId).toBe(1);
      expect(req.user.username).toBe('admin');
    });
  });
});

