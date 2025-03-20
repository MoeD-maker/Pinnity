/**
 * Specialized error handling for the onboarding process.
 * Provides specific error handling, recovery mechanisms, and persistence for onboarding flows.
 */

import { toast } from '@/hooks/use-toast';
import { handleError, AppError, ErrorCategory, normalizeError } from './errorHandling';
import { UseFormReturn } from 'react-hook-form';

// Specific onboarding error categories
export enum OnboardingErrorType {
  FORM_VALIDATION = 'form_validation',
  DATA_SAVE = 'data_save',
  DATA_LOAD = 'data_load',
  SESSION_TIMEOUT = 'session_timeout',
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

// Specialized error structure for onboarding
export interface OnboardingError extends AppError {
  onboardingType: OnboardingErrorType;
  formState?: any;
  step?: number;
  fieldErrors?: Record<string, string>;
}

/**
 * Convert any error to an OnboardingError with onboarding-specific context
 */
export function normalizeOnboardingError(
  error: any, 
  context: {
    step?: number;
    formState?: any;
    fieldErrors?: Record<string, string>;
    defaultMessage?: string;
  } = {}
): OnboardingError {
  // Create base error using the standard normalizer
  const baseError = normalizeError(
    error, 
    context.defaultMessage || 'An error occurred during the onboarding process'
  );
  
  // Map standard error categories to onboarding-specific types
  let onboardingType: OnboardingErrorType;
  
  switch (baseError.category) {
    case ErrorCategory.VALIDATION:
      onboardingType = OnboardingErrorType.FORM_VALIDATION;
      break;
    case ErrorCategory.AUTHENTICATION:
      onboardingType = OnboardingErrorType.AUTHENTICATION;
      break;
    case ErrorCategory.NETWORK:
    case ErrorCategory.OFFLINE:
    case ErrorCategory.TIMEOUT:
      onboardingType = OnboardingErrorType.NETWORK;
      break;
    case ErrorCategory.SERVER:
      onboardingType = OnboardingErrorType.SERVER;
      break;
    default:
      onboardingType = OnboardingErrorType.UNKNOWN;
  }
  
  // Override with more specific type if we can infer it from the error
  if (error.message) {
    const msg = error.message.toLowerCase();
    
    if (msg.includes('save') || msg.includes('saving') || msg.includes('submit')) {
      onboardingType = OnboardingErrorType.DATA_SAVE;
    } else if (msg.includes('load') || msg.includes('loading') || msg.includes('restore')) {
      onboardingType = OnboardingErrorType.DATA_LOAD;
    } else if (msg.includes('session') || msg.includes('timeout') || msg.includes('expired')) {
      onboardingType = OnboardingErrorType.SESSION_TIMEOUT;
    } else if (msg.includes('validation') || msg.includes('invalid') || error.fieldErrors) {
      onboardingType = OnboardingErrorType.FORM_VALIDATION;
    }
  }
  
  // Create the onboarding-specific error
  return {
    ...baseError,
    onboardingType,
    step: context.step,
    formState: context.formState,
    fieldErrors: context.fieldErrors || error.fieldErrors,
  };
}

/**
 * Get user-friendly message based on onboarding error type
 */
export function getOnboardingErrorMessage(error: OnboardingError): string {
  switch (error.onboardingType) {
    case OnboardingErrorType.FORM_VALIDATION:
      return error.message || 'Please check the form fields and try again.';
    
    case OnboardingErrorType.DATA_SAVE:
      return 'We had trouble saving your information. Your progress has been stored locally.';
    
    case OnboardingErrorType.DATA_LOAD:
      return 'We had trouble loading your saved information. Starting with the most recent data available.';
    
    case OnboardingErrorType.SESSION_TIMEOUT:
      return 'Your session has timed out due to inactivity. We\'ve saved your progress.';
    
    case OnboardingErrorType.AUTHENTICATION:
      return 'Your login session has expired. We\'ve saved your progress locally.';
    
    case OnboardingErrorType.NETWORK:
      return 'Network connection issue. Your progress is saved locally and will be synchronized when you\'re back online.';
    
    case OnboardingErrorType.SERVER:
      return 'The server is experiencing issues. Your progress has been saved locally.';
    
    case OnboardingErrorType.UNKNOWN:
    default:
      return error.message || 'An unexpected error occurred. We\'ve saved your progress.';
  }
}

// Track if the user has already been shown an offline notice to avoid repeated notifications
let offlineNoticeShown = false;

/**
 * Handle onboarding errors with context-specific recovery options
 */
export function handleOnboardingError(
  error: any, 
  options: {
    form?: UseFormReturn<any>;
    step?: number;
    saveFormFn?: () => Promise<boolean>;
    redirectPath?: string;
    retryFn?: () => Promise<any>;
    silent?: boolean;
  } = {}
): OnboardingError {
  // Get current form state if available
  const formState = options.form?.getValues();
  
  // Get field errors if available
  const fieldErrors: Record<string, string> = {};
  if (options.form) {
    const formErrors = options.form.formState.errors;
    Object.keys(formErrors).forEach(key => {
      const error = formErrors[key];
      if (error && error.message && typeof error.message === 'string') {
        fieldErrors[key] = error.message;
      }
    });
  }
  
  // Create onboarding-specific error
  const onboardingError = normalizeOnboardingError(error, {
    step: options.step,
    formState,
    fieldErrors,
  });
  
  // Auto-save form state if function is provided and it's a recoverable error
  if (
    options.saveFormFn && 
    (onboardingError.onboardingType === OnboardingErrorType.NETWORK ||
     onboardingError.onboardingType === OnboardingErrorType.DATA_SAVE ||
     onboardingError.onboardingType === OnboardingErrorType.SESSION_TIMEOUT)
  ) {
    // Save form state asynchronously
    options.saveFormFn().catch(saveError => {
      console.error('Failed to save form state during error recovery:', saveError);
    });
  }
  
  // Only show the offline notice once if we're in offline mode
  if (
    onboardingError.onboardingType === OnboardingErrorType.NETWORK && 
    !navigator.onLine &&
    !offlineNoticeShown
  ) {
    offlineNoticeShown = true;
    window.addEventListener('online', () => {
      offlineNoticeShown = false;
    }, { once: true });
  }
  
  // Show appropriate toast notification unless silent option is true
  if (!options.silent) {
    const message = getOnboardingErrorMessage(onboardingError);
    const variant = onboardingError.category === ErrorCategory.NETWORK ? 'default' : 'destructive';
    
    toast({
      title: getErrorTitle(onboardingError),
      description: message,
      variant,
      duration: 5000,
    });
    
    // Show field errors as separate toasts for validation errors
    if (
      onboardingError.onboardingType === OnboardingErrorType.FORM_VALIDATION && 
      Object.keys(fieldErrors).length > 0
    ) {
      // Only show the first field error to avoid overwhelming the user
      const firstField = Object.keys(fieldErrors)[0];
      toast({
        title: `Error in ${firstField}`,
        description: fieldErrors[firstField],
        variant: 'destructive',
        duration: 5000,
      });
    }
  }
  
  // Log the error
  console.error('Onboarding error:', onboardingError);
  
  return onboardingError;
}

/**
 * Get appropriate error title based on error type
 */
function getErrorTitle(error: OnboardingError): string {
  switch (error.onboardingType) {
    case OnboardingErrorType.FORM_VALIDATION:
      return 'Validation Error';
    case OnboardingErrorType.DATA_SAVE:
      return 'Save Error';
    case OnboardingErrorType.DATA_LOAD:
      return 'Load Error';
    case OnboardingErrorType.SESSION_TIMEOUT:
      return 'Session Timeout';
    case OnboardingErrorType.AUTHENTICATION:
      return 'Authentication Error';
    case OnboardingErrorType.NETWORK:
      return 'Connection Issue';
    case OnboardingErrorType.SERVER:
      return 'Server Error';
    default:
      return 'Error';
  }
}

/**
 * Create a retry function with exponential backoff for network-related errors
 */
export function createRetryFunction(
  fn: () => Promise<any>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    retryOnErrorTypes?: OnboardingErrorType[];
    onRetry?: (attempt: number, delay: number) => void;
  } = {}
): () => Promise<any> {
  const maxRetries = options.maxRetries || 3;
  const initialDelay = options.initialDelay || 1000;
  const maxDelay = options.maxDelay || 10000;
  const retryOnErrorTypes = options.retryOnErrorTypes || [
    OnboardingErrorType.NETWORK,
    OnboardingErrorType.DATA_SAVE,
    OnboardingErrorType.SERVER
  ];
  
  let attempts = 0;
  
  // Create the recursive retry function
  const retry = async (): Promise<any> => {
    try {
      return await fn();
    } catch (error) {
      // Convert to onboarding error
      const onboardingError = normalizeOnboardingError(error);
      
      // Check if we should retry based on error type and max retries
      if (
        attempts < maxRetries && 
        retryOnErrorTypes.includes(onboardingError.onboardingType)
      ) {
        attempts++;
        
        // Calculate backoff delay with jitter
        const delay = Math.min(initialDelay * Math.pow(2, attempts - 1) + Math.random() * 1000, maxDelay);
        
        if (options.onRetry) {
          options.onRetry(attempts, delay);
        }
        
        // Show retrying toast
        toast({
          title: 'Retrying...',
          description: `Attempting to recover (${attempts}/${maxRetries})`,
          duration: delay - 500, // Show toast until just before retry
        });
        
        // Wait for backoff delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry
        return retry();
      }
      
      // If we've exhausted retries or it's not a retryable error, rethrow
      throw onboardingError;
    }
  };
  
  return retry;
}

/**
 * Create a safe wrapper for async functions with onboarding-specific error handling
 */
export function withOnboardingErrorHandling<T>(
  asyncFn: () => Promise<T>,
  options: {
    form?: UseFormReturn<any>;
    step?: number;
    saveFormFn?: () => Promise<boolean>;
    redirectPath?: string;
    silent?: boolean;
    retryConfig?: {
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      retryOnErrorTypes?: OnboardingErrorType[];
    };
  } = {}
): Promise<T> {
  // Create retry function if retry config is provided
  const fnWithRetry = options.retryConfig
    ? createRetryFunction(asyncFn, {
        ...options.retryConfig,
        onRetry: (attempt, delay) => {
          console.log(`Retrying operation (${attempt}/${options.retryConfig?.maxRetries || 3})...`);
        }
      })
    : asyncFn;
  
  // Execute function with error handling
  return fnWithRetry().catch(error => {
    const onboardingError = handleOnboardingError(error, {
      form: options.form,
      step: options.step,
      saveFormFn: options.saveFormFn,
      redirectPath: options.redirectPath,
      silent: options.silent
    });
    
    // Re-throw the normalized error for further handling if needed
    throw onboardingError;
  });
}