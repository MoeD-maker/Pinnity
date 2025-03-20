import React from "react";
import { ValidatedFieldGroup } from "./ValidatedFieldGroup";
import { BusinessHoursField } from "./BusinessHoursField";
import { useValidatedOnboarding } from "./ValidatedOnboardingProvider";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

interface BusinessHoursStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function BusinessHoursStep({ onNext, onBack }: BusinessHoursStepProps) {
  const { validation, actions } = useValidatedOnboarding();
  
  const handleNext = async () => {
    // Validate current step before proceeding
    const isValid = await validation.validateCurrentStep();
    if (isValid) {
      // Save progress before moving to next step
      await actions.saveProgress();
      onNext();
    }
  };
  
  return (
    <ValidatedFieldGroup
      id="business-hours-step"
      title="When is your business open?"
      description="Set your regular business hours. This helps customers know when they can redeem deals."
      fieldNames={['preferences.businessHours']}
      cardFooter={
        <div className="w-full flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleNext}>
            Next Step
          </Button>
        </div>
      }
    >
      <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200">
        <InfoIcon className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          You must specify hours for at least one day. For days you're closed, toggle the "Closed" switch.
        </AlertDescription>
      </Alert>
      
      <BusinessHoursField
        name="preferences.businessHours"
        required
      />
    </ValidatedFieldGroup>
  );
}