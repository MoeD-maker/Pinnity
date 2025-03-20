import { useState, useEffect, useCallback } from 'react';
import { ValidationStatus } from '@/components/ui/validation-message';

interface ValidationStateOptions {
  /**
   * Time in milliseconds to delay showing validation errors
   */
  errorDelay?: number;
  
  /**
   * Time in milliseconds to show success messages before hiding them
   */
  successTimeout?: number;
  
  /**
   * Whether to show success states
   */
  showSuccess?: boolean;
  
  /**
   * Whether to validate immediately on mount
   */
  validateOnMount?: boolean;
}

/**
 * Hook for managing field validation states with improved user experience
 */
export function useValidationState(
  options: ValidationStateOptions = {}
) {
  const {
    errorDelay = 500,
    successTimeout = 3000,
    showSuccess = true,
    validateOnMount = false,
  } = options;
  
  // Track the validation status
  const [status, setStatus] = useState<ValidationStatus>(validateOnMount ? 'error' : 'none');
  
  // Track whether validation messages should be visible
  const [visible, setVisible] = useState(false);
  
  // Track the validation message
  const [message, setMessage] = useState<string | undefined>(undefined);
  
  // Track whether the field has been interacted with
  const [touched, setTouched] = useState(false);
  
  // Handle setting an error state with optional delay
  const setError = useCallback((errorMessage: string, delay = errorDelay) => {
    // Clear any existing timers
    clearTimeout(window.setTimeout(() => {}, 0));
    
    if (delay > 0) {
      // Show error after delay (to avoid flickering during typing)
      setTimeout(() => {
        setStatus('error');
        setMessage(errorMessage);
        setVisible(true);
      }, delay);
    } else {
      // Show error immediately
      setStatus('error');
      setMessage(errorMessage);
      setVisible(true);
    }
  }, [errorDelay]);
  
  // Handle setting a success state with auto-hide after timeout
  const setSuccess = useCallback((successMessage?: string) => {
    // Clear any existing timers
    clearTimeout(window.setTimeout(() => {}, 0));
    
    // Only show success state if enabled
    if (showSuccess) {
      setStatus('success');
      setMessage(successMessage);
      setVisible(true);
      
      // Automatically hide success message after timeout
      if (successTimeout > 0) {
        setTimeout(() => {
          setVisible(false);
        }, successTimeout);
      }
    }
  }, [showSuccess, successTimeout]);
  
  // Handle setting warning state
  const setWarning = useCallback((warningMessage: string) => {
    // Clear any existing timers
    clearTimeout(window.setTimeout(() => {}, 0));
    
    setStatus('warning');
    setMessage(warningMessage);
    setVisible(true);
  }, []);
  
  // Handle setting info state
  const setInfo = useCallback((infoMessage: string) => {
    // Clear any existing timers
    clearTimeout(window.setTimeout(() => {}, 0));
    
    setStatus('info');
    setMessage(infoMessage);
    setVisible(true);
  }, []);
  
  // Handle resetting validation state
  const reset = useCallback(() => {
    // Clear any existing timers
    clearTimeout(window.setTimeout(() => {}, 0));
    
    setStatus('none');
    setMessage(undefined);
    setVisible(false);
    setTouched(false);
  }, []);
  
  // Handle marking field as touched
  const markTouched = useCallback(() => {
    setTouched(true);
  }, []);
  
  return {
    status,
    message,
    visible,
    touched,
    setError,
    setSuccess,
    setWarning,
    setInfo,
    reset,
    markTouched,
    // Helper properties
    isError: status === 'error' && visible,
    isSuccess: status === 'success' && visible,
    isWarning: status === 'warning' && visible,
    isInfo: status === 'info' && visible,
  };
}