import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, className, error, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(false);
    const hasValue = props.value !== undefined && props.value !== "";

    const togglePasswordVisibility = () => {
      setShowPassword((prev) => !prev);
    };

    return (
      <div className="space-y-1">
        <div
          className={cn(
            "relative rounded-md border transition-all duration-200",
            focused || hasValue ? "border-[#00796B]" : "border-gray-200",
            error ? "border-red-500" : "",
            className
          )}
        >
          <input
            type={showPassword ? "text" : "password"}
            ref={ref}
            className="block w-full px-4 pt-6 pb-1 text-gray-700 bg-white appearance-none focus:outline-none pr-12"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder=" "
            {...props}
          />
          <label
            className={cn(
              "absolute top-2 left-4 text-xs font-medium transition-colors",
              focused ? "text-[#00796B]" : "text-gray-400",
              error ? "text-red-500" : ""
            )}
          >
            {label}
          </label>
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
