import { useState, useEffect } from 'react';
import { ZodSchema, z } from 'zod';
import { useForm, UseFormReturn, FieldValues, DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

interface UseFormValidationOptions<T extends FieldValues> {
  schema: ZodSchema<any>;
  defaultValues?: DefaultValues<T>;
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
  validateOnMount?: boolean;
  persistKey?: string;
}

interface ValidationState {
  isValid: boolean;
  isValidating: boolean;
  validatedFields: string[];
  invalidFields: string[];
  fieldErrors: Record<string, string>;
}

/**
 * Custom hook that combines react-hook-form with Zod validation and provides
 * enhanced real-time validation feedback.
 */
export function useFormValidation<T extends FieldValues>({
  schema,
  defaultValues,
  mode = 'onChange',
  validateOnMount = false,
  persistKey
}: UseFormValidationOptions<T>): {
  form: UseFormReturn<T>;
  validation: ValidationState;
  validateField: (fieldName: string) => Promise<boolean>;
  validateAllFields: () => Promise<boolean>;
  resetValidation: () => void;
  getFieldErrorMessage: (fieldName: string) => string | undefined;
} {
  // Create the form with Zod resolver
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode,
  });
  
  // Validation state tracking
  const [validation, setValidation] = useState<ValidationState>({
    isValid: false,
    isValidating: false,
    validatedFields: [],
    invalidFields: [],
    fieldErrors: {},
  });
  
  // Load persisted form data if a persistence key is provided
  useEffect(() => {
    if (persistKey) {
      const savedData = localStorage.getItem(`form-${persistKey}`);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          form.reset(parsedData);
        } catch (e) {
          console.error('Error loading saved form data:', e);
        }
      }
    }
  }, [persistKey, form]);
  
  // Persist form data on changes if a persistence key is provided
  useEffect(() => {
    if (persistKey) {
      const subscription = form.watch((value) => {
        localStorage.setItem(`form-${persistKey}`, JSON.stringify(value));
      });
      
      return () => subscription.unsubscribe();
    }
  }, [persistKey, form]);
  
  // Run validation on mount if requested
  useEffect(() => {
    if (validateOnMount) {
      form.trigger();
    }
  }, [validateOnMount, form]);
  
  // Update validation state when form state changes
  useEffect(() => {
    const { errors, isValid, isValidating, dirtyFields } = form.formState;
    
    // Track which fields have validation errors
    const invalidFields = Object.keys(errors);
    
    // Track which fields have been validated (either valid or invalid)
    const validatedFields = [
      ...Object.keys(dirtyFields).filter(field => !invalidFields.includes(field)),
      ...invalidFields
    ];
    
    // Build a map of field errors with friendly messages
    const fieldErrors: Record<string, string> = {};
    for (const field in errors) {
      fieldErrors[field] = errors[field]?.message as string || 'Invalid value';
    }
    
    setValidation({
      isValid,
      isValidating,
      validatedFields,
      invalidFields,
      fieldErrors,
    });
  }, [form.formState]);
  
  // Validate a specific field
  const validateField = async (fieldName: string): Promise<boolean> => {
    return await form.trigger(fieldName as any, { shouldFocus: true });
  };
  
  // Validate all fields
  const validateAllFields = async (): Promise<boolean> => {
    return await form.trigger();
  };
  
  // Reset validation state
  const resetValidation = () => {
    setValidation({
      isValid: false,
      isValidating: false,
      validatedFields: [],
      invalidFields: [],
      fieldErrors: {},
    });
  };
  
  // Get error message for a specific field
  const getFieldErrorMessage = (fieldName: string): string | undefined => {
    return validation.fieldErrors[fieldName];
  };
  
  return {
    form,
    validation,
    validateField,
    validateAllFields,
    resetValidation,
    getFieldErrorMessage,
  };
}