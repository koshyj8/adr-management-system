/**
 * Utility helper functions
 */

/**
 * Format a database row into a consistent API response
 */
function formatUser(user) {
  if (!user) return null;
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

/**
 * Generate the next ADR number
 */
function getNextAdrNumber(db) {
  const result = db.prepare('SELECT MAX(adr_number) as max_num FROM adrs').get();
  return (result.max_num || 0) + 1;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Paginate results
 */
function paginate(page = 1, limit = 10) {
  const p = Math.max(1, page || 1);
  const l = Math.max(1, limit || 10);
  const offset = (p - 1) * l;
  return { limit: l, offset, page: p };
}

module.exports = { formatUser, getNextAdrNumber, isValidEmail, paginate };
