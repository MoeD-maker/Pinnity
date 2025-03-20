import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormControl } from "@/components/ui/form";
import { Check, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { ValidationMessage } from "@/components/ui/validation-message";
import { motion } from "framer-motion";

type PasswordRequirement = {
  id: string;
  label: string;
  regex: RegExp;
  met: boolean;
};

export type PasswordStrength = "empty" | "weak" | "medium" | "strong" | "very-strong";

interface PasswordInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  showRequirements?: boolean;
  error?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showStrengthMeter?: boolean;
  fieldTouched?: boolean;
  onRequirementsMet?: (allMet: boolean) => void;
}

export function PasswordInput({
  label,
  value,
  onChange,
  showRequirements = true,
  error,
  id = "password",
  placeholder = "Enter your password",
  className,
  disabled = false,
  showStrengthMeter = true,
  fieldTouched = false,
  onRequirementsMet,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [requirements, setRequirements] = useState<PasswordRequirement[]>([
    {
      id: "length",
      label: "At least 8 characters",
      regex: /^.{8,}$/,
      met: false,
    },
    {
      id: "uppercase",
      label: "At least one uppercase letter",
      regex: /[A-Z]/,
      met: false,
    },
    {
      id: "lowercase",
      label: "At least one lowercase letter",
      regex: /[a-z]/,
      met: false,
    },
    {
      id: "number",
      label: "At least one number",
      regex: /[0-9]/,
      met: false,
    },
    {
      id: "special",
      label: "At least one special character",
      regex: /[^A-Za-z0-9]/,
      met: false,
    },
  ]);

  // Update requirement statuses when password changes
  useEffect(() => {
    const updatedRequirements = requirements.map((req) => ({
      ...req,
      met: req.regex.test(value),
    }));
    
    setRequirements(updatedRequirements);
    
    // Notify parent about all requirements being met
    if (onRequirementsMet) {
      const allMet = updatedRequirements.every((req) => req.met);
      onRequirementsMet(allMet);
    }
  }, [value, onRequirementsMet]);

  // Calculate password strength
  const getPasswordStrength = (): PasswordStrength => {
    if (!value) return "empty";
    
    const metCount = requirements.filter(req => req.met).length;
    
    if (metCount === 0) return "weak";
    if (metCount < 3) return "medium";
    if (metCount < 5) return "strong";
    return "very-strong";
  };
  
  // Get display data for strength meter
  const getStrengthData = () => {
    const strength = getPasswordStrength();
    
    const data = {
      empty: {
        text: "Enter password",
        color: "bg-gray-200",
        percentage: 0,
      },
      weak: {
        text: "Weak",
        color: "bg-red-500",
        percentage: 20,
      },
      medium: {
        text: "Medium",
        color: "bg-amber-500",
        percentage: 50,
      },
      strong: {
        text: "Strong",
        color: "bg-green-500",
        percentage: 80,
      },
      "very-strong": {
        text: "Very strong",
        color: "bg-emerald-500",
        percentage: 100,
      },
    };
    
    return data[strength];
  };
  
  const strength = getStrengthData();
  const showRequirementsList = showRequirements && (passwordFocused || fieldTouched);
  
  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
      )}
      <div className="relative">
        <FormControl>
          <Input
            type={showPassword ? "text" : "password"}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn("pr-10", error && "border-destructive", className)}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />
        </FormControl>
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-500"
          onClick={toggleShowPassword}
          aria-label={showPassword ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Password strength meter */}
      {showStrengthMeter && value && (
        <div className="mt-2">
          <div className="flex justify-between items-center mb-1 text-xs">
            <span>Password strength:</span>
            <span className={cn(
              "font-medium",
              strength.color.replace("bg-", "text-")
            )}>
              {strength.text}
            </span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className={cn("h-full", strength.color)}
              initial={{ width: "0%" }}
              animate={{ width: `${strength.percentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <ValidationMessage 
          status="error"
          message={error}
          visible={true}
        />
      )}

      {/* Password requirements */}
      {showRequirementsList && (
        <motion.div 
          className="mt-3 space-y-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-xs font-medium text-muted-foreground">
            Password requirements:
          </p>
          <ul className="space-y-1 text-xs">
            {requirements.map((req) => (
              <li
                key={req.id}
                className={cn(
                  "flex items-center gap-2",
                  req.met ? "text-green-600" : "text-muted-foreground"
                )}
              >
                {req.met ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                {req.label}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}