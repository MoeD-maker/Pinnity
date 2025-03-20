import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { FormErrorMessage, FormErrorState, FormErrorVariant } from './form-error-message';
import { 
  useFormContext, 
  Controller, 
  FieldValues, 
  FieldPath,
  ControllerRenderProps
} from 'react-hook-form';
import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

// Type for field type
export type FieldType = 'text' | 'email' | 'password' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox';

// Type for select options
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Base props for all field types
interface BaseFieldProps<TFieldValues extends FieldValues = FieldValues> {
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  description?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  showSuccessIndicator?: boolean;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  defaultValue?: any;
  id?: string;
}

// Props for text-like fields
interface TextFieldProps<TFieldValues extends FieldValues = FieldValues> extends BaseFieldProps<TFieldValues> {
  type: Exclude<FieldType, 'textarea' | 'select' | 'checkbox'>;
  onChangeCallback?: (value: string) => void;
  pattern?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  autoComplete?: string;
}

// Props for textarea fields
interface TextareaFieldProps<TFieldValues extends FieldValues = FieldValues> extends BaseFieldProps<TFieldValues> {
  type: 'textarea';
  rows?: number;
  onChangeCallback?: (value: string) => void;
}

// Props for select fields
interface SelectFieldProps<TFieldValues extends FieldValues = FieldValues> extends BaseFieldProps<TFieldValues> {
  type: 'select';
  options: SelectOption[];
  emptyOptionLabel?: string;
  onChangeCallback?: (value: string) => void;
}

// Props for checkbox fields
interface CheckboxFieldProps<TFieldValues extends FieldValues = FieldValues> extends BaseFieldProps<TFieldValues> {
  type: 'checkbox';
  checkboxLabel?: string;
  onChangeCallback?: (checked: boolean) => void;
}

// Combined props type
export type ValidatedFieldProps<TFieldValues extends FieldValues = FieldValues> = 
  | TextFieldProps<TFieldValues>
  | TextareaFieldProps<TFieldValues>
  | SelectFieldProps<TFieldValues>
  | CheckboxFieldProps<TFieldValues>;

/**
 * A form field component with integrated validation feedback
 * that works with react-hook-form
 */
export function ValidatedField<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  placeholder,
  description,
  hint,
  disabled = false,
  required = false,
  className,
  showSuccessIndicator = true,
  validateOnBlur = true,
  validateOnChange = false,
  defaultValue,
  id = name,
  ...props
}: ValidatedFieldProps<TFieldValues>) {
  const { 
    control, 
    formState: { errors, touchedFields, dirtyFields },
    getFieldState,
    trigger
  } = useFormContext<TFieldValues>();
  
  // Local state for field focus
  const [isFocused, setIsFocused] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  
  // Get the error for this field
  const fieldState = getFieldState(name);
  const errorMessage = fieldState.error?.message;
  const isTouched = !!fieldState.isTouched;
  const isDirty = !!fieldState.isDirty;
  
  // Determine validation state
  const validationState: FormErrorState = {
    fieldName: name,
    message: errorMessage || '',
    type: errorMessage ? 'error' : (isTouched && isDirty && !errorMessage && isValidated) ? 'success' : 'none',
    touched: isTouched,
    focused: isFocused
  };
  
  // Handle blur event to validate
  const handleBlur = async (field: ControllerRenderProps<TFieldValues, FieldPath<TFieldValues>>) => {
    field.onBlur();
    setIsFocused(false);
    
    if (validateOnBlur) {
      await trigger(name);
      setIsValidated(true);
    }
  };
  
  // Handle focus event
  const handleFocus = () => {
    setIsFocused(true);
  };
  
  // Handle change event for validation
  const handleChange = async (
    value: any, 
    field: ControllerRenderProps<TFieldValues, FieldPath<TFieldValues>>,
    callback?: (value: any) => void
  ) => {
    field.onChange(value);
    
    if (callback) {
      callback(value);
    }
    
    if (validateOnChange) {
      await trigger(name);
      setIsValidated(true);
    }
  };
  
  // Determine the type of field to render
  const renderField = (field: ControllerRenderProps<TFieldValues, FieldPath<TFieldValues>>) => {
    switch (props.type) {
      case 'textarea':
        return (
          <Textarea
            {...field}
            id={id}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              errorMessage && "border-destructive focus-visible:ring-destructive",
              validationState.type === 'success' && showSuccessIndicator && "border-green-500 focus-visible:ring-green-500",
              "resize-none"
            )}
            rows={(props as TextareaFieldProps<TFieldValues>).rows || 4}
            onFocus={handleFocus}
            onBlur={() => handleBlur(field)}
            onChange={(e) => handleChange(
              e.target.value, 
              field, 
              (props as TextareaFieldProps<TFieldValues>).onChangeCallback
            )}
            value={field.value || ''}
            aria-invalid={!!errorMessage}
            aria-describedby={errorMessage ? `${name}-error` : undefined}
          />
        );
        
      case 'select':
        const selectProps = props as SelectFieldProps<TFieldValues>;
        return (
          <Select
            disabled={disabled}
            value={field.value || ''}
            onValueChange={(value) => handleChange(
              value, 
              field, 
              selectProps.onChangeCallback
            )}
            onOpenChange={(open) => {
              if (!open) {
                handleBlur(field);
              } else {
                handleFocus();
              }
            }}
          >
            <SelectTrigger
              id={id}
              className={cn(
                errorMessage && "border-destructive focus-visible:ring-destructive",
                validationState.type === 'success' && showSuccessIndicator && "border-green-500 focus-visible:ring-green-500"
              )}
              aria-invalid={!!errorMessage}
              aria-describedby={errorMessage ? `${name}-error` : undefined}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {selectProps.emptyOptionLabel && (
                <SelectItem value="">
                  {selectProps.emptyOptionLabel}
                </SelectItem>
              )}
              
              {selectProps.options.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      case 'checkbox':
        const checkboxProps = props as CheckboxFieldProps<TFieldValues>;
        return (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id={id}
              checked={!!field.value} 
              onCheckedChange={(checked) => handleChange(
                checked, 
                field,
                checkboxProps.onChangeCallback as any
              )}
              disabled={disabled}
              className={cn(
                errorMessage && "border-destructive focus-visible:ring-destructive",
                validationState.type === 'success' && showSuccessIndicator && "border-green-500 focus-visible:ring-green-500"
              )}
              aria-invalid={!!errorMessage}
              aria-describedby={errorMessage ? `${name}-error` : undefined}
              onFocus={handleFocus}
              onBlur={() => handleBlur(field)}
            />
            {checkboxProps.checkboxLabel && (
              <label 
                htmlFor={id}
                className={cn(
                  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                  errorMessage && "text-destructive"
                )}
              >
                {checkboxProps.checkboxLabel}
                {required && <span className="text-destructive ml-1">*</span>}
              </label>
            )}
          </div>
        );
        
      // Default to text input for all other types
      default:
        const textFieldProps = props as TextFieldProps<TFieldValues>;
        return (
          <Input
            {...field}
            id={id}
            type={textFieldProps.type}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              errorMessage && "border-destructive focus-visible:ring-destructive",
              validationState.type === 'success' && showSuccessIndicator && "border-green-500 focus-visible:ring-green-500"
            )}
            pattern={textFieldProps.pattern}
            min={textFieldProps.min}
            max={textFieldProps.max}
            step={textFieldProps.step}
            autoComplete={textFieldProps.autoComplete}
            onFocus={handleFocus}
            onBlur={() => handleBlur(field)}
            onChange={(e) => handleChange(
              e.target.value, 
              field, 
              textFieldProps.onChangeCallback
            )}
            value={field.value || ''}
            aria-invalid={!!errorMessage}
            aria-describedby={errorMessage ? `${name}-error` : undefined}
          />
        );
    }
  };
  
  return (
    <div className={cn("space-y-2", props.type === 'checkbox' ? "space-y-0" : "", className)}>
      {/* Don't show label for checkbox fields if they have a checkbox label */}
      {!(props.type === 'checkbox' && (props as CheckboxFieldProps<TFieldValues>).checkboxLabel) && (
        <Label 
          htmlFor={id}
          className={cn(
            errorMessage && "text-destructive"
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      {/* Show description/hint above the field */}
      {description && (
        <div className="text-sm text-muted-foreground">{description}</div>
      )}
      
      {/* The actual form field */}
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue || (props.type === 'checkbox' ? false : '')}
        render={({ field }) => renderField(field)}
      />
      
      {/* Show validation messages */}
      <FormErrorMessage errorState={validationState} />
      
      {/* Show hint below the field */}
      {hint && !errorMessage && (
        <div className="text-xs text-muted-foreground flex items-center mt-1">
          <HelpCircle className="h-3 w-3 mr-1" />
          {hint}
        </div>
      )}
    </div>
  );
}

/**
 * A group of validated fields with a common label and validation state
 */
export function ValidatedFieldGroup<TFieldValues extends FieldValues = FieldValues>({ 
  children,
  label,
  description,
  hint,
  error,
  className,
  required = false
}: {
  children: React.ReactNode;
  label: string;
  description?: string;
  hint?: string;
  error?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="space-y-1">
        <Label className={cn(error && "text-destructive")}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      
      <div className="space-y-4 pl-0 sm:pl-4 pt-2 pb-1 border-l-2 border-muted">
        {children}
      </div>
      
      {error && (
        <FormErrorMessage error={error} fieldName="group" />
      )}
      
      {hint && !error && (
        <div className="text-xs text-muted-foreground flex items-center mt-1">
          <HelpCircle className="h-3 w-3 mr-1" />
          {hint}
        </div>
      )}
    </div>
  );
}

/**
 * A validated checkbox group for multi-select options
 */
export function ValidatedCheckboxGroup<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  options,
  description,
  error,
  disabled = false,
  required = false,
  className,
  onChangeCallback,
  defaultValue = []
}: {
  name: FieldPath<TFieldValues>;
  label: string;
  options: { id: string; label: string; disabled?: boolean }[];
  description?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onChangeCallback?: (values: string[]) => void;
  defaultValue?: string[];
}) {
  const { control, formState: { errors } } = useFormContext<TFieldValues>();
  const errorMessage = errors[name]?.message as string | undefined;
  
  return (
    <div className={cn("space-y-2", className)}>
      <Label className={cn(errorMessage && "text-destructive")}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      
      {description && (
        <div className="text-sm text-muted-foreground">{description}</div>
      )}
      
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue as any}
        render={({ field }) => (
          <div className="space-y-2">
            {options.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`${name}-${option.id}`}
                  checked={(field.value || []).includes(option.id)}
                  onCheckedChange={(checked) => {
                    const updatedValues = checked 
                      ? [...(field.value || []), option.id]
                      : (field.value || []).filter((value: string) => value !== option.id);
                    
                    field.onChange(updatedValues);
                    
                    if (onChangeCallback) {
                      onChangeCallback(updatedValues);
                    }
                  }}
                  disabled={disabled || option.disabled}
                  className={cn(
                    errorMessage && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <label
                  htmlFor={`${name}-${option.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        )}
      />
      
      <FormErrorMessage error={errorMessage || error} fieldName={name} />
    </div>
  );
}