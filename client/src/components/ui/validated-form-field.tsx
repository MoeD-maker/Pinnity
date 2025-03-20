import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/ui/password-input";
import { UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";

export type FieldType = "text" | "email" | "password" | "textarea" | "checkbox" | "number" | "tel" | "url";

interface ValidatedFormFieldProps {
  form: UseFormReturn<any, any, any>;
  name: string;
  label?: string;
  placeholder?: string;
  description?: string;
  type?: FieldType;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showPasswordRequirements?: boolean;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  checkboxLabel?: string;
  defaultValue?: any;
  autoFocus?: boolean;
  onValueChange?: (value: any) => void;
}

export function ValidatedFormField({
  form,
  name,
  label,
  placeholder,
  description,
  type = "text",
  required = false,
  disabled = false,
  className,
  showPasswordRequirements = true,
  min,
  max,
  step,
  rows = 3,
  checkboxLabel,
  defaultValue,
  autoFocus = false,
  onValueChange,
}: ValidatedFormFieldProps) {
  // Generate a unique ID for the field
  const fieldId = `field-${name.replace(/\./g, "-")}`;
  
  // Format label with required indicator
  const formattedLabel = required ? `${label} *` : label;

  // Get the error message for the field
  const errorMessage = form.formState.errors[name]?.message;
  
  // Show real-time validation errors only if field is touched or dirty
  const showError = !!errorMessage && (form.formState.touchedFields[name] || form.formState.dirtyFields[name]);

  // Handle input change with optional callback
  const handleInputChange = (value: any) => {
    // Set the form value
    form.setValue(name, value, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
    
    // Call the external handler if provided
    if (onValueChange) {
      onValueChange(value);
    }
  };

  return (
    <FormField
      control={form.control}
      name={name}
      defaultValue={defaultValue}
      render={({ field }) => (
        <FormItem className={cn("space-y-2", className)}>
          {label && <FormLabel className={cn(required && "after:text-destructive after:ml-0.5 after:content-['*']")}>
            {label}
          </FormLabel>}
          
          <FormControl>
            {type === "password" ? (
              <PasswordInput
                value={field.value || ""}
                onChange={(value) => handleInputChange(value)}
                showRequirements={showPasswordRequirements}
                error={showError ? String(errorMessage) : undefined}
                id={fieldId}
                placeholder={placeholder}
                disabled={disabled}
              />
            ) : type === "textarea" ? (
              <Textarea
                {...field}
                id={fieldId}
                placeholder={placeholder}
                disabled={disabled}
                rows={rows}
                className={cn(showError && "border-destructive focus-visible:ring-destructive")}
                autoFocus={autoFocus}
                onChange={(e) => {
                  field.onChange(e);
                  if (onValueChange) onValueChange(e.target.value);
                }}
              />
            ) : type === "checkbox" ? (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={fieldId}
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    handleInputChange(checked);
                  }}
                  disabled={disabled}
                />
                {checkboxLabel && (
                  <label
                    htmlFor={fieldId}
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {checkboxLabel}
                  </label>
                )}
              </div>
            ) : (
              <Input
                {...field}
                type={type}
                id={fieldId}
                placeholder={placeholder}
                disabled={disabled}
                min={min}
                max={max}
                step={step}
                className={cn(showError && "border-destructive focus-visible:ring-destructive")}
                autoFocus={autoFocus}
                onChange={(e) => {
                  // For number inputs, convert string to number
                  if (type === "number") {
                    const value = e.target.value === "" ? "" : Number(e.target.value);
                    field.onChange(value);
                    if (onValueChange) onValueChange(value);
                  } else {
                    field.onChange(e);
                    if (onValueChange) onValueChange(e.target.value);
                  }
                }}
              />
            )}
          </FormControl>
          
          {description && <FormDescription>{description}</FormDescription>}
          
          {/* Show validation error message */}
          {showError && <FormMessage>{errorMessage as React.ReactNode}</FormMessage>}
        </FormItem>
      )}
    />
  );
}