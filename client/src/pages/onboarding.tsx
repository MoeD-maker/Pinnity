import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { useToast } from "@/hooks/use-toast";

export default function OnboardingPage() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute<{ userType: string, userId: string }>("/onboarding/:userType/:userId");
  const { toast } = useToast();
  const [userInfo, setUserInfo] = useState<{
    userType: "individual" | "business";
    userId: number;
  } | null>(null);

  useEffect(() => {
    // Validate params
    if (!params) {
      toast({
        title: "Navigation error",
        description: "Missing required parameters for onboarding",
        variant: "destructive",
      });
      setLocation("/");
      return;
    }

    const { userType, userId } = params;
    
    if (userType !== "individual" && userType !== "business") {
      toast({
        title: "Invalid user type",
        description: "User type must be either individual or business",
        variant: "destructive",
      });
      setLocation("/");
      return;
    }
    
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      toast({
        title: "Invalid user ID",
        description: "User ID must be a valid number",
        variant: "destructive",
      });
      setLocation("/");
      return;
    }
    
    setUserInfo({
      userType: userType as "individual" | "business",
      userId: parsedUserId,
    });
  }, [params, setLocation, toast]);

  const handleComplete = () => {
    toast({
      title: "Setup completed",
      description: "Your preferences have been saved successfully",
    });
    setLocation("/");
  };

  const handleSkip = () => {
    toast({
      description: "You can complete your setup later from your profile settings",
    });
    setLocation("/");
  };

  if (!userInfo) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-16 h-16 border-4 border-[#00796B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <OnboardingFlow
        userType={userInfo.userType}
        userId={userInfo.userId}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    </div>
  );
}