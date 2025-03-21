/**
 * Motion Hooks for Animation Control
 * 
 * Provides React hooks for responsive animation behavior based on:
 * - User preferences (prefers-reduced-motion)
 * - Device capabilities
 * - Battery status
 * 
 * These hooks help components adapt their animations for better
 * performance and accessibility.
 */

import { useState, useEffect } from 'react';
import { 
  prefersReducedMotion, 
  getAnimationScale, 
  getAnimationDuration 
} from '@/lib/motion-preferences';

/**
 * Hook to check if reduced motion is preferred
 * 
 * @returns True if reduced motion is preferred
 */
export function useReducedMotion(): boolean {
  // Initialize with the current preference
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion());
  
  useEffect(() => {
    // Update when component mounts to ensure client-side value
    setReducedMotion(prefersReducedMotion());
    
    // Listen for changes in preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const updateMotionPreference = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    
    // Add listener for preference changes
    mediaQuery.addEventListener('change', updateMotionPreference);
    
    // Clean up
    return () => {
      mediaQuery.removeEventListener('change', updateMotionPreference);
    };
  }, []);
  
  return reducedMotion;
}

/**
 * Hook to get the current animation scale factor
 * 
 * @returns Animation scale factor (0 to 1)
 */
export function useAnimationScale(): number {
  // We depend on reduced motion, so initialize with current scale
  const [scale, setScale] = useState(getAnimationScale());
  const reducedMotion = useReducedMotion();
  
  useEffect(() => {
    // Update scale when reduced motion changes
    setScale(getAnimationScale());
  }, [reducedMotion]);
  
  return scale;
}

/**
 * Hook to get adjusted animation duration
 * 
 * @param defaultDuration Default animation duration in milliseconds
 * @returns Adjusted duration based on preferences
 */
export function useAnimationDuration(defaultDuration: number): number {
  const scale = useAnimationScale();
  
  // Calculate duration based on scale
  // Minimum 10ms for screen readers and accessibility
  return scale === 0 ? 10 : defaultDuration * scale;
}

/**
 * Hook to get animation properties for a component
 * Returns values that can be passed to Framer Motion or CSS transitions
 * 
 * @param config Configuration for animations
 * @returns Animation properties object
 */
export function useAnimationProps(config: {
  defaultDuration?: number;
  defaultEasing?: string;
  variants?: Record<string, any>;
}): {
  transition: {
    duration: number;
    ease: string;
  };
  variants: Record<string, any> | null;
  animate: boolean;
} {
  const {
    defaultDuration = 300,
    defaultEasing = 'ease',
    variants = null
  } = config;
  
  const reducedMotion = useReducedMotion();
  const duration = useAnimationDuration(defaultDuration);
  
  // If reduced motion is preferred, provide simplified variants
  // or null if no variants were provided
  const adaptedVariants = reducedMotion && variants
    ? Object.entries(variants).reduce((acc, [key, value]) => {
        // Remove transition properties in reduced motion mode
        // and zero out transforms
        acc[key] = {
          ...value,
          transition: { duration: 0.01 },
          // Zero out transforms if they exist
          ...(value.x !== undefined && { x: 0 }),
          ...(value.y !== undefined && { y: 0 }),
          ...(value.scale !== undefined && { scale: 1 }),
          ...(value.rotate !== undefined && { rotate: 0 }),
        };
        return acc;
      }, {} as Record<string, any>)
    : variants;
  
  return {
    transition: {
      duration: duration / 1000, // Convert to seconds for Framer Motion
      ease: defaultEasing,
    },
    variants: adaptedVariants,
    animate: !reducedMotion,
  };
}