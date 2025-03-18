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
    const [passwordValue, setPasswordValue] = useState("");
    
    // Get the current value from props to determine if we have a value
    const currentValue = props.value as string || "";
    const hasValue = currentValue.length > 0;

    // Password requirements validation state
    // Only show as valid if the user has entered something
    const lengthValid = currentValue.length >= 8;
    const uppercaseValid = /[A-Z]/.test(currentValue);
    const numberValid = /[0-9]/.test(currentValue);
    const specialValid = /[^A-Za-z0-9]/.test(currentValue);
    
    // Define the requirements array for simpler management
    const requirements = [
      { key: "length", text: "At least 8 characters", met: lengthValid },
      { key: "uppercase", text: "At least one uppercase letter", met: uppercaseValid },
      { key: "number", text: "At least one number", met: numberValid },
      { key: "special", text: "At least one special character", met: specialValid }
    ].map(req => ({
      ...req,
      // Only show as failed if the user has started typing
      status: !hasValue ? 'neutral' : req.met ? 'valid' : 'invalid'
    }));

    const togglePasswordVisibility = () => {
      setShowPassword((prev) => !prev);
    };

    // Handle input change, forwarding the event to the parent
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setPasswordValue(newValue);
      
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
          <div className="mt-2 text-xs rounded-md p-2 bg-gray-50">
            <p className="font-medium text-sm mb-1 text-gray-600">Password requirements:</p>
            <ul className="space-y-1 pl-0.5">
              {requirements.map((requirement) => (
                <li key={requirement.key} className="flex items-center gap-1.5">
                  {requirement.status === 'valid' ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : requirement.status === 'invalid' ? (
                    <X className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-gray-400" />
                  )}
                  <span className={
                    requirement.status === 'valid' ? "text-green-700" : 
                    requirement.status === 'invalid' ? "text-red-500" :
                    "text-gray-500"
                  }>
                    {requirement.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
