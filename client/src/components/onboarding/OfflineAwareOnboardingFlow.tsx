import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import OnboardingFlow, { OnboardingFlowProps } from "./OnboardingFlow";
import { OfflineOnboardingProvider, OfflineSessionRecoveryNotice } from "./OfflineOnboardingProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useCsrfProtection } from "@/hooks/useCsrfProtection";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * Enhanced OnboardingFlow with offline capabilities
 * This wraps the original OnboardingFlow with offline aware components
 * for persistence, synchronization, and recovery
 */
export default function OfflineAwareOnboardingFlow(props: OnboardingFlowProps) {
  const { userType, user } = props;
  const [location, setLocation] = useLocation();
  const { isAuthenticated, refreshToken } = useAuth();
  const { isOnline } = useOnlineStatus();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [restoringSession, setRestoringSession] = useState(false);
  
  // Individual onboarding preferences state
  const [individualPreferences, setIndividualPreferences] = useState({
    categories: [] as string[],
    locations: [] as string[],
    notificationPreferences: {
      email: true,
      push: true,
      sms: false
    },
    locationSharing: false,
    dealFrequency: "weekly"
  });
  
  // Business onboarding preferences state
  const [businessPreferences, setBusinessPreferences] = useState({
    businessType: "",
    dealTypes: [] as string[],
    customerPreferences: {
      targetAgeGroups: [] as string[],
      targetInterests: [] as string[]
    },
    marketingPreferences: {
      email: true,
      social: true,
      printMedia: false
    },
    dealFrequency: "weekly"
  });
  
  // Security state initialization with CSRF protection
  const {
    isLoading: isLoadingCsrfToken,
    isReady: hasCsrfToken,
    error: csrfError,
    refreshCsrfToken
  } = useCsrfProtection(true); // Auto-fetch token on mount
  
  // Form data for offline persistence
  const formData = {
    userType,
    step,
    preferences: userType === 'individual' ? individualPreferences : businessPreferences
  };
  
  // Check authentication and CSRF on component mount
  useEffect(() => {
    const verifySecuritySetup = async () => {
      setLoading(true);
      // Check authentication first
      if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to auth page');
        toast({
          title: "Authentication required",
          description: "Please log in to continue with onboarding",
          variant: "destructive"
        });
        setLocation("/auth");
        return;
      }
      
      // Perform a token refresh to ensure the token is valid for the duration of onboarding
      try {
        // Refresh auth token
        const refreshSuccessful = await refreshToken();
        
        if (!refreshSuccessful) {
          console.log('Token refresh failed, redirecting to auth page');
          toast({
            title: "Session expired",
            description: "Please log in again to continue with onboarding",
            variant: "destructive"
          });
          setLocation("/auth");
          return;
        }
        
        // Now refresh CSRF token
        console.log('Fetching CSRF token for secure form submission...');
        const csrfSuccessful = await refreshCsrfToken();
        
        if (!csrfSuccessful) {
          console.log('CSRF token fetch failed, retrying...');
          // This is less critical, so we'll just warn but continue
          toast({
            title: "Security warning",
            description: "Form protection setup failed. Some actions may be limited.",
            variant: "destructive"
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Security setup error:', error);
        toast({
          title: "Security setup error",
          description: "There was a problem setting up secure communications. Please try again.",
          variant: "destructive"
        });
        setLocation("/auth");
      }
    };
    
    verifySecuritySetup();
  }, [isAuthenticated, refreshToken, refreshCsrfToken, toast, setLocation]);
  
  // Handle restoration of saved progress
  const handleRestoreSession = (data: any) => {
    setRestoringSession(true);
    console.log('Restoring session from saved data:', data);
    
    if (data.step) {
      setStep(data.step);
    }
    
    if (data.preferences) {
      if (userType === 'individual') {
        setIndividualPreferences(data.preferences);
      } else {
        setBusinessPreferences(data.preferences);
      }
    }
    
    toast({
      title: "Progress restored",
      description: "Your previous data has been loaded successfully."
    });
    
    setRestoringSession(false);
  };
  
  // Handle discarding of saved progress
  const handleDiscardSession = () => {
    setRestoringSession(false);
    toast({
      title: "Session discarded",
      description: "Starting a fresh onboarding session"
    });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <h2 className="mt-4 text-xl font-medium text-gray-700">Setting up your onboarding</h2>
          <p className="mt-2 text-gray-500">
            {!isOnline ? "Working in offline mode..." : "Preparing your personalized experience..."}
          </p>
        </div>
      </div>
    );
  }
  
  // Return the wrapped OnboardingFlow component with offline capabilities
  return (
    <OfflineOnboardingProvider
      userType={userType}
      user={user}
      formData={formData}
      onRestore={handleRestoreSession}
      syncEndpoint={`/api/onboarding/${userType}/sync`}
      autoSave={true}
      autoSaveInterval={30000} // 30 seconds
    >
      <div className="relative">
        {/* Pass the original props plus any additional state needed for the offline-aware version */}
        <OnboardingFlow
          userType={userType}
          user={user}
          initialStep={step}
          onStepChange={setStep}
          individualPreferences={individualPreferences}
          setIndividualPreferences={setIndividualPreferences}
          businessPreferences={businessPreferences}
          setBusinessPreferences={setBusinessPreferences}
          restoringSession={restoringSession}
        />
      </div>
    </OfflineOnboardingProvider>
  );
}