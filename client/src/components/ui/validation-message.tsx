import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// Types of validation states
export type ValidationStatus = "error" | "success" | "warning" | "info" | "none";

// Props for ValidationMessage component
interface ValidationMessageProps {
  status: ValidationStatus;
  message?: string;
  visible?: boolean;
  className?: string;
  compact?: boolean;
}

export function ValidationMessage({
  status,
  message,
  visible = true,
  className,
  compact = false
}: ValidationMessageProps) {
  // If no message or explicitly hidden, don't render anything
  if (!message || status === "none" || !visible) {
    return null;
  }

  // Status-specific styles and icons
  const statusConfig = {
    error: {
      icon: <AlertCircle className={cn("h-4 w-4", compact ? "mr-1" : "mr-2")} />,
      className: "text-destructive bg-destructive/10 border-destructive/20"
    },
    success: {
      icon: <CheckCircle className={cn("h-4 w-4", compact ? "mr-1" : "mr-2")} />,
      className: "text-green-600 bg-green-50 border-green-200"
    },
    warning: {
      icon: <AlertCircle className={cn("h-4 w-4", compact ? "mr-1" : "mr-2")} />,
      className: "text-amber-600 bg-amber-50 border-amber-200"
    },
    info: {
      icon: <Info className={cn("h-4 w-4", compact ? "mr-1" : "mr-2")} />,
      className: "text-blue-600 bg-blue-50 border-blue-200"
    }
  };

  const { icon, className: statusClassName } = statusConfig[status];

  // Animation variants
  const variants = {
    initial: { opacity: 0, y: -10, height: 0 },
    animate: { opacity: 1, y: 0, height: "auto" },
    exit: { opacity: 0, y: -10, height: 0 }
  };

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          transition={{ duration: 0.2 }}
          className={cn(
            "rounded border px-3 py-2 text-sm flex items-center",
            compact && "px-2 py-1 text-xs",
            statusClassName,
            className
          )}
        >
          {icon}
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper function to determine validation status based on field state
export function getFieldValidationStatus(
  value: any,
  error?: string,
  isValid?: boolean,
  required?: boolean
): ValidationStatus {
  if (error) {
    return "error";
  }
  
  // If field is explicitly marked as valid
  if (isValid) {
    return "success";
  }
  
  // For empty optional fields, don't show any validation status
  if (!value && !required) {
    return "none";
  }
  
  // For filled fields without errors, mark as success
  if (value && !error) {
    return "success";
  }
  
  return "none";
}