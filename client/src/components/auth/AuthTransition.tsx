import React from 'react';
import { motion } from 'framer-motion';
import { useMotion } from '@/hooks/use-motion';
import { AuthState } from '@/contexts/AuthContext';

interface AuthTransitionProps {
  state: AuthState;
  message?: string;
}

/**
 * AuthTransition component displays a smooth animation during authentication state transitions
 * This component shows different visuals based on the current authentication state
 * to provide visual feedback during login, logout, and redirections
 */
export function AuthTransition({ state, message = 'Loading...' }: AuthTransitionProps) {
  const { shouldReduceMotion } = useMotion();
  
  // Animation variants based on auth state
  const containerVariants = {
    initializing: {
      opacity: 1,
    },
    authenticating: {
      opacity: 1,
    },
    redirecting: {
      opacity: shouldReduceMotion ? 1 : [1, 0.9, 1],
      transition: {
        opacity: {
          repeat: Infinity,
          duration: 1.5
        }
      }
    },
    authenticated: {
      opacity: 1,
    },
    unauthenticated: {
      opacity: 1,
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };
  
  // Spinner animation variants
  const spinnerVariants = {
    initializing: {
      rotate: shouldReduceMotion ? 0 : 360,
      transition: {
        repeat: Infinity,
        duration: 1,
        ease: "linear"
      }
    },
    authenticating: {
      rotate: shouldReduceMotion ? 0 : 360,
      scale: [1, 1.1, 1],
      transition: {
        rotate: {
          repeat: Infinity,
          duration: 1,
          ease: "linear"
        },
        scale: {
          repeat: Infinity,
          duration: 1.5
        }
      }
    },
    redirecting: {
      rotate: shouldReduceMotion ? 0 : 360,
      transition: {
        repeat: Infinity,
        duration: 0.8,
        ease: "linear"
      }
    },
    authenticated: {
      rotate: 0,
    },
    unauthenticated: {
      rotate: 0,
    }
  };
  
  // Text animation variants
  const textVariants = {
    initializing: {
      opacity: 1,
    },
    authenticating: {
      opacity: shouldReduceMotion ? 1 : [1, 0.7, 1],
      transition: {
        opacity: {
          repeat: Infinity,
          duration: 2
        }
      }
    },
    redirecting: {
      opacity: shouldReduceMotion ? 1 : [1, 0.8, 1],
      transition: {
        opacity: {
          repeat: Infinity,
          duration: 1
        }
      }
    },
    authenticated: {
      opacity: 1,
    },
    unauthenticated: {
      opacity: 1,
    }
  };
  
  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen bg-background"
      variants={containerVariants}
      initial="initializing"
      animate={state}
      exit="exit"
    >
      <motion.div
        className="w-12 h-12 rounded-full border-t-2 border-b-2 border-primary"
        variants={spinnerVariants}
        initial="initializing"
        animate={state}
      />
      
      <motion.p 
        className="text-sm text-muted-foreground mt-4"
        variants={textVariants}
        initial="initializing"
        animate={state}
      >
        {message}
      </motion.p>
    </motion.div>
  );
}