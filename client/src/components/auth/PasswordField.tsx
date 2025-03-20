import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PasswordRequirement {
  regex: RegExp;
  text: string;
}

interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showRequirements?: boolean;
  className?: string;
}

export function PasswordField({
  showRequirements = false,
  className = '',
  value = '',
  onChange,
  onBlur,
  ...props
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  
  // Convert value to string if it's not already
  const passwordValue = typeof value === 'string' ? value : String(value || '');
  
  // Define password requirements with clear descriptions
  const requirements: PasswordRequirement[] = [
    { regex: /.{8,}/, text: "At least 8 characters" },
    { regex: /[A-Z]/, text: "At least one uppercase letter" },
    { regex: /[a-z]/, text: "At least one lowercase letter" },
    { regex: /[0-9]/, text: "At least one number" },
    { regex: /[^A-Za-z0-9]/, text: "At least one special character" },
  ];

  // Check if requirement is met
  const checkRequirement = (regex: RegExp) => regex.test(passwordValue);

  return (
    <div className="w-full space-y-2">
      <div className="relative w-full">
        <Input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={(e) => {
            setFocused(false);
            if (onBlur) onBlur(e);
          }}
          onFocus={() => setFocused(true)}
          className={cn("pr-10", className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-gray-500" />
          ) : (
            <Eye className="h-4 w-4 text-gray-500" />
          )}
          <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
        </Button>
      </div>
      
      {showRequirements && (passwordValue.length > 0 || focused) && (
        <div className="pt-2 space-y-2">
          <p className="text-xs font-medium text-gray-700 mb-1">Password requirements:</p>
          <ul className="space-y-1">
            {requirements.map((requirement, index) => {
              const isMet = checkRequirement(requirement.regex);
              return (
                <li 
                  key={index} 
                  className={cn(
                    "flex items-center text-xs",
                    isMet ? "text-green-600" : "text-gray-500"
                  )}
                >
                  {isMet ? (
                    <CheckCircle className="h-3.5 w-3.5 mr-2 text-green-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 mr-2 text-gray-400" />
                  )}
                  {requirement.text}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PasswordField;