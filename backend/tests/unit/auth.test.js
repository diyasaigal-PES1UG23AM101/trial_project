const {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  extractTokenFromHeader
} = require('../../src/utils/auth');

describe('Auth Utils', () => {
  const TEST_SECRET = 'test-secret-key';
  const TEST_PAYLOAD = { adminId: 1, username: 'admin', role: 'Admin' };

  describe('generateToken', () => {
    test('should generate a valid JWT token', () => {
      const token = generateToken(TEST_PAYLOAD, TEST_SECRET);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('should generate token with custom expiration', () => {
      const token = generateToken(TEST_PAYLOAD, TEST_SECRET, '1h');
      expect(token).toBeDefined();
      const decoded = verifyToken(token, TEST_SECRET);
      expect(decoded.adminId).toBe(TEST_PAYLOAD.adminId);
    });

    test('should throw error if payload is missing', () => {
      expect(() => generateToken(null, TEST_SECRET)).toThrow('Payload and secret are required');
      expect(() => generateToken(undefined, TEST_SECRET)).toThrow('Payload and secret are required');
    });

    test('should throw error if secret is missing', () => {
      expect(() => generateToken(TEST_PAYLOAD, null)).toThrow('Payload and secret are required');
      expect(() => generateToken(TEST_PAYLOAD, undefined)).toThrow('Payload and secret are required');
    });
  });

  describe('verifyToken', () => {
    test('should verify a valid token', () => {
      const token = generateToken(TEST_PAYLOAD, TEST_SECRET);
      const decoded = verifyToken(token, TEST_SECRET);
      expect(decoded.adminId).toBe(TEST_PAYLOAD.adminId);
      expect(decoded.username).toBe(TEST_PAYLOAD.username);
      expect(decoded.role).toBe(TEST_PAYLOAD.role);
    });

    test('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      expect(() => verifyToken(invalidToken, TEST_SECRET)).toThrow();
    });

    test('should throw error for token with wrong secret', () => {
      const token = generateToken(TEST_PAYLOAD, TEST_SECRET);
      expect(() => verifyToken(token, 'wrong-secret')).toThrow();
    });

    test('should throw error if token is missing', () => {
      expect(() => verifyToken(null, TEST_SECRET)).toThrow('Token and secret are required');
      expect(() => verifyToken(undefined, TEST_SECRET)).toThrow('Token and secret are required');
    });

    test('should throw error if secret is missing', () => {
      const token = generateToken(TEST_PAYLOAD, TEST_SECRET);
      expect(() => verifyToken(token, null)).toThrow('Token and secret are required');
      expect(() => verifyToken(token, undefined)).toThrow('Token and secret are required');
    });
  });

  describe('hashPassword', () => {
    test('should hash a password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20); // bcrypt hashes are long
    });

    test('should produce different hashes for same password', async () => {
      const password = 'testpassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2); // Different salts
    });

    test('should throw error for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password must be a non-empty string');
    });

    test('should throw error for password shorter than 6 characters', async () => {
      await expect(hashPassword('short')).rejects.toThrow('Password must be at least 6 characters long');
      await expect(hashPassword('abc')).rejects.toThrow('Password must be at least 6 characters long');
    });

    test('should throw error for non-string password', async () => {
      await expect(hashPassword(null)).rejects.toThrow('Password must be a non-empty string');
      await expect(hashPassword(123)).rejects.toThrow('Password must be a non-empty string');
      await expect(hashPassword(undefined)).rejects.toThrow('Password must be a non-empty string');
    });

    test('should hash password with custom salt rounds', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password, 8);
      expect(hash).toBeDefined();
      // Should still be valid bcrypt hash
      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });
  });

  describe('comparePassword', () => {
    test('should return true for matching passwords', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    test('should return false for non-matching passwords', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = await hashPassword(password);
      const result = await comparePassword(wrongPassword, hash);
      expect(result).toBe(false);
    });

    test('should throw error if password is missing', async () => {
      const hash = await hashPassword('testpassword123');
      await expect(comparePassword(null, hash)).rejects.toThrow('Both password and hashedPassword are required');
      await expect(comparePassword(undefined, hash)).rejects.toThrow('Both password and hashedPassword are required');
    });

    test('should throw error if hashedPassword is missing', async () => {
      await expect(comparePassword('testpassword123', null)).rejects.toThrow('Both password and hashedPassword are required');
      await expect(comparePassword('testpassword123', undefined)).rejects.toThrow('Both password and hashedPassword are required');
    });
  });

  describe('extractTokenFromHeader', () => {
    test('should extract token from valid Bearer header', () => {
      const token = 'test-token-123';
      const authHeader = `Bearer ${token}`;
      const extracted = extractTokenFromHeader(authHeader);
      expect(extracted).toBe(token);
    });

    test('should return null for invalid header format', () => {
      expect(extractTokenFromHeader('InvalidFormat token')).toBeNull();
      expect(extractTokenFromHeader('token')).toBeNull();
      expect(extractTokenFromHeader('Bearer')).toBeNull();
    });

    test('should return null for missing header', () => {
      expect(extractTokenFromHeader(null)).toBeNull();
      expect(extractTokenFromHeader(undefined)).toBeNull();
      expect(extractTokenFromHeader('')).toBeNull();
    });

    test('should return null for non-string header', () => {
      expect(extractTokenFromHeader(123)).toBeNull();
      expect(extractTokenFromHeader({})).toBeNull();
    });

    test('should handle token with spaces', () => {
      const token = 'test.token.here';
      const authHeader = `Bearer ${token}`;
      const extracted = extractTokenFromHeader(authHeader);
      expect(extracted).toBe(token);
    });
  });
});

