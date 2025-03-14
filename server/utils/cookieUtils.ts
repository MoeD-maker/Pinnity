/**
 * Cookie Utility Functions
 * 
 * Provides standardized methods for working with cookies securely across the application.
 * These utilities ensure consistent cookie handling with proper security attributes.
 */

import { Request, Response } from 'express';
import { 
  baseCookieConfig, 
  authCookieConfig, 
  csrfCookieConfig,
  sessionCookieConfig,
  transientCookieConfig,
  logCookieOperation
} from './cookieConfig';

/**
 * Set a secure cookie with the specified name, value, and options
 * @param res Express response object
 * @param name Cookie name
 * @param value Cookie value
 * @param options Cookie options (defaults to base secure config)
 */
export function setSecureCookie(
  res: Response, 
  name: string, 
  value: string, 
  options = baseCookieConfig
): void {
  // Apply secure cookie settings
  res.cookie(name, value, options);
  logCookieOperation(name, 'set');
}

/**
 * Set a secure authentication cookie (with auth-specific settings)
 * @param res Express response object
 * @param name Cookie name
 * @param value Cookie value
 * @param options Additional cookie options to merge with auth defaults
 */
export function setAuthCookie(
  res: Response,
  name: string,
  value: string, 
  options = {}
): void {
  setSecureCookie(res, name, value, { ...authCookieConfig, ...options });
}

/**
 * Set a CSRF token cookie
 * @param res Express response object
 * @param name Cookie name
 * @param value CSRF token value
 * @param options Additional cookie options to merge with CSRF defaults
 */
export function setCsrfCookie(
  res: Response,
  name: string,
  value: string,
  options = {}
): void {
  setSecureCookie(res, name, value, { ...csrfCookieConfig, ...options });
}

/**
 * Set a session cookie
 * @param res Express response object
 * @param name Cookie name
 * @param value Session identifier value
 * @param options Additional cookie options to merge with session defaults
 */
export function setSessionCookie(
  res: Response,
  name: string,
  value: string,
  options = {}
): void {
  setSecureCookie(res, name, value, { ...sessionCookieConfig, ...options });
}

/**
 * Set a short-lived transient cookie
 * @param res Express response object
 * @param name Cookie name
 * @param value Cookie value
 * @param options Additional cookie options to merge with transient defaults
 */
export function setTransientCookie(
  res: Response,
  name: string,
  value: string,
  options = {}
): void {
  setSecureCookie(res, name, value, { ...transientCookieConfig, ...options });
}

/**
 * Clear a cookie by setting it to expire immediately
 * @param res Express response object
 * @param name Cookie name to clear
 * @param options Cookie options (path/domain must match the set cookie)
 */
export function clearCookie(
  res: Response,
  name: string,
  options = { path: '/' }
): void {
  res.clearCookie(name, options);
  logCookieOperation(name, 'clear');
}

/**
 * Get a cookie value safely
 * @param req Express request object
 * @param name Cookie name
 * @param signed Whether to get a signed cookie
 * @returns Cookie value or undefined if not found
 */
export function getCookie(
  req: Request, 
  name: string, 
  signed: boolean = true
): string | undefined {
  const value = signed ? req.signedCookies[name] : req.cookies[name];
  logCookieOperation(name, 'read');
  return value;
}

/**
 * Verify cookie has secure attributes
 * Useful for validating third-party cookies or debugging
 * @param name Cookie name
 * @param cookieHeader Cookie header string
 * @returns Object with validation results
 */
export function validateCookieSecurity(
  name: string,
  cookieHeader: string
): { 
  isSecure: boolean; 
  hasHttpOnly: boolean; 
  hasSameSite: boolean; 
  issues: string[] 
} {
  const result = {
    isSecure: cookieHeader.includes('Secure'),
    hasHttpOnly: cookieHeader.includes('HttpOnly'),
    hasSameSite: /SameSite=(Strict|Lax|None)/.test(cookieHeader),
    issues: [] as string[]
  };

  if (!result.isSecure) {
    result.issues.push(`Cookie '${name}' missing Secure flag`);
  }
  
  if (!result.hasHttpOnly) {
    result.issues.push(`Cookie '${name}' missing HttpOnly flag`);
  }
  
  if (!result.hasSameSite) {
    result.issues.push(`Cookie '${name}' missing SameSite attribute`);
  } else if (cookieHeader.includes('SameSite=None') && !cookieHeader.includes('Secure')) {
    result.issues.push(`Cookie '${name}' has SameSite=None but missing Secure flag`);
  }

  return result;
}

/**
 * Utility to apply proper security headers when setting cookies
 * @param res Express response object
 */
export function applyCookieSecurityHeaders(res: Response): void {
  // Prevent cookies from being observed by third parties with Fetch Metadata
  res.setHeader('Sec-Fetch-Site', 'same-origin');
  
  // Ensure proper Content-Type to prevent MIME sniffing attacks
  if (!res.get('Content-Type')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  
  // Add Content-Security-Policy header if not already set
  if (!res.get('Content-Security-Policy')) {
    res.setHeader(
      'Content-Security-Policy', 
      "default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self';"
    );
  }
}