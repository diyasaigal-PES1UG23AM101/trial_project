const TRUE_VALUES = ['true', '1', 'yes', 'y', 'enabled', 'on'];

function normalizeString(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function parseBooleanFlag(value) {
  const normalized = normalizeString(value);
  return TRUE_VALUES.includes(normalized);
}

function parseDurationToMinutes(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const stringValue = String(value).trim().toLowerCase();

  // plain integer minutes
  if (/^\d+$/.test(stringValue)) {
    return Number.parseInt(stringValue, 10);
  }

  const hourMatch = stringValue.match(/^(\d+)\s*(h|hr|hrs|hour|hours)$/);
  if (hourMatch) {
    const hours = Number.parseInt(hourMatch[1], 10);
    return hours * 60;
  }

  const minuteMatch = stringValue.match(/^(\d+)\s*(m|min|mins|minute|minutes)$/);
  if (minuteMatch) {
    return Number.parseInt(minuteMatch[1], 10);
  }

  // formats like "24h" or "30m"
  const compactMatch = stringValue.match(/^(\d+)(h|m)$/);
  if (compactMatch) {
    const amount = Number.parseInt(compactMatch[1], 10);
    const unit = compactMatch[2];
    return unit === 'h' ? amount * 60 : amount;
  }

  return null;
}

function isMfaEnabled(env = process.env) {
  return parseBooleanFlag(env.MFA_ENABLED);
}

function isTlsEnforced(env = process.env) {
  if (parseBooleanFlag(env.TLS_ENABLED)) {
    return true;
  }

  const urls = [
    env.API_BASE_URL,
    env.FRONTEND_URL,
    env.BACKEND_URL,
    env.VITE_API_URL
  ];

  return urls
    .filter(Boolean)
    .some((url) => typeof url === 'string' && url.trim().toLowerCase().startsWith('https://'));
}

function getSessionTimeoutMinutes(env = process.env) {
  const candidates = [
    env.SESSION_TIMEOUT_MINUTES,
    env.SESSION_TIMEOUT,
    env.JWT_TIMEOUT_MINUTES,
    env.JWT_EXPIRATION_MINUTES,
    env.JWT_EXPIRES_IN
  ];

  for (const candidate of candidates) {
    const parsed = parseDurationToMinutes(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function isSessionTimeoutValid(env = process.env, options = {}) {
  const { minMinutes = 5, maxMinutes = 1440 } = options;
  const minutes = getSessionTimeoutMinutes(env);

  if (typeof minutes !== 'number') {
    return false;
  }

  return minutes >= minMinutes && minutes <= maxMinutes;
}

module.exports = {
  parseBooleanFlag,
  parseDurationToMinutes,
  isMfaEnabled,
  isTlsEnforced,
  getSessionTimeoutMinutes,
  isSessionTimeoutValid
};

