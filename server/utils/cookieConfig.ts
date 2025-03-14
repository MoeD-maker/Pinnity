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
import { getRequiredEnv } from './environmentValidator';

// The environment the application is running in
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Base cookie configuration with secure defaults
 * All cookies should inherit from this base configuration
 */
export const baseCookieConfig: CookieOptions = {
  httpOnly: true,     // Prevents JavaScript access to cookies
  secure: true,       // Cookies only sent over HTTPS
  sameSite: 'strict', // Restricts cookies to same-site requests
  path: '/',          // Cookie available for the entire domain
  signed: true,       // Sign cookies to prevent tampering
};

/**
 * Auth cookie configuration for authentication tokens
 * Used for storing JWT or session identifiers
 */
export const authCookieConfig: CookieOptions = {
  ...baseCookieConfig,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

/**
 * CSRF cookie configuration for CSRF tokens
 * These cookies work in tandem with CSRF tokens for form submissions
 */
export const csrfCookieConfig: CookieOptions = {
  ...baseCookieConfig,
  // CSRF cookies need to be accessed by JavaScript for token validation
  httpOnly: false,
  maxAge: 3 * 60 * 60 * 1000, // 3 hours in milliseconds
};

/**
 * Session cookie configuration for server-side sessions
 * Used with express-session or similar middleware
 */
export const sessionCookieConfig: CookieOptions = {
  ...baseCookieConfig,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

/**
 * Short-lived cookie configuration for temporary data
 * Used for transient states, notifications, etc.
 */
export const transientCookieConfig: CookieOptions = {
  ...baseCookieConfig,
  maxAge: 10 * 60 * 1000, // 10 minutes in milliseconds
};

/**
 * Preference cookie configuration for user preferences
 * Used for UI settings, language preferences, etc.
 */
export const preferenceCookieConfig: CookieOptions = {
  ...baseCookieConfig,
  httpOnly: false, // Accessible by JavaScript for UI customization
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
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
  // In all environments, prefer 'strict' for maximum security
  return strict ? 'strict' : 'lax';
}

/**
 * Get cookie domain configuration appropriate for the environment
 * @returns Domain restriction for cookies or undefined to use current domain
 */
export function getCookieDomain(): string | undefined {
  // In production, you might want to set a specific domain
  // For development, using the default (undefined) is usually sufficient
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
    expires: getExpirationDate(maxAgeMs),
  };
}

/**
 * Helper to log cookie operations without revealing sensitive values
 * @param name Cookie name
 * @param operation Operation being performed (set, clear, etc.)
 */
export function logCookieOperation(name: string, operation: 'set' | 'clear' | 'read'): void {
  if (NODE_ENV === 'development') {
    console.debug(`Cookie ${operation}: ${name}`);
  }
}