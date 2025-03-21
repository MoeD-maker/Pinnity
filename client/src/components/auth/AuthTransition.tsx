import React from 'react';
import { motion } from 'framer-motion';
import { useMotion } from '@/hooks/use-motion';

interface AuthTransitionProps {
  message?: string;
  state: 'initializing' | 'authenticating' | 'redirecting' | 'authenticated' | 'unauthenticated';
}

/**
 * AuthTransition Component
 * 
 * Displays a smooth transition screen during authentication state changes
 * to prevent abrupt visual changes and improve perceived performance.
 * 
 * Features:
 * - Respects reduced motion preferences
 * - Provides different visual feedback based on authentication state
 * - Uses staggered animations for smoother transitions
 */
export function AuthTransition({ message, state }: AuthTransitionProps) {
  const { shouldReduceMotion } = useMotion();
  
  // Default messages based on state
  const defaultMessages = {
    initializing: 'Starting up...',
    authenticating: 'Checking authentication...',
    redirecting: 'Taking you to the right place...',
    authenticated: 'Successfully logged in...',
    unauthenticated: 'Please log in...'
  };
  
  // Use provided message or default based on state
  const displayMessage = message || defaultMessages[state];
  
  // Define different spinner animations based on state
  const spinnerVariants = {
    initializing: { borderColor: 'var(--primary-300)' },
    authenticating: { borderColor: 'var(--primary-500)' },
    redirecting: { borderColor: 'var(--primary-600)' },
    authenticated: { borderColor: 'var(--success-500)' },
    unauthenticated: { borderColor: 'var(--warning-500)' }
  };
  
  return (
    <motion.div
      className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ 
        duration: shouldReduceMotion ? 0.1 : 0.4,
        ease: 'easeInOut'
      }}
    >
      <div className="flex flex-col items-center gap-6 max-w-md text-center px-4">
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            delay: shouldReduceMotion ? 0 : 0.1,
            duration: shouldReduceMotion ? 0.1 : 0.5 
          }}
        >
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-t-2 border-primary"></div>
          <motion.div 
            className="absolute inset-0 rounded-full border-2"
            variants={spinnerVariants}
            animate={state}
            transition={{ duration: shouldReduceMotion ? 0.1 : 0.8 }}
          />
        </motion.div>
        
        <motion.div
          className="space-y-2"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            delay: shouldReduceMotion ? 0 : 0.2,
            duration: shouldReduceMotion ? 0.1 : 0.5 
          }}
        >
          <motion.h3 
            className="text-xl font-semibold text-foreground"
          >
            {displayMessage}
          </motion.h3>
          <motion.p 
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ 
              delay: shouldReduceMotion ? 0 : 0.3,
              duration: shouldReduceMotion ? 0.1 : 0.5 
            }}
          >
            This will only take a moment
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default AuthTransition;