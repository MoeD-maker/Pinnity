/**
 * Motion Preferences Utility
 * 
 * This module provides utilities for handling user motion preferences
 * with support for reduced-motion, battery awareness, and device capability detection.
 * 
 * Features:
 * - Detects prefers-reduced-motion media query
 * - Provides hooks for responsive animation behavior
 * - Automatically detects device capabilities
 * - Supports battery-aware animation scaling
 */

/**
 * Check if the user prefers reduced motion
 * Uses the prefers-reduced-motion media query
 * 
 * @returns True if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  // Check for window object (for SSR compatibility)
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation duration scaling factor based on user preferences and device
 * - Returns 0 for no animation 
 * - Returns 0.5 for reduced animation
 * - Returns 1 for full animation
 * 
 * @returns Animation duration scaling factor
 */
export function getAnimationScale(): number {
  // No animation if reduced motion is preferred
  if (prefersReducedMotion()) return 0;
  
  // Check for low-end device or low battery
  if (isLowEndDevice() || isBatteryLow()) return 0.5;
  
  // Full animation for all other cases
  return 1;
}

/**
 * Check if the device is likely a low-end device
 * Uses heuristics like memory, cores, and browser features
 * 
 * @returns True if the device appears to be low-end
 */
function isLowEndDevice(): boolean {
  // Check for window object (for SSR compatibility)
  if (typeof window === 'undefined') return false;
  
  // Use navigator hardwareConcurrency as a proxy for device capability
  // Most low-end devices have 4 or fewer cores
  const lowCoreCount = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
  
  // Use device memory API if available (Chrome only)
  // @ts-ignore - deviceMemory is not in all TypeScript definitions
  const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 4;
  
  // Check if we're in a "Lite" mode browser or have Save-Data header
  // @ts-ignore - saveData is not in all TypeScript definitions
  const dataSaverEnabled = navigator.connection && navigator.connection.saveData;
  
  // If any of these are true, consider it a low-end device
  return lowCoreCount || lowMemory || dataSaverEnabled || false;
}

/**
 * Check if the device is in a low battery state
 * Uses the Battery Status API if available
 * 
 * @returns True if the battery is low or device is in low-power mode
 */
function isBatteryLow(): boolean {
  // Check for window object (for SSR compatibility)
  if (typeof window === 'undefined') return false;
  
  // Check if the device is in low-power mode (iOS)
  // @ts-ignore - this is a non-standard API
  const lowPowerMode = navigator.lowPower;
  
  // Try to use the Battery API to determine battery level
  // Return a promise that resolves to a boolean
  try {
    // @ts-ignore - getBattery is not in all TypeScript definitions
    if (navigator.getBattery) {
      // This would ideally be awaited, but we can't make this function async
      // since it would change the behavior when consumers call it
      // Instead we'll set a CSS variable when we have the result
      // @ts-ignore - getBattery is not in all TypeScript definitions
      navigator.getBattery().then((battery) => {
        const isLow = battery.level <= 0.2 && !battery.charging;
        document.documentElement.style.setProperty('--low-battery', isLow ? 'true' : 'false');
        return isLow;
      });
    }
  } catch (e) {
    // Battery API not available or failed
  }
  
  // Fall back to checking low power mode
  return lowPowerMode || false;
}

/**
 * Get animation duration based on default duration and user preferences
 * 
 * @param defaultDuration Default duration in milliseconds
 * @returns Adjusted duration in milliseconds
 */
export function getAnimationDuration(defaultDuration: number): number {
  const scale = getAnimationScale();
  
  // If scale is 0, use a minimal duration for accessibility
  // A tiny duration ensures transitions happen but are nearly imperceptible
  if (scale === 0) return 10;
  
  return defaultDuration * scale;
}

/**
 * Get CSS variables for animation durations based on user preferences
 * 
 * @returns Object with CSS variable values
 */
export function getAnimationCSSVariables(): Record<string, string> {
  const scale = getAnimationScale();
  
  // If scale is 0, use a minimal duration for accessibility
  return {
    '--animation-scale': String(scale),
    '--animation-shorter': scale === 0 ? '10ms' : `${150 * scale}ms`,
    '--animation-short': scale === 0 ? '10ms' : `${250 * scale}ms`,
    '--animation-normal': scale === 0 ? '10ms' : `${350 * scale}ms`,
    '--animation-long': scale === 0 ? '10ms' : `${500 * scale}ms`,
    '--animation-longer': scale === 0 ? '10ms' : `${700 * scale}ms`,
  };
}

/**
 * Apply animation preferences to document CSS variables
 * Call this on app initialization
 */
export function applyAnimationPreferences(): void {
  if (typeof document === 'undefined') return;
  
  const variables = getAnimationCSSVariables();
  
  // Set CSS variables on the document root
  Object.entries(variables).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
  
  // Add a class to the document for CSS targeting
  if (prefersReducedMotion()) {
    document.documentElement.classList.add('reduce-motion');
  } else {
    document.documentElement.classList.remove('reduce-motion');
  }
  
  // Setup listener for changes in motion preference
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', applyAnimationPreferences);
}