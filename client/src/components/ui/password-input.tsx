import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormControl } from "@/components/ui/form";
import { Check, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PasswordRequirement = {
  id: string;
  label: string;
  regex: RegExp;
  met: boolean;
};

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
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
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
    setRequirements((prev) =>
      prev.map((req) => ({
        ...req,
        met: req.regex.test(value),
      }))
    );
  }, [value]);

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
            className={cn("pr-10", className)}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
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

      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {showRequirements && (
        <div className="mt-3 space-y-2">
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
        </div>
      )}
    </div>
  );
}