import React, { useState, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X, Eye, EyeOff } from 'lucide-react';

interface PasswordRequirement {
  id: string;
  label: string;
  regex: RegExp;
}

const passwordRequirements: PasswordRequirement[] = [
  { id: 'min-length', label: 'At least 8 characters', regex: /.{8,}/ },
  { id: 'uppercase', label: 'At least one uppercase letter', regex: /[A-Z]/ },
  { id: 'lowercase', label: 'At least one lowercase letter', regex: /[a-z]/ },
  { id: 'number', label: 'At least one number', regex: /[0-9]/ },
  { id: 'special', label: 'At least one special character', regex: /[^A-Za-z0-9]/ },
];

interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showRequirements?: boolean;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ showRequirements = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [passwordValue, setPasswordValue] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setPasswordValue(value);
      
      // Also call the original onChange handler if provided
      if (props.onChange) {
        props.onChange(e);
      }
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            {...props}
            onChange={handleChange}
            ref={ref}
            className="pr-10"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={togglePasswordVisibility}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {showRequirements && passwordValue && (
          <div className="mt-3 space-y-2">
            <div className="text-sm font-medium text-gray-700">Password must have:</div>
            <div className="space-y-1 text-sm">
              {passwordRequirements.map((req) => (
                <RequirementItem
                  key={req.id}
                  label={req.label}
                  isMet={req.regex.test(passwordValue)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

PasswordField.displayName = 'PasswordField';

interface RequirementItemProps {
  label: string;
  isMet: boolean;
}

function RequirementItem({ label, isMet }: RequirementItemProps) {
  return (
    <div className="flex items-center">
      <div className={`mr-2 ${isMet ? 'text-green-500' : 'text-gray-400'}`}>
        {isMet ? <Check size={16} /> : <X size={16} />}
      </div>
      <span className={isMet ? 'text-green-700' : 'text-gray-500'}>{label}</span>
    </div>
  );
}