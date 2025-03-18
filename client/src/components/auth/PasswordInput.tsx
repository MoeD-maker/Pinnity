import { forwardRef, useState, useEffect } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  showRequirements?: boolean;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, className, error, showRequirements = true, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(false);
    
    // Get the current value from props to determine if we have a value
    const currentValue = props.value as string || "";
    const hasValue = currentValue.length > 0;

    // Password requirements validation state
    const [requirements, setRequirements] = useState({
      length: false,
      uppercase: false,
      number: false,
      special: false
    });

    // Update requirements whenever the value changes
    useEffect(() => {
      if (typeof currentValue === 'string') {
        setRequirements({
          length: currentValue.length >= 8,
          uppercase: /[A-Z]/.test(currentValue),
          number: /[0-9]/.test(currentValue),
          special: /[^A-Za-z0-9]/.test(currentValue)
        });
      }
    }, [currentValue]);

    const togglePasswordVisibility = () => {
      setShowPassword((prev) => !prev);
    };

    // Handle input change, forwarding the event to the parent
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e);
      }
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
            onChange={handleInputChange}
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
        
        {/* Password requirements section */}
        {showRequirements && (
          <div className={`mt-2 text-xs rounded-md p-2 ${hasValue ? 'bg-gray-50' : 'bg-gray-50'}`}>
            <p className="font-medium text-sm mb-1 text-gray-600">Password requirements:</p>
            <ul className="space-y-1 pl-0.5">
              <li className="flex items-center gap-1.5">
                {requirements.length ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <X className="h-3.5 w-3.5 text-gray-400" />
                )}
                <span className={requirements.length ? "text-green-700" : "text-gray-500"}>
                  At least 8 characters
                </span>
              </li>
              <li className="flex items-center gap-1.5">
                {requirements.uppercase ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <X className="h-3.5 w-3.5 text-gray-400" />
                )}
                <span className={requirements.uppercase ? "text-green-700" : "text-gray-500"}>
                  At least one uppercase letter
                </span>
              </li>
              <li className="flex items-center gap-1.5">
                {requirements.number ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <X className="h-3.5 w-3.5 text-gray-400" />
                )}
                <span className={requirements.number ? "text-green-700" : "text-gray-500"}>
                  At least one number
                </span>
              </li>
              <li className="flex items-center gap-1.5">
                {requirements.special ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <X className="h-3.5 w-3.5 text-gray-400" />
                )}
                <span className={requirements.special ? "text-green-700" : "text-gray-500"}>
                  At least one special character
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
