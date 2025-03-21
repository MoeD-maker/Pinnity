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
 * This component provides a stable visual during auth state changes to prevent flickering
 * and creates a more professional user experience
 */
export function AuthTransition({ state, message = 'Loading...' }: AuthTransitionProps) {
  const { shouldReduceMotion } = useMotion();
  
  // We're using a simplified animation approach to prevent flickering
  // during rapid state changes. Instead of having different animations
  // for each auth state, we use a consistent animation pattern.
  
  // Single animation variant for the container
  // This avoids re-animations when state changes rapidly
  const containerVariants = {
    // All states use the same animation to prevent flickering
    animate: {
      opacity: 1,
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.5 }
    }
  };
  
  // Simplified spinner animation that doesn't change with auth state
  // This creates a consistent experience during state transitions
  const spinnerVariants = {
    animate: {
      rotate: shouldReduceMotion ? 0 : 360,
      transition: {
        repeat: Infinity,
        duration: 1.2,
        ease: "linear"
      }
    }
  };
  
  // Simplified text animation that doesn't change with auth state
  const textVariants = {
    animate: {
      opacity: 1,
    }
  };
  
  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center min-h-screen bg-background z-50"
      variants={containerVariants}
      initial="animate" 
      animate="animate"
      exit="exit"
    >
      <motion.div
        className="w-16 h-16 rounded-full border-t-4 border-b-4 border-primary"
        variants={spinnerVariants}
        initial="animate"
        animate="animate"
      />
      
      <motion.p 
        className="text-base text-foreground font-medium mt-6"
        variants={textVariants}
        initial="animate"
        animate="animate"
      >
        {message}
      </motion.p>
    </motion.div>
  );
}