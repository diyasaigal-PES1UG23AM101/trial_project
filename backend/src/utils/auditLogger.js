const MAX_LOGS = 1000;

let auditLogs = [];

function timestampNow() {
  return new Date().toISOString();
}

function sanitizeString(value) {
  if (value === null || value === undefined) {
    return undefined;
  }
  return String(value);
}

function recordAuditEvent(event) {
  if (!event || typeof event !== 'object') {
    throw new Error('Audit event must be an object');
  }

  const { type, actorId, actorName, details = {} } = event;
  if (!type) {
    throw new Error('Audit event type is required');
  }

  const logEntry = {
    type,
    actorId: sanitizeString(actorId),
    actorName: sanitizeString(actorName),
    details,
    at: event.at || timestampNow()
  };

  auditLogs.push(logEntry);

  if (auditLogs.length > MAX_LOGS) {
    auditLogs = auditLogs.slice(-MAX_LOGS);
  }

  return logEntry;
}

function recordLoginEvent({ adminId, username, success, reason, at } = {}) {
  return recordAuditEvent({
    type: 'LOGIN',
    actorId: adminId,
    actorName: username,
    details: {
      success: Boolean(success),
      reason: reason ? String(reason) : undefined
    },
    at
  });
}

function recordAssetChange({ assetId, action, performedBy, performedById, at } = {}) {
  if (!assetId) {
    throw new Error('assetId is required for asset change events');
  }

  const details = {
    assetId: String(assetId),
    action: action ? String(action) : undefined
  };

  return recordAuditEvent({
    type: 'ASSET_CHANGE',
    actorId: performedById,
    actorName: performedBy,
    details,
    at
  });
}

function getAuditLogs(filter = {}) {
  const { type } = filter;
  if (!type) {
    return [...auditLogs];
  }

  return auditLogs.filter((entry) => entry.type === type);
}

function clearAuditLogs() {
  auditLogs = [];
}

module.exports = {
  recordAuditEvent,
  recordLoginEvent,
  recordAssetChange,
  getAuditLogs,
  clearAuditLogs,
  MAX_LOGS
};

