import React from "react";
import { ValidatedFieldGroup } from "./ValidatedFieldGroup";
import { ValidatedCheckboxGroup } from "./ValidatedCheckboxGroup";
import { useValidatedOnboarding } from "./ValidatedOnboardingProvider";
import { Button } from "@/components/ui/button";
import { 
  Utensils, 
  ShoppingBag, 
  Ticket, 
  Plane, 
  HeartPulse, 
  Scissors, 
  Wrench,
  MoreHorizontal
} from "lucide-react";

interface IndividualCategoriesStepProps {
  onNext: () => void;
}

export function IndividualCategoriesStep({ onNext }: IndividualCategoriesStepProps) {
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
  
  const categoryOptions = [
    {
      id: "food",
      label: "Food & Dining",
      description: "Restaurants, cafes, and food delivery deals",
      icon: <Utensils className="h-4 w-4" />
    },
    {
      id: "shopping",
      label: "Shopping",
      description: "Retail, e-commerce, and merchandise deals",
      icon: <ShoppingBag className="h-4 w-4" />
    },
    {
      id: "entertainment",
      label: "Entertainment",
      description: "Movies, events, and activities",
      icon: <Ticket className="h-4 w-4" />
    },
    {
      id: "travel",
      label: "Travel",
      description: "Hotels, flights, and vacation packages",
      icon: <Plane className="h-4 w-4" />
    },
    {
      id: "health",
      label: "Health & Wellness",
      description: "Fitness, supplements, and health services",
      icon: <HeartPulse className="h-4 w-4" />
    },
    {
      id: "beauty",
      label: "Beauty",
      description: "Salons, spas, and beauty products",
      icon: <Scissors className="h-4 w-4" />
    },
    {
      id: "services",
      label: "Services",
      description: "Professional and home services",
      icon: <Wrench className="h-4 w-4" />
    },
    {
      id: "other",
      label: "Other",
      description: "Deals that don't fit in other categories",
      icon: <MoreHorizontal className="h-4 w-4" />
    }
  ];

  return (
    <ValidatedFieldGroup
      id="individual-categories-step"
      title="What types of deals are you interested in?"
      description="Select the categories you'd like to receive deals for. You can change these preferences later."
      fieldNames={['preferences.categories']}
      cardFooter={
        <div className="w-full flex justify-end">
          <Button onClick={handleNext} size="lg">
            Next Step
          </Button>
        </div>
      }
    >
      <ValidatedCheckboxGroup
        name="preferences.categories"
        options={categoryOptions}
        columns={2}
        required
      />
    </ValidatedFieldGroup>
  );
}