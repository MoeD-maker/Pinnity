/**
 * Cookie Utility Functions
 * 
 * Provides standardized methods for working with cookies securely across the application.
 * These utilities ensure consistent cookie handling with proper security attributes.
 */

import { Request, Response, CookieOptions } from 'express';
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
  options: CookieOptions = {}
): void {
  const cookieOptions = { ...baseCookieConfig, ...options };
  logCookieOperation(name, 'set');
  
  if (cookieOptions.signed) {
    res.cookie(name, value, cookieOptions);
  } else {
    res.cookie(name, value, cookieOptions);
  }
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
  options: CookieOptions = {}
): void {
  const cookieOptions = { ...authCookieConfig, ...options };
  logCookieOperation(name, 'set');
  res.cookie(name, value, cookieOptions);
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
  options: CookieOptions = {}
): void {
  const cookieOptions = { ...csrfCookieConfig, ...options };
  logCookieOperation(name, 'set');
  res.cookie(name, value, cookieOptions);
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
  options: CookieOptions = {}
): void {
  const cookieOptions = { ...sessionCookieConfig, ...options };
  logCookieOperation(name, 'set');
  res.cookie(name, value, cookieOptions);
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
  options: CookieOptions = {}
): void {
  const cookieOptions = { ...transientCookieConfig, ...options };
  logCookieOperation(name, 'set');
  res.cookie(name, value, cookieOptions);
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
  options: CookieOptions = {}
): void {
  logCookieOperation(name, 'clear');
  
  // Set an expired cookie with the same path/domain to ensure proper clearing
  const clearOptions: CookieOptions = {
    ...options,
    expires: new Date(0),     // Set to epoch time to expire immediately
    maxAge: 0                  // Set max age to 0 for immediate expiration
  };
  
  res.clearCookie(name, clearOptions);
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
  logCookieOperation(name, 'read');
  
  if (signed) {
    return req.signedCookies[name];
  } else {
    return req.cookies[name];
  }
}

/**
 * Verify cookie has secure attributes
 * Useful for validating third-party cookies or debugging
 * @param name Cookie name
 * @param cookieHeader Cookie header string
 * @returns Object with validation results
 */
export function validateCookieSecurity(
  cookieHeader: string
): {
  secure: boolean;
  httpOnly: boolean;
  sameSiteStrict: boolean;
  hasExpiry: boolean;
} {
  const validationResults = {
    secure: cookieHeader.toLowerCase().includes('secure'),
    httpOnly: cookieHeader.toLowerCase().includes('httponly'),
    sameSiteStrict: cookieHeader.toLowerCase().includes('samesite=strict'),
    hasExpiry: 
      cookieHeader.toLowerCase().includes('expires=') || 
      cookieHeader.toLowerCase().includes('max-age=')
  };
  
  return validationResults;
}

/**
 * Utility to apply proper security headers when setting cookies
 * @param res Express response object
 */
export function applyCookieSecurityHeaders(res: Response): void {
  // Apply security headers that support cookie security
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Production-only security headers
  if (process.env.NODE_ENV === 'production') {
    // Strict HSTS in production
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
}