import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ValidatedOnboardingProvider } from "./ValidatedOnboardingProvider";
import { IndividualCategoriesStep } from "./IndividualCategoriesStep";
import { BusinessHoursStep } from "./BusinessHoursStep";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, WifiOff, Save, CheckCircle } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { OnboardingFormData } from "@/schemas/onboardingValidation";

interface ValidatedOnboardingFlowProps {
  initialStep?: number;
  initialUserType?: "individual" | "business";
  onComplete: (data: OnboardingFormData) => void;
}

export function ValidatedOnboardingFlow({
  initialStep = 1,
  initialUserType = "individual",
  onComplete
}: ValidatedOnboardingFlowProps) {
  const isOnline = useOnlineStatus();
  const [userType, setUserType] = useState<"individual" | "business">(initialUserType);
  const [step, setStep] = useState(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  // Maximum number of steps for each user type
  const maxSteps = {
    individual: 3,
    business: 3
  };

  // Handle form submission when all steps are complete
  const handleCompleteOnboarding = async (data: OnboardingFormData) => {
    if (!isOnline) {
      // If offline, inform the user that data will be submitted when online
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Process the form submission
      await onComplete(data);
      
      // Show success message
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 3000);
    } catch (error) {
      console.error("Error submitting onboarding data:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle changing the user type
  const handleUserTypeChange = (newType: "individual" | "business") => {
    setUserType(newType);
    // Reset to first step when changing user type
    setStep(1);
  };

  // Navigate to the next step
  const handleNextStep = () => {
    if (step < maxSteps[userType]) {
      setStep(step + 1);
    } else {
      // Final step submission
      const onboardingForm = document.getElementById("onboarding-form") as HTMLFormElement;
      if (onboardingForm) {
        onboardingForm.requestSubmit();
      }
    }
  };

  // Navigate to the previous step
  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Generate step labels for the breadcrumb
  const generateStepLabels = () => {
    if (userType === "individual") {
      return [
        { step: 1, label: "Categories" },
        { step: 2, label: "Location" },
        { step: 3, label: "Notifications" }
      ];
    } else {
      return [
        { step: 1, label: "Business Hours" },
        { step: 2, label: "Offerings" },
        { step: 3, label: "Demographics" }
      ];
    }
  };

  const stepLabels = generateStepLabels();

  // Animation variants
  const variants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  // Get the current step component based on user type and step
  const getCurrentStepComponent = () => {
    if (userType === "individual") {
      switch (step) {
        case 1:
          return <IndividualCategoriesStep onNext={handleNextStep} />;
        case 2:
          return (
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Location Preferences (Placeholder)</CardTitle>
                <CardDescription>This is a placeholder for the location preferences step.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-between">
                <Button variant="outline" onClick={handlePreviousStep}>Back</Button>
                <Button onClick={handleNextStep}>Next Step</Button>
              </CardContent>
            </Card>
          );
        case 3:
          return (
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Notification Preferences (Placeholder)</CardTitle>
                <CardDescription>This is a placeholder for the notification preferences step.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-between">
                <Button variant="outline" onClick={handlePreviousStep}>Back</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting
                    </>
                  ) : (
                    "Complete Onboarding"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        default:
          return null;
      }
    } else {
      // Business user steps
      switch (step) {
        case 1:
          return <BusinessHoursStep onNext={handleNextStep} onBack={handlePreviousStep} />;
        case 2:
          return (
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Business Offerings (Placeholder)</CardTitle>
                <CardDescription>This is a placeholder for the business offerings step.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-between">
                <Button variant="outline" onClick={handlePreviousStep}>Back</Button>
                <Button onClick={handleNextStep}>Next Step</Button>
              </CardContent>
            </Card>
          );
        case 3:
          return (
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Target Demographics (Placeholder)</CardTitle>
                <CardDescription>This is a placeholder for the target demographics step.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-between">
                <Button variant="outline" onClick={handlePreviousStep}>Back</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting
                    </>
                  ) : (
                    "Complete Onboarding"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        default:
          return null;
      }
    }
  };

  return (
    <ValidatedOnboardingProvider
      initialStep={step}
      initialUserType={userType}
      onSubmitSuccess={handleCompleteOnboarding}
    >
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <form id="onboarding-form" className="space-y-8">
          {/* Offline indicator */}
          {!isOnline && (
            <Alert variant="destructive">
              <WifiOff className="h-4 w-4" />
              <AlertTitle>You're currently offline</AlertTitle>
              <AlertDescription>
                Your progress will be saved locally and will sync when you're back online.
              </AlertDescription>
            </Alert>
          )}

          {/* Success message */}
          {showSavedMessage && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Progress saved</AlertTitle>
              <AlertDescription className="text-green-700">
                Your onboarding information has been saved successfully.
              </AlertDescription>
            </Alert>
          )}

          {/* User type selection */}
          <Tabs
            defaultValue={userType}
            value={userType}
            onValueChange={(value) => handleUserTypeChange(value as "individual" | "business")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual">Individual User</TabsTrigger>
              <TabsTrigger value="business">Business User</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Steps breadcrumb */}
          <div className="flex justify-between items-center w-full">
            {stepLabels.map((stepInfo) => (
              <div
                key={`step-${stepInfo.step}`}
                className="flex flex-col items-center space-y-1"
              >
                <Badge
                  variant={step === stepInfo.step ? "default" : step > stepInfo.step ? "outline" : "secondary"}
                  className={step >= stepInfo.step ? "opacity-100" : "opacity-50"}
                >
                  Step {stepInfo.step}
                </Badge>
                <span
                  className={`text-xs ${
                    step === stepInfo.step
                      ? "font-bold"
                      : step > stepInfo.step
                      ? "font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {stepInfo.label}
                </span>
              </div>
            ))}
          </div>

          {/* Step content with animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${userType}-step-${step}`}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={variants}
              transition={{ duration: 0.3 }}
            >
              {getCurrentStepComponent()}
            </motion.div>
          </AnimatePresence>

          {/* Save progress button */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const saveProgressButton = document.getElementById("save-progress");
                if (saveProgressButton) {
                  saveProgressButton.click();
                }
              }}
              className="w-full max-w-xs"
              disabled={isSubmitting}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Progress
            </Button>
            <button id="save-progress" type="button" className="hidden" />
          </div>
        </form>
      </div>
    </ValidatedOnboardingProvider>
  );
}