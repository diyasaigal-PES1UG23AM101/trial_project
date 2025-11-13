const {
  recordAuditEvent,
  recordLoginEvent,
  recordAssetChange,
  getAuditLogs,
  clearAuditLogs,
  MAX_LOGS
} = require('../../src/utils/auditLogger');

describe('auditLogger utilities', () => {
  beforeEach(() => {
    clearAuditLogs();
  });

  describe('recordLoginEvent', () => {
    test('stores successful login event', () => {
      const entry = recordLoginEvent({
        adminId: 1,
        username: 'adminUser',
        success: true
      });

      expect(entry.type).toBe('LOGIN');
      expect(entry.actorId).toBe('1');
      expect(entry.actorName).toBe('adminUser');
      expect(entry.details.success).toBe(true);

      const logs = getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject(entry);
    });

    test('captures failure reason for unsuccessful login', () => {
      recordLoginEvent({
        adminId: '42',
        username: 'lockedAdmin',
        success: false,
        reason: 'Account locked'
      });

      const logs = getAuditLogs({ type: 'LOGIN' });
      expect(logs).toHaveLength(1);
      expect(logs[0].details).toMatchObject({
        success: false,
        reason: 'Account locked'
      });
    });
  });

  describe('recordAssetChange', () => {
    test('stores asset change event with actor info', () => {
      const entry = recordAssetChange({
        assetId: 99,
        action: 'ASSIGNED',
        performedBy: 'Admin Tester',
        performedById: 5
      });

      expect(entry.type).toBe('ASSET_CHANGE');
      expect(entry.actorId).toBe('5');
      expect(entry.actorName).toBe('Admin Tester');
      expect(entry.details.assetId).toBe('99');
      expect(entry.details.action).toBe('ASSIGNED');

      const logs = getAuditLogs({ type: 'ASSET_CHANGE' });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject(entry);
    });

    test('throws when assetId missing', () => {
      expect(() => recordAssetChange({ action: 'UPDATED' })).toThrow('assetId is required');
    });
  });

  describe('recordAuditEvent', () => {
    test('rejects missing event object', () => {
      expect(() => recordAuditEvent()).toThrow('Audit event must be an object');
    });

    test('rejects missing event type', () => {
      expect(() => recordAuditEvent({})).toThrow('Audit event type is required');
    });
  });

  describe('log retention', () => {
    test('keeps only the most recent MAX_LOGS entries', () => {
      for (let index = 0; index < MAX_LOGS + 5; index += 1) {
        recordLoginEvent({
          adminId: index,
          username: `user-${index}`,
          success: true,
          at: `2025-01-01T00:00:00.${index}Z`
        });
      }

      const logs = getAuditLogs();
      expect(logs).toHaveLength(MAX_LOGS);
      expect(logs[0].actorName).toBe(`user-${5}`);
    });
  });
});

