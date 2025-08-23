/**
 * Centralized Cookie Configuration
 * 
 * This module provides standardized secure cookie configurations for 
 * different usage scenarios in the application. All cookies should use
 * these settings rather than inline configurations to ensure consistency
 * and security.
 * 
 * Security measures implemented:
 * - HttpOnly: Prevents JavaScript access to cookies (protects against XSS)
 * - Secure: Ensures cookies are only sent over HTTPS connections
 * - SameSite: Controls when cookies are sent with cross-site requests
 * - Signed: Uses the server's secret to sign cookie values (tamper protection)
 * - Max-Age/Expires: Limits cookie lifetime
 * - Domain/Path: Restricts cookie scope
 */

import { CookieOptions } from 'express';

/**
 * Base cookie configuration with secure defaults
 * All cookies should inherit from this base configuration
 */
export const baseCookieConfig: CookieOptions = {
  httpOnly: true,                    // Prevents JavaScript access (mitigates XSS)
  secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
  sameSite: getSameSitePolicy(),     // Default strict SameSite
  path: '/',                         // Available across all paths
  signed: true,                      // Sign cookies to prevent tampering
};

/**
 * Auth cookie configuration for authentication tokens
 * Used for storing JWT or session identifiers
 */
export const authCookieConfig: CookieOptions = {
  ...baseCookieConfig,
  maxAge: 24 * 60 * 60 * 1000,      // 24 hours
  httpOnly: true,                    // Critical - prevent JS access to auth tokens
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',  // Adjust for development
  secure: process.env.NODE_ENV === 'production',   // Only require HTTPS in production
};

/**
 * CSRF cookie configuration for CSRF tokens
 * These cookies work in tandem with CSRF tokens for form submissions
 */
export const csrfCookieConfig: CookieOptions = {
  ...baseCookieConfig,
  maxAge: 2 * 60 * 60 * 1000,        // 2 hours
  sameSite: 'lax',                   // Lax allows limited cross-site usage for usability
  // Note: CSRF protection actually requires the cookie to be readable by JS,
  // so typically httpOnly would be set to false for this cookie only
};

/**
 * Session cookie configuration for server-side sessions
 * Used with express-session or similar middleware
 */
export const sessionCookieConfig: CookieOptions = {
  ...baseCookieConfig,
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 1 week
};

/**
 * Short-lived cookie configuration for temporary data
 * Used for transient states, notifications, etc.
 */
export const transientCookieConfig: CookieOptions = {
  ...baseCookieConfig,
  maxAge: 5 * 60 * 1000,            // 5 minutes
  signed: false,                     // Often not necessary for transient cookies
};

/**
 * Preference cookie configuration for user preferences
 * Used for UI settings, language preferences, etc.
 */
export const preferenceCookieConfig: CookieOptions = {
  ...baseCookieConfig,
  maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
  httpOnly: false,                   // Allow JS access to preferences
  signed: false,                     // Often not necessary for preferences
};

/**
 * Format expiration date for cookie
 * @param maxAgeMs Max age in milliseconds
 * @returns Date object for cookie expiration
 */
export function getExpirationDate(maxAgeMs: number): Date {
  return new Date(Date.now() + maxAgeMs);
}

/**
 * Get appropriate SameSite attribute based on environment and usage
 * @param strict Whether to enforce strict same-site policy
 * @returns SameSite value for cookie configuration
 */
export function getSameSitePolicy(strict: boolean = true): 'strict' | 'lax' | 'none' {
  // For production, use strict by default
  if (process.env.NODE_ENV === 'production') {
    return strict ? 'strict' : 'lax';
  }
  
  // For development, match the development environment
  const forcePolicy = process.env.COOKIE_SAME_SITE_POLICY as 'strict' | 'lax' | 'none' | undefined;
  if (forcePolicy && ['strict', 'lax', 'none'].includes(forcePolicy)) {
    return forcePolicy as 'strict' | 'lax' | 'none';
  }
  
  // Default based on development vs production
  return process.env.NODE_ENV === 'production' ? 'strict' : 'lax';
}

/**
 * Get cookie domain configuration appropriate for the environment
 * @returns Domain restriction for cookies or undefined to use current domain
 */
export function getCookieDomain(): string | undefined {
  if (process.env.NODE_ENV === 'production') {
    return process.env.COOKIE_DOMAIN || undefined;
  }
  
  // For local development, usually best to not set a domain
  return undefined;
}

/**
 * Helper to create cookie options with custom max age
 * @param baseConfig Base cookie configuration to extend
 * @param maxAgeMs Max age in milliseconds
 * @returns Cookie options with custom max age
 */
export function withCustomAge(baseConfig: CookieOptions, maxAgeMs: number): CookieOptions {
  return {
    ...baseConfig,
    maxAge: maxAgeMs,
    expires: getExpirationDate(maxAgeMs)
  };
}

/**
 * Helper to log cookie operations without revealing sensitive values
 * @param name Cookie name
 * @param operation Operation being performed (set, clear, etc.)
 */
export function logCookieOperation(name: string, operation: 'set' | 'clear' | 'read'): void {
  // Always log in development to help with debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Cookie operation: ${operation} ${name} (NODE_ENV: ${process.env.NODE_ENV || 'not set'})`);
  }
}