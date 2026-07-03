/**
 * Canonical admin check — single source of truth for every route.
 * A user has admin access if ANY of these are true:
 *   1. user.isAdmin === true   (explicit DB flag)
 *   2. user.role === 'admin'   (role-based)
 *   3. email is in ADMIN_EMAILS env var (email whitelist fallback)
 *
 * This function is used in:
 *   - auth.js     (auto-set isAdmin on first login for whitelisted emails)
 *   - desktop.js  (bypass premium check)
 *   - ai.js       (bypass rate limit)
 *   - client-side (via /api/auth/me returning isAdmin)
 */

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ||
  process.env.DESKTOP_ADMIN_EMAILS ||
  'khajamoulalis@gmail.com,skhajamoulali8@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

function checkIsAdmin(user) {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  if (user.role === 'admin') return true;
  if (ADMIN_EMAILS.includes((user.email || '').toLowerCase())) return true;
  return false;
}

module.exports = { checkIsAdmin, ADMIN_EMAILS };
