import { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, className, error, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const hasValue = props.value !== undefined && props.value !== "";

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
            ref={ref}
            className="block w-full px-4 pt-6 pb-1 text-gray-700 bg-white appearance-none focus:outline-none"
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
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

export default FormInput;
