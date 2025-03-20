import React, { useState, useEffect } from 'react';
import { Input, InputProps } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormErrorMessage } from './form-error-message';
import { motion, AnimatePresence } from 'framer-motion';

// Password requirements type
export interface PasswordRequirement {
  id: string;
  text: string;
  validator: (password: string) => boolean;
}

// Standard password requirements as per NIST guidelines
export const standardPasswordRequirements: PasswordRequirement[] = [
  {
    id: 'length',
    text: 'At least 8 characters long',
    validator: (password) => password.length >= 8
  },
  {
    id: 'uppercase',
    text: 'At least one uppercase letter',
    validator: (password) => /[A-Z]/.test(password)
  },
  {
    id: 'lowercase',
    text: 'At least one lowercase letter',
    validator: (password) => /[a-z]/.test(password)
  },
  {
    id: 'number',
    text: 'At least one number',
    validator: (password) => /\d/.test(password)
  },
  {
    id: 'special',
    text: 'At least one special character',
    validator: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password)
  }
];

// Enhanced password requirements with strength indicators
export const enhancedPasswordRequirements: PasswordRequirement[] = [
  ...standardPasswordRequirements,
  {
    id: 'strength',
    text: 'No common patterns (123, abc, etc.)',
    validator: (password) => {
      const commonPatterns = [
        /123/, /abc/, /qwerty/, /password/, /admin/, /welcome/,
        /login/, /user/, /letmein/, /sunshine/, /princess/
      ];
      return !commonPatterns.some(pattern => pattern.test(password.toLowerCase()));
    }
  },
  {
    id: 'length-12',
    text: 'At least 12 characters for strong security',
    validator: (password) => password.length >= 12
  }
];

// Password strength calculation
export function calculatePasswordStrength(password: string): number {
  if (!password) return 0;
  
  let strength = 0;
  const requirements = standardPasswordRequirements;
  const totalRequirements = requirements.length;
  
  // Add points for each met requirement
  for (const req of requirements) {
    if (req.validator(password)) {
      strength += 1;
    }
  }
  
  // Additional factors that contribute to strength
  if (password.length >= 12) strength += 1;
  if (password.length >= 16) strength += 1;
  
  // Calculate percentage (0-100)
  return Math.round((strength / (totalRequirements + 2)) * 100);
}

// Get strength label based on score
export function getPasswordStrengthLabel(strength: number): {
  label: string;
  color: string;
} {
  if (strength >= 90) return { label: 'Very Strong', color: 'bg-green-600' };
  if (strength >= 70) return { label: 'Strong', color: 'bg-green-500' };
  if (strength >= 50) return { label: 'Moderate', color: 'bg-yellow-500' };
  if (strength >= 30) return { label: 'Weak', color: 'bg-orange-500' };
  return { label: 'Very Weak', color: 'bg-red-500' };
}

interface PasswordInputProps extends Omit<InputProps, 'type'> {
  requirements?: PasswordRequirement[];
  showRequirements?: boolean;
  showStrengthMeter?: boolean;
  error?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * A secure password input component with visibility toggle, 
 * requirement checking, and strength meter
 */
export function PasswordInput({
  requirements = standardPasswordRequirements,
  showRequirements = true,
  showStrengthMeter = true,
  error,
  className,
  onChange,
  ...props
}: PasswordInputProps) {
  // State for password visibility
  const [showPassword, setShowPassword] = useState(false);
  // State for password value
  const [passwordValue, setPasswordValue] = useState(props.value?.toString() || '');
  // State for requirement validation
  const [requirementStatus, setRequirementStatus] = useState<Record<string, boolean>>({});
  // State for password strength
  const [strength, setStrength] = useState(0);
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Handle password change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setPasswordValue(password);
    
    // Validate each requirement
    const status: Record<string, boolean> = {};
    for (const req of requirements) {
      status[req.id] = req.validator(password);
    }
    
    setRequirementStatus(status);
    setStrength(calculatePasswordStrength(password));
    
    // Call parent onChange if provided
    if (onChange) {
      onChange(e);
    }
  };
  
  // Update password value when props.value changes
  useEffect(() => {
    if (props.value !== undefined && props.value !== null) {
      const newValue = props.value.toString();
      if (newValue !== passwordValue) {
        setPasswordValue(newValue);
        
        // Update requirement validation
        const status: Record<string, boolean> = {};
        for (const req of requirements) {
          status[req.id] = req.validator(newValue);
        }
        setRequirementStatus(status);
        setStrength(calculatePasswordStrength(newValue));
      }
    }
  }, [props.value, requirements]);
  
  // Get strength label
  const strengthInfo = getPasswordStrengthLabel(strength);
  
  // Count met requirements
  const metRequirementsCount = Object.values(requirementStatus).filter(Boolean).length;
  const totalRequirements = requirements.length;
  
  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          className={cn(
            "pr-10",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          value={passwordValue}
          onChange={handlePasswordChange}
          {...props}
        />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={togglePasswordVisibility}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="sr-only">
            {showPassword ? 'Hide password' : 'Show password'}
          </span>
        </Button>
      </div>
      
      {/* Error message */}
      {error && <FormErrorMessage error={error} fieldName="password" />}
      
      {/* Password strength meter */}
      {showStrengthMeter && passwordValue.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Password Strength</span>
            <span className={cn(
              "font-medium",
              strength >= 70 ? "text-green-600" : 
              strength >= 50 ? "text-yellow-600" : 
              "text-red-600"
            )}>
              {strengthInfo.label}
            </span>
          </div>
          
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn("h-full", strengthInfo.color)}
              initial={{ width: 0 }}
              animate={{ width: `${strength}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          <div className="text-xs text-muted-foreground">
            {metRequirementsCount} of {totalRequirements} requirements met
          </div>
        </div>
      )}
      
      {/* Password requirements */}
      {showRequirements && passwordValue.length > 0 && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1.5 text-sm border-l-2 border-muted pl-3 py-1"
          >
            <div className="text-xs font-medium text-muted-foreground mb-2">Password requirements:</div>
            
            <div className="grid grid-cols-1 gap-1">
              {requirements.map((req) => (
                <div 
                  key={req.id}
                  className={cn(
                    "flex items-center text-xs",
                    requirementStatus[req.id] ? "text-green-600" : "text-muted-foreground"
                  )}
                >
                  {requirementStatus[req.id] ? (
                    <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                  ) : (
                    <X className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  )}
                  {req.text}
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}