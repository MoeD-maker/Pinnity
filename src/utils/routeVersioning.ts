/**
 * API Route Versioning Utility
 * 
 * This module provides a centralized system for managing API versioning.
 * It allows for consistent version prefixing, backwards compatibility,
 * and future expansion to new API versions.
 * 
 * Usage:
 * - Import the createVersionedRoutes function to generate route paths
 * - Use the getVersionInfo function to include version data in responses
 * - Use the deprecationMiddleware to warn about deprecated routes
 * 
 * Future API version expansion:
 * 1. Update the APIVersion type to include the new version (e.g., 'v2')
 * 2. Add the new version to the SUPPORTED_VERSIONS array
 * 3. Update the CURRENT_VERSION constant to the new version when ready
 * 4. Add any version-specific settings to the versionSettings object
 * 5. Implement new route handlers for the new version while maintaining old ones
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Supported API versions
 * Add new versions here when expanding the API
 */
export type APIVersion = 'v1';

/**
 * Array of all supported API versions
 * Used for validation and route generation
 */
export const SUPPORTED_VERSIONS: APIVersion[] = ['v1'];

/**
 * Current active API version
 * This is the version that new clients should use
 */
export const CURRENT_VERSION: APIVersion = 'v1';

/**
 * Default API prefix without version
 */
export const API_PREFIX = '/api';

/**
 * Settings for each API version
 */
export const versionSettings = {
  v1: {
    /**
     * Version in semver format (for headers and responses)
     */
    semver: '1.0.0',
    
    /**
     * Whether this version is deprecated
     */
    deprecated: false,
    
    /**
     * When this version will be sunset (if deprecated)
     */
    sunsetDate: null,
    
    /**
     * Minimum required client version
     */
    minClientVersion: '1.0.0',
    
    /**
     * Documentation URL for this version
     */
    docsUrl: '/docs/api/v1'
  }
};

/**
 * Version information included in responses
 */
export interface VersionInfo {
  version: string;
  status: 'current' | 'deprecated' | 'sunset';
  docsUrl?: string;
  sunsetDate?: string | null;
}

/**
 * Get complete information about an API version
 * @param version API version
 * @returns Version information object
 */
export function getVersionInfo(version: APIVersion = CURRENT_VERSION): VersionInfo {
  const settings = versionSettings[version];
  
  let status: 'current' | 'deprecated' | 'sunset' = 'current';
  if (settings.deprecated) {
    status = 'deprecated';
  }
  
  return {
    version: settings.semver,
    status,
    docsUrl: settings.docsUrl,
    sunsetDate: settings.sunsetDate
  };
}

/**
 * Create versioned and legacy route paths
 * This function generates both the versioned path and legacy path for backward compatibility
 * 
 * @param basePath Base route path (without /api prefix)
 * @param version API version to use (defaults to current version)
 * @returns Array of route paths [versionedPath, legacyPath]
 */
export function createVersionedRoutes(
  basePath: string,
  version: APIVersion = CURRENT_VERSION
): [string, string] {
  // Ensure basePath starts with a slash but doesn't have a trailing slash
  const normalizedPath = basePath.startsWith('/')
    ? basePath
    : `/${basePath}`;
  
  // Create the versioned path: /api/v1/path
  const versionedPath = `${API_PREFIX}/${version}${normalizedPath}`;
  
  // Create the legacy path: /api/path (for backward compatibility)
  const legacyPath = `${API_PREFIX}${normalizedPath}`;
  
  return [versionedPath, legacyPath];
}

/**
 * Middleware to add version information to responses
 * This adds the appropriate headers and injected version info into the response
 * 
 * @param version API version to use
 * @returns Express middleware
 */
export function versionHeadersMiddleware(version: APIVersion = CURRENT_VERSION) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store the API version in the request object for other middleware
    (req as any).apiVersion = version;
    
    // Get version information
    const versionInfo = getVersionInfo(version);
    
    // Add version headers
    res.set('API-Version', versionInfo.version);
    
    // Add documentation URL if available
    if (versionInfo.docsUrl) {
      res.set('API-Documentation', versionInfo.docsUrl);
    }
    
    // Add deprecation headers if applicable
    if (versionInfo.status === 'deprecated') {
      res.set('Deprecation', 'true');
      
      if (versionInfo.sunsetDate) {
        res.set('Sunset', new Date(versionInfo.sunsetDate).toUTCString());
      }
    }
    
    // Modify the json method to include version info
    const originalJson = res.json;
    res.json = function(body: any): Response {
      // Skip version injection for error responses and arrays
      if (body && body.apiVersion === undefined && res.statusCode < 400 && !Array.isArray(body)) {
        body = {
          ...body,
          apiVersion: versionInfo.version
        };
      }
      return originalJson.call(this, body);
    };
    
    next();
  };
}

/**
 * Middleware to warn about deprecated routes
 * Shows deprecation warnings in logs when legacy routes are accessed
 * 
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export function deprecationMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check if the route is a legacy route
  if (req.path.startsWith(API_PREFIX) && 
      !SUPPORTED_VERSIONS.some(v => req.path.startsWith(`${API_PREFIX}/${v}`))) {
    
    // Log deprecation warning
    console.warn(`Deprecation warning: Legacy route ${req.path} accessed. ` +
                 `Please use versioned route ${API_PREFIX}/${CURRENT_VERSION}${req.path.substring(API_PREFIX.length)}`);
    
    // Add deprecation headers
    res.set('Deprecation', 'true');
    res.set('Link', `<${API_PREFIX}/${CURRENT_VERSION}${req.path.substring(API_PREFIX.length)}>; rel="successor-version"`);
    
    // Store in request that this is a deprecated route
    (req as any).isDeprecatedRoute = true;
  }
  
  next();
}

/**
 * Create an object with version and environment information
 * For use in health check and status endpoints
 * 
 * @returns Version and environment information
 */
export function getVersionAndEnvInfo() {
  const versionInfo = getVersionInfo();
  
  // Get environment information
  const envInfo = {
    nodeEnv: process.env.NODE_ENV || 'development',
    appName: 'Pinnity API Server',
    apiVersion: versionInfo.version,
    versionStatus: versionInfo.status
  };
  
  return envInfo;
}
