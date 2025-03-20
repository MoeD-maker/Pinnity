import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, HelpCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types of validation states
export type FormErrorVariant = 'error' | 'warning' | 'success' | 'info' | 'none';

// Error state interface for grouping errors
export interface FormErrorState {
  fieldName: string;
  message: string;
  type: FormErrorVariant;
  touched: boolean;
  focused: boolean;
}

// Props for FormErrorMessage component
interface FormErrorMessageProps {
  // Single error props
  fieldName?: string;
  error?: string;
  warning?: string;
  success?: string;
  info?: string;
  
  // Field state props
  touched?: boolean;
  focused?: boolean;
  showWhenUntouched?: boolean;
  
  // Multiple error state object
  errorState?: FormErrorState;
  
  // Visual props
  className?: string;
  compact?: boolean;
  animated?: boolean;
  inline?: boolean;
  icon?: boolean;
}

/**
 * Enhanced form error message component that supports different validation states
 * and animations for a better user experience
 */
export function FormErrorMessage({
  fieldName,
  error,
  warning,
  success,
  info,
  touched = true,
  focused = false,
  showWhenUntouched = false,
  errorState,
  className,
  compact = false,
  animated = true,
  inline = false,
  icon = true
}: FormErrorMessageProps) {
  // Use error state object if provided
  const finalFieldName = errorState?.fieldName || fieldName;
  const finalError = errorState?.message || error;
  const finalWarning = errorState?.type === 'warning' ? errorState.message : warning;
  const finalSuccess = errorState?.type === 'success' ? errorState.message : success;
  const finalInfo = errorState?.type === 'info' ? errorState.message : info;
  const finalTouched = errorState?.touched ?? touched;
  const finalFocused = errorState?.focused ?? focused;
  
  // Determine the current validation state and message
  let currentType: FormErrorVariant = 'none';
  let currentMessage = '';
  
  if (finalError) {
    currentType = 'error';
    currentMessage = finalError;
  } else if (finalWarning) {
    currentType = 'warning';
    currentMessage = finalWarning;
  } else if (finalSuccess) {
    currentType = 'success';
    currentMessage = finalSuccess;
  } else if (finalInfo) {
    currentType = 'info';
    currentMessage = finalInfo;
  }
  
  // Determine if we should show the message
  const shouldShow = (
    currentMessage && (
      (finalTouched || showWhenUntouched) || 
      (finalFocused && (currentType === 'info' || currentType === 'warning'))
    )
  );
  
  if (!shouldShow) {
    return null;
  }
  
  // Configuration for each type
  const typeConfig = {
    error: {
      icon: icon ? <AlertCircle className={cn("h-4 w-4", compact ? "mr-1" : "mr-2")} /> : null,
      className: "text-destructive",
      ariaLive: "assertive" as const
    },
    warning: {
      icon: icon ? <AlertTriangle className={cn("h-4 w-4", compact ? "mr-1" : "mr-2")} /> : null,
      className: "text-amber-600",
      ariaLive: "polite" as const
    },
    success: {
      icon: icon ? <CheckCircle className={cn("h-4 w-4", compact ? "mr-1" : "mr-2")} /> : null,
      className: "text-green-600",
      ariaLive: "polite" as const
    },
    info: {
      icon: icon ? <HelpCircle className={cn("h-4 w-4", compact ? "mr-1" : "mr-2")} /> : null,
      className: "text-blue-600",
      ariaLive: "polite" as const
    },
    none: {
      icon: null,
      className: "",
      ariaLive: "off" as const
    }
  };
  
  const { icon: typeIcon, className: typeClassName, ariaLive } = typeConfig[currentType];
  
  // Animation variants
  const variants = {
    initial: { opacity: 0, y: -10, height: 0 },
    animate: { opacity: 1, y: 0, height: "auto" },
    exit: { opacity: 0, y: -10, height: 0 }
  };
  
  // Render the message
  const messageContent = (
    <div
      className={cn(
        typeClassName,
        inline ? "inline-flex items-center" : "flex items-center",
        compact ? "text-xs" : "text-sm",
        className
      )}
      id={`${finalFieldName}-message`}
      aria-live={ariaLive}
    >
      {typeIcon}
      <span>{currentMessage}</span>
    </div>
  );
  
  // Return with or without animation
  if (animated) {
    return (
      <AnimatePresence mode="wait">
        {shouldShow && (
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
            transition={{ duration: 0.2 }}
            className={cn("mt-1", className)}
          >
            {messageContent}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
  
  return messageContent;
}

/**
 * Display multiple form errors in a list format
 */
export function FormErrorList({ 
  errors,
  className,
  compact = false,
  animated = true,
  icon = true
}: {
  errors: FormErrorState[];
  className?: string;
  compact?: boolean;
  animated?: boolean;
  icon?: boolean;
}) {
  if (!errors.length) {
    return null;
  }
  
  return (
    <div className={cn("space-y-1 mt-2", className)}>
      {errors.map((error, index) => (
        <FormErrorMessage 
          key={`${error.fieldName}-${index}`}
          errorState={error}
          compact={compact}
          animated={animated}
          icon={icon}
        />
      ))}
    </div>
  );
}