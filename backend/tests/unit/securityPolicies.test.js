const {
  parseBooleanFlag,
  parseDurationToMinutes,
  isMfaEnabled,
  isTlsEnforced,
  getSessionTimeoutMinutes,
  isSessionTimeoutValid
} = require('../../src/utils/securityPolicies');

describe('securityPolicies utilities', () => {
  describe('parseBooleanFlag', () => {
    test.each([
      ['true'],
      ['TRUE'],
      ['  yes '],
      ['Enabled'],
      ['1'],
      ['On']
    ])('returns true for truthy value "%s"', (value) => {
      expect(parseBooleanFlag(value)).toBe(true);
    });

    test.each([
      [null],
      [undefined],
      ['false'],
      ['0'],
      ['disabled'],
      ['no']
    ])('returns false for falsy value "%s"', (value) => {
      expect(parseBooleanFlag(value)).toBe(false);
    });
  });

  describe('parseDurationToMinutes', () => {
    test.each([
      [30, 30],
      ['30', 30],
      ['15m', 15],
      ['2h', 120],
      [' 90 minutes ', 90],
      ['4 hours', 240]
    ])('parses "%s" into %i minutes', (input, expected) => {
      expect(parseDurationToMinutes(input)).toBe(expected);
    });

    test.each([
      ['abc'],
      [''],
      [null],
      ['-5'],
      ['30seconds']
    ])('returns null for invalid duration "%s"', (input) => {
      expect(parseDurationToMinutes(input)).toBeNull();
    });
  });

  describe('isMfaEnabled', () => {
    test('returns true when MFA_ENABLED flag is set', () => {
      const env = { MFA_ENABLED: 'true' };
      expect(isMfaEnabled(env)).toBe(true);
    });

    test('returns false when MFA flag is missing', () => {
      const env = {};
      expect(isMfaEnabled(env)).toBe(false);
    });
  });

  describe('isTlsEnforced', () => {
    test('returns true when TLS flag is set', () => {
      const env = { TLS_ENABLED: 'enabled' };
      expect(isTlsEnforced(env)).toBe(true);
    });

    test('returns true when any known URL uses https', () => {
      const env = { API_BASE_URL: 'https://secure.example.com' };
      expect(isTlsEnforced(env)).toBe(true);
    });

    test('returns false when TLS flag and URLs are not secure', () => {
      const env = { API_BASE_URL: 'http://localhost:5000' };
      expect(isTlsEnforced(env)).toBe(false);
    });
  });

  describe('session timeout helpers', () => {
    test('getSessionTimeoutMinutes returns numeric minutes', () => {
      const env = { SESSION_TIMEOUT_MINUTES: '45' };
      expect(getSessionTimeoutMinutes(env)).toBe(45);
    });

    test('getSessionTimeoutMinutes understands hour notation', () => {
      const env = { SESSION_TIMEOUT: '24h' };
      expect(getSessionTimeoutMinutes(env)).toBe(1440);
    });

    test('isSessionTimeoutValid returns true for defaults within range', () => {
      const env = { SESSION_TIMEOUT_MINUTES: '30' };
      expect(isSessionTimeoutValid(env)).toBe(true);
    });

    test('isSessionTimeoutValid returns false when timeout is too short', () => {
      const env = { SESSION_TIMEOUT_MINUTES: '2' };
      expect(isSessionTimeoutValid(env)).toBe(false);
    });

    test('isSessionTimeoutValid returns false when timeout missing', () => {
      const env = {};
      expect(isSessionTimeoutValid(env)).toBe(false);
    });
  });
});

