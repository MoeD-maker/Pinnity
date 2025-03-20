import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, InputProps } from "@/components/ui/input";
import { EyeIcon, EyeOffIcon, CheckIcon, XIcon } from "lucide-react";

interface PasswordRequirement {
  regex: RegExp;
  text: string;
}

interface PasswordInputProps extends Omit<InputProps, "onChange"> {
  showRequirements?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PasswordInput({
  className,
  showRequirements = false,
  onChange,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [password, setPassword] = React.useState("");

  // Define password requirements
  const requirements: PasswordRequirement[] = [
    { regex: /.{8,}/, text: "At least 8 characters" },
    { regex: /[A-Z]/, text: "At least one uppercase letter" },
    { regex: /[a-z]/, text: "At least one lowercase letter" },
    { regex: /[0-9]/, text: "At least one number" },
    { regex: /[^A-Za-z0-9]/, text: "At least one special character" },
  ];

  // Handle password input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (onChange) {
      onChange(e);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          className={cn("pr-10", className)}
          onChange={handleChange}
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
            <EyeOffIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <EyeIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="sr-only">
            {showPassword ? "Hide password" : "Show password"}
          </span>
        </Button>
      </div>

      {/* Display password requirements if enabled and the input is focused or has content */}
      {showRequirements && password.length > 0 && (
        <div className="mt-2 space-y-1 text-sm">
          {requirements.map((req, index) => {
            const isMet = req.regex.test(password);
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-1.5",
                  isMet ? "text-green-600" : "text-muted-foreground"
                )}
              >
                {isMet ? (
                  <CheckIcon className="h-3 w-3" />
                ) : (
                  <XIcon className="h-3 w-3" />
                )}
                <span className="text-xs">{req.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}