const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

/**
 * Generates a JWT token for a user.
 * @param {Object} payload - Data to include in the token.
 * @param {string} [secret] - Secret key to sign the token.
 * @param {string} [expiresIn] - Expiration time for the token.
 * @returns {string} - Signed JWT token.
 */
function generateToken(payload, secret = process.env.JWT_SECRET, expiresIn = '1d') {
  if (!payload || !secret) {
    throw new Error('Payload and secret are required');
  }
  if (typeof secret === 'undefined' || secret === null) {
    throw new Error('Payload and secret are required');
  }
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Compares a plaintext password with a hashed password.
 * @param {string} password - The plaintext password.
 * @param {string} hash - The hashed password from the database.
 * @returns {Promise<boolean>} - True if passwords match.
 */
async function comparePasswords(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Hashes a plaintext password.
 * @param {string} password - The plaintext password.
 * @param {number} [saltRounds] - Number of salt rounds for hashing.
 * @returns {Promise<string>} - The hashed password.
 */
async function hashPassword(password, saltRounds = 10) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(password, salt);
}

/**
 * Verifies a JWT token.
 * @param {string} token - The JWT token to verify.
 * @param {string} [secret] - Secret key to verify the token.
 * @returns {Object} - Decoded token payload.
 */
function verifyToken(token, secret = process.env.JWT_SECRET) {
  if (!token || !secret) {
    throw new Error('Token and secret are required');
  }
  if (typeof secret === 'undefined' || secret === null) {
    throw new Error('Token and secret are required');
  }
  return jwt.verify(token, secret);
}

/**
 * Compares a plaintext password with a hashed password.
 * @param {string} password - The plaintext password.
 * @param {string} hashedPassword - The hashed password from the database.
 * @returns {Promise<boolean>} - True if passwords match.
 */
async function comparePassword(password, hashedPassword) {
  if (typeof password !== 'string' || typeof hashedPassword !== 'string' || !password || !hashedPassword) {
    throw new Error('Both password and hashedPassword are required');
  }
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Extracts a JWT token from an authorization header.
 * @param {string} header - The authorization header.
 * @returns {string|null} - The extracted token or null if not found.
 */
function extractTokenFromHeader(header) {
  if (typeof header !== 'string') return null;
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  comparePasswords, // legacy export
  extractTokenFromHeader,
};
