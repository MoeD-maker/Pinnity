import { useState, useEffect, useCallback } from 'react';

interface WindowSize {
  width: number | undefined;
  height: number | undefined;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

// Breakpoint sizes used across the application
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export default function useWindowSize(): WindowSize {
  // Function to determine screen size categories
  const getScreenCategories = useCallback((width: number) => {
    return {
      isMobile: width < BREAKPOINTS.sm,
      isTablet: width >= BREAKPOINTS.sm && width < BREAKPOINTS.lg,
      isDesktop: width >= BREAKPOINTS.lg,
    };
  }, []);

  // Initial state - use SSR-safe default
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: undefined,
    height: undefined,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  });

  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Get current window size
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Get screen categories based on width
      const screenCategories = getScreenCategories(width);
      
      // Update state
      setWindowSize({
        width,
        height,
        ...screenCategories,
      });
    }
    
    // Add event listener with throttling to improve performance
    let timeoutId: NodeJS.Timeout | null = null;
    const throttledResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100); // 100ms throttle
    };
    
    window.addEventListener('resize', throttledResize);
    
    // Call handler right away so state gets updated with initial window size
    handleResize();
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', throttledResize);
  }, [getScreenCategories]); // Empty array ensures that effect is only run on mount and unmount

  return windowSize;
}

// Export breakpoints for use in other components
export { BREAKPOINTS };