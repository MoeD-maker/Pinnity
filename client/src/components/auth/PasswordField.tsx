import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, X, Check } from 'lucide-react';

interface PasswordFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  name?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
  showRequirements?: boolean;
}

export function PasswordField({
  value,
  onChange,
  placeholder,
  name,
  onBlur,
  className,
  showRequirements = false,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  // Password validation rules
  const hasMinLength = value.length >= 8;
  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          name={name}
          onBlur={(e) => {
            setFocused(false);
            if (onBlur) onBlur(e);
          }}
          onFocus={() => setFocused(true)}
          className={`pr-10 ${className}`}
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

      {showRequirements && (focused || value.length > 0) && (
        <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
          <p className="mb-1 font-medium text-gray-700">Password requirements:</p>
          <ul className="space-y-1 text-xs">
            <li className="flex items-center">
              {hasMinLength ? (
                <Check className="mr-1 h-3.5 w-3.5 text-green-500" />
              ) : (
                <X className="mr-1 h-3.5 w-3.5 text-red-500" />
              )}
              <span className={hasMinLength ? 'text-green-700' : 'text-gray-600'}>
                At least 8 characters
              </span>
            </li>
            <li className="flex items-center">
              {hasUpperCase ? (
                <Check className="mr-1 h-3.5 w-3.5 text-green-500" />
              ) : (
                <X className="mr-1 h-3.5 w-3.5 text-red-500" />
              )}
              <span className={hasUpperCase ? 'text-green-700' : 'text-gray-600'}>
                One uppercase letter
              </span>
            </li>
            <li className="flex items-center">
              {hasLowerCase ? (
                <Check className="mr-1 h-3.5 w-3.5 text-green-500" />
              ) : (
                <X className="mr-1 h-3.5 w-3.5 text-red-500" />
              )}
              <span className={hasLowerCase ? 'text-green-700' : 'text-gray-600'}>
                One lowercase letter
              </span>
            </li>
            <li className="flex items-center">
              {hasNumber ? (
                <Check className="mr-1 h-3.5 w-3.5 text-green-500" />
              ) : (
                <X className="mr-1 h-3.5 w-3.5 text-red-500" />
              )}
              <span className={hasNumber ? 'text-green-700' : 'text-gray-600'}>
                One number
              </span>
            </li>
            <li className="flex items-center">
              {hasSpecial ? (
                <Check className="mr-1 h-3.5 w-3.5 text-green-500" />
              ) : (
                <X className="mr-1 h-3.5 w-3.5 text-red-500" />
              )}
              <span className={hasSpecial ? 'text-green-700' : 'text-gray-600'}>
                One special character
              </span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}