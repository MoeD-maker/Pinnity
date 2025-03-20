import React, { createContext, useContext, useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useOfflineFormPersistence } from "@/hooks/useOfflineFormPersistence";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useToast } from "@/hooks/use-toast";
import { 
  individualPreferencesSchema, 
  businessPreferencesSchema,
  getPreferencesSchema,
  type IndividualPreferences,
  type BusinessPreferences,
  type OnboardingFormData
} from "@/schemas/onboardingValidation";

// Default initial values for individual preferences
export const defaultIndividualPreferences: IndividualPreferences = {
  categories: {
    food: false,
    shopping: false,
    entertainment: false,
    travel: false,
    health: false,
    beauty: false,
    services: false,
    other: false
  },
  location: {
    enableLocationServices: false,
    radius: 10,
    savedLocations: []
  },
  notifications: {
    pushEnabled: true,
    emailEnabled: true,
    dealAlerts: true,
    weeklyDigest: false,
    favorites: true,
    expiringDeals: true
  }
};

// Default initial values for business preferences
export const defaultBusinessPreferences: BusinessPreferences = {
  businessHours: {
    monday: { open: "09:00", close: "17:00", closed: false },
    tuesday: { open: "09:00", close: "17:00", closed: false },
    wednesday: { open: "09:00", close: "17:00", closed: false },
    thursday: { open: "09:00", close: "17:00", closed: false },
    friday: { open: "09:00", close: "17:00", closed: false },
    saturday: { open: "10:00", close: "15:00", closed: false },
    sunday: { open: null, close: null, closed: true },
  },
  offerings: {
    promotions: false,
    eventsHosting: false,
    loyaltyProgram: false,
    specialDiscounts: false,
    holidaySpecials: false,
    flashSales: false
  },
  demographics: {
    ageGroups: {
      under18: false,
      age18to24: false,
      age25to34: true,
      age35to44: true,
      age45to54: false,
      age55plus: false
    },
    targetByInterest: false,
    localFocus: true
  }
};

// Context for the validated onboarding form
interface ValidatedOnboardingContextType {
  form: ReturnType<typeof useForm<any>>;
  formState: {
    userType: 'individual' | 'business';
    step: number;
    preferences: IndividualPreferences | BusinessPreferences;
    isValid: boolean;
    isDirty: boolean;
    isSubmitting: boolean;
    submitCount: number;
    errors: Record<string, any>;
  };
  actions: {
    setStep: (step: number) => void;
    resetForm: () => void;
    saveProgress: () => Promise<void>;
    setUserType: (type: 'individual' | 'business') => void;
    updatePreferences: (preferences: Partial<IndividualPreferences | BusinessPreferences>) => void;
  };
  validation: {
    validateCurrentStep: () => boolean;
    getStepErrors: (step: number) => string[];
    getFieldError: (fieldName: string) => string | undefined;
  };
  meta: {
    isOnline: boolean;
    hasSavedProgress: boolean;
    isFormPersisted: boolean;
  };
}

const ValidatedOnboardingContext = createContext<ValidatedOnboardingContextType | undefined>(undefined);

interface ValidatedOnboardingProviderProps {
  children: React.ReactNode;
  initialStep?: number;
  initialUserType?: 'individual' | 'business';
  onSubmitSuccess?: (data: OnboardingFormData) => void;
  onSubmitError?: (error: any) => void;
}

export function ValidatedOnboardingProvider({
  children,
  initialStep = 1,
  initialUserType = 'individual',
  onSubmitSuccess,
  onSubmitError
}: ValidatedOnboardingProviderProps) {
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const [step, setStep] = useState(initialStep);
  const [userType, setUserType] = useState<'individual' | 'business'>(initialUserType);
  
  // Create form with appropriate schema based on user type
  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(
      getPreferencesSchema(userType)
    ),
    mode: "onChange",
    defaultValues: {
      userType,
      step,
      preferences: userType === 'individual' 
        ? defaultIndividualPreferences 
        : defaultBusinessPreferences
    }
  });
  
  // Set up offline form persistence
  const { 
    saveForm, 
    loadForm, 
    hasSavedProgress, 
    isFormPersisted 
  } = useOfflineFormPersistence("onboarding-form", form);
  
  // Update the form's validation schema when user type changes
  useEffect(() => {
    // Reset or recreate the form with the new user type
    form.reset({
      userType,
      step,
      preferences: userType === 'individual' 
        ? defaultIndividualPreferences 
        : defaultBusinessPreferences
    });
    
    // Allow existing persisted data to be loaded
    loadForm();
  }, [userType]);
  
  // Get relevant field paths for the current step
  const getStepFields = (stepNumber: number): string[] => {
    if (userType === 'individual') {
      switch (stepNumber) {
        case 1: return ['preferences.categories'];
        case 2: return ['preferences.location'];
        case 3: return ['preferences.notifications'];
        default: return [];
      }
    } else {
      switch (stepNumber) {
        case 1: return ['preferences.businessHours'];
        case 2: return ['preferences.offerings'];
        case 3: return ['preferences.demographics'];
        default: return [];
      }
    }
  };
  
  // Validate all fields in the current step
  const validateCurrentStep = async (): Promise<boolean> => {
    const fields = getStepFields(step);
    const result = await form.trigger(fields as any);
    return result;
  };
  
  // Get all error messages for a specific step
  const getStepErrors = (stepNumber: number): string[] => {
    const fields = getStepFields(stepNumber);
    return fields
      .map(field => {
        const error = form.formState.errors[field];
        return error ? (error.message as string) : null;
      })
      .filter(Boolean) as string[];
  };
  
  // Get error message for a specific field
  const getFieldError = (fieldName: string): string | undefined => {
    const error = form.formState.errors[fieldName];
    return error ? (error.message as string) : undefined;
  };
  
  // Save form progress
  const saveProgress = async (): Promise<void> => {
    try {
      await saveForm();
      toast({
        title: "Progress saved",
        description: isOnline 
          ? "Your progress has been saved successfully." 
          : "Your progress has been saved locally and will sync when you're back online.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error saving progress",
        description: "There was a problem saving your progress. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Update preferences
  const updatePreferences = (newPrefs: Partial<IndividualPreferences | BusinessPreferences>) => {
    form.setValue('preferences', {
      ...form.getValues('preferences'),
      ...newPrefs
    }, { shouldValidate: true });
  };
  
  // Reset the form to defaults
  const resetForm = () => {
    form.reset({
      userType,
      step,
      preferences: userType === 'individual' 
        ? defaultIndividualPreferences 
        : defaultBusinessPreferences
    });
  };
  
  // Update step in form values when step changes
  useEffect(() => {
    form.setValue('step', step, { shouldValidate: false });
  }, [step, form]);
  
  const contextValue: ValidatedOnboardingContextType = {
    form,
    formState: {
      userType,
      step,
      preferences: form.getValues('preferences'),
      isValid: form.formState.isValid,
      isDirty: form.formState.isDirty,
      isSubmitting: form.formState.isSubmitting,
      submitCount: form.formState.submitCount,
      errors: form.formState.errors
    },
    actions: {
      setStep,
      resetForm,
      saveProgress,
      setUserType,
      updatePreferences
    },
    validation: {
      validateCurrentStep,
      getStepErrors,
      getFieldError
    },
    meta: {
      isOnline,
      hasSavedProgress,
      isFormPersisted
    }
  };
  
  return (
    <ValidatedOnboardingContext.Provider value={contextValue}>
      <FormProvider {...form}>
        {children}
      </FormProvider>
    </ValidatedOnboardingContext.Provider>
  );
}

// Hook to use the validated onboarding context
export function useValidatedOnboarding() {
  const context = useContext(ValidatedOnboardingContext);
  if (!context) {
    throw new Error("useValidatedOnboarding must be used within a ValidatedOnboardingProvider");
  }
  return context;
}