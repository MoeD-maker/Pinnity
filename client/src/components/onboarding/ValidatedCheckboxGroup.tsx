import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

interface CheckboxOption {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface ValidatedCheckboxGroupProps {
  name: string;
  label?: string;
  options: CheckboxOption[];
  required?: boolean;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  onChange?: (selectedIds: string[]) => void;
}

export function ValidatedCheckboxGroup({
  name,
  label,
  options,
  required = false,
  columns = 2,
  className,
  onChange
}: ValidatedCheckboxGroupProps) {
  const form = useFormContext();
  
  // Get current values
  const fieldValue = form.watch(name) || {};
  
  // Track which options are currently selected
  const selectedOptions = Object.entries(fieldValue)
    .filter(([, isSelected]) => isSelected)
    .map(([id]) => id);
  
  // Handle checkbox change
  const handleCheckboxChange = (option: string, checked: boolean) => {
    // Update the form
    form.setValue(
      name,
      { ...fieldValue, [option]: checked },
      { shouldValidate: true, shouldDirty: true, shouldTouch: true }
    );
    
    // Calculate new selected options
    const newSelected = checked
      ? [...selectedOptions, option]
      : selectedOptions.filter(id => id !== option);
    
    // Call the onChange callback if provided
    if (onChange) {
      onChange(newSelected);
    }
  };
  
  // Define grid columns based on the columns prop
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 md:grid-cols-4",
  }[columns];
  
  return (
    <FormField
      control={form.control}
      name={name}
      render={() => (
        <FormItem className={className}>
          {label && (
            <FormLabel className={cn(
              "text-base",
              required && "after:content-['*'] after:ml-0.5 after:text-destructive"
            )}>
              {label}
            </FormLabel>
          )}
          
          <FormControl>
            <div className={cn("grid gap-4 pt-2", gridCols)}>
              {options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    id={`${name}-${option.id}`}
                    checked={!!fieldValue[option.id]}
                    onCheckedChange={(checked) => 
                      handleCheckboxChange(option.id, !!checked)
                    }
                  />
                  <div className="space-y-1 leading-none">
                    <label
                      htmlFor={`${name}-${option.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {option.icon && <span>{option.icon}</span>}
                        <span>{option.label}</span>
                      </div>
                    </label>
                    {option.description && (
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </FormControl>
          
          <FormMessage />
        </FormItem>
      )}
    />
  );
}