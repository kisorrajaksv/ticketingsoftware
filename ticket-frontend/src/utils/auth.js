/**
 * Authentication and Token Management Utilities
 */

// Decode JWT token payload safely without external dependencies
export function parseJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Clear all auth-related keys from localStorage
export function clearAuthSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userId');
  localStorage.removeItem('userAvatar');
}

// Check whether token is syntactically valid and unexpired (with 10-second buffer)
export function isTokenValid(token) {
  if (!token) return false;
  const decoded = parseJwt(token);
  if (!decoded) return false;
  if (!decoded.exp) return true;
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp > currentTime + 10;
}

// Get valid token from localStorage or clear stale session and return null
export function getValidToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  if (!isTokenValid(token)) {
    clearAuthSession();
    return null;
  }
  return token;
}

// Check if user is currently authenticated
export function isAuthenticated() {
  return Boolean(getValidToken());
}
