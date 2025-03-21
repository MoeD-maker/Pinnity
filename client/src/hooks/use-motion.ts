import { useState, useEffect } from "react";

/**
 * A hook that provides information about the user's motion preferences.
 * This is used to adjust animations based on a user's system preference 
 * for reduced motion, supporting accessibility.
 */
export function useMotion() {
  // Initially check the user's preference through media query
  const [shouldReduceMotion, setShouldReduceMotion] = useState<boolean>(() => {
    // Check if window is defined (for SSR support)
    if (typeof window === "undefined") return false;
    
    // Use the prefers-reduced-motion media query
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  
  // Update the state when the user's preference changes
  useEffect(() => {
    // Check if window is defined (for SSR support)
    if (typeof window === "undefined") return;
    
    // Create the media query
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    
    // Handler for when the media query changes
    const handleMediaChange = (event: MediaQueryListEvent) => {
      setShouldReduceMotion(event.matches);
    };
    
    // Add listener for the media query
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMediaChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleMediaChange);
    }
    
    // Clean up
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMediaChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);
  
  return { shouldReduceMotion };
}

/**
 * Legacy wrapper for existing components that expect useReducedMotion
 * This maintains backward compatibility with shadcn/ui components
 * @returns Whether motion should be reduced
 */
export function useReducedMotion(): boolean {
  const { shouldReduceMotion } = useMotion();
  return shouldReduceMotion;
}