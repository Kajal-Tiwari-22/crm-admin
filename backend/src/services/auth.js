const crypto = require('crypto');

const COOKIE_NAME = 'crm_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const SOCKET_TOKEN_TTL_SECONDS = 5 * 60;

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be configured with at least 32 characters.');
  }
  return secret;
}

function sign(payload) {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

function createSessionCookie() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `admin:${expiresAt}`;
  const value = `${payload}.${sign(payload)}`;
  const isProduction = process.env.NODE_ENV === 'production';
  const secure = isProduction ? '; Secure' : '';
  return `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

function createSocketToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + SOCKET_TOKEN_TTL_SECONDS;
  const payload = `socket:${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

function clearSessionCookie() {
  const isProduction = process.env.NODE_ENV === 'production';
  const secure = isProduction ? '; Secure' : '';
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

function readCookie(cookieHeader, name) {
  const item = (cookieHeader || '').split(';').map(value => value.trim())
    .find(value => value.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
}

function isValidSession(cookieHeader) {
  const value = readCookie(cookieHeader, COOKIE_NAME);
  return isValidSignedToken(value, 'admin');
}

function isValidSocketToken(token) {
  return isValidSignedToken(token, 'socket');
}

function isValidSignedToken(value, expectedSubject) {
  if (typeof value !== 'string') return false;
  const separator = value.lastIndexOf('.');
  if (separator < 1) return false;

  const payload = value.slice(0, separator);
  const suppliedSignature = value.slice(separator + 1);
  const expectedSignature = sign(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return false;

  const [subject, expiresAt] = payload.split(':');
  return subject === expectedSubject && Number(expiresAt) > Math.floor(Date.now() / 1000);
}

function authenticateAdmin(req, res, next) {
  try {
    if (isValidSession(req.headers.cookie)) return next();
    return res.status(401).json({ success: false, message: 'Sign in to continue.' });
  } catch (error) {
    console.error('[Auth] Session validation failed:', error.message);
    return res.status(503).json({ success: false, message: 'Authentication is not configured.' });
  }
}

module.exports = {
  COOKIE_NAME,
  authenticateAdmin,
  clearSessionCookie,
  createSessionCookie,
  createSocketToken,
  isValidSession,
  isValidSocketToken
};
