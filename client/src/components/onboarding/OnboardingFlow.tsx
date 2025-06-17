import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import RegistrationStepper from "./RegistrationStepper";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronRight, ChevronLeft, Check, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiPost } from "@/lib/api";
import { useCsrfProtection } from "@/hooks/useCsrfProtection";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { SessionRecoveryNotice } from "./SessionRecoveryNotice";
import { SaveProgressButton } from "./SaveProgressButton";
import { SaveAndContinueModal } from "./SaveAndContinueModal";

// Define the user interface
interface UserData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  [key: string]: any;
}

export interface OnboardingFlowProps {
  userType: 'individual' | 'business';
  user: UserData;
  // Added props for offline-aware version
  initialStep?: number;
  onStepChange?: (step: number) => void;
  individualPreferences?: any;
  setIndividualPreferences?: (prefs: any) => void;
  businessPreferences?: any;
  setBusinessPreferences?: (prefs: any) => void;
  restoringSession?: boolean;
}

export default function OnboardingFlow({ 
  userType, 
  user, 
  initialStep, 
  onStepChange,
  individualPreferences: externalIndividualPreferences,
  setIndividualPreferences: externalSetIndividualPreferences,
  businessPreferences: externalBusinessPreferences,
  setBusinessPreferences: externalSetBusinessPreferences,
  restoringSession: externalRestoringSession
}: OnboardingFlowProps) {
  const [location, setLocation] = useLocation();
  const [step, setStep] = useState(initialStep || 1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [restoringSession, setRestoringSession] = useState(Boolean(externalRestoringSession));
  const [showInactivityModal, setShowInactivityModal] = useState(false);

  // Initialize default preferences
  const defaultIndividualPreferences = {
    // Deal categories interests
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
    // Location preferences
    location: {
      enableLocationServices: false,
      radius: 10, // Miles
      savedLocations: []
    },
    // Notification preferences
    notifications: {
      pushEnabled: true,
      emailEnabled: true,
      dealAlerts: true,
      weeklyDigest: false,
      favorites: true,
      expiringDeals: true
    }
  };

// Derive TS types from our defaults
type IndividualPreferencesType = typeof defaultIndividualPreferences;
  
  // Initialize the state with the default or externally provided values
  const [internalIndividualPreferences, setInternalIndividualPreferences]
    = useState<IndividualPreferencesType>(externalIndividualPreferences || defaultIndividualPreferences);
  
  // Default business preferences
  const defaultBusinessPreferences = {
    // Business hours
    businessHours: {
      monday: { open: "09:00", close: "17:00", closed: false },
      tuesday: { open: "09:00", close: "17:00", closed: false },
      wednesday: { open: "09:00", close: "17:00", closed: false },
      thursday: { open: "09:00", close: "17:00", closed: false },
      friday: { open: "09:00", close: "17:00", closed: false },
      saturday: { open: "10:00", close: "15:00", closed: false },
      sunday: { open: "10:00", close: "15:00", closed: true }
    },
    // Special offerings
    offerings: {
      promotions: false,
      eventsHosting: false,
      loyaltyProgram: false,
      specialDiscounts: false,
      holidaySpecials: false,
      flashSales: false
    },
    // Target demographics
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

type BusinessPreferencesType = typeof defaultBusinessPreferences;
  
  // Initialize the business preferences state with default or externally provided values
  const [internalBusinessPreferences, setInternalBusinessPreferences]
    = useState<BusinessPreferencesType>(externalBusinessPreferences || defaultBusinessPreferences);

  // Create aliases to use throughout the component
  const individualPreferences = externalIndividualPreferences || internalIndividualPreferences;
  const setIndividualPreferences = externalSetIndividualPreferences || setInternalIndividualPreferences;
  const businessPreferences = externalBusinessPreferences || internalBusinessPreferences;
  const setBusinessPreferences = externalSetBusinessPreferences || setInternalBusinessPreferences;

  // Define steps for each user type
  const individualSteps = [
    "Interests",
    "Location",
    "Notifications",
    "Complete"
  ];
  
  const businessSteps = [
    "Business Hours",
    "Offerings",
    "Demographics",
    "Complete"
  ];
  
  const steps = userType === 'individual' ? individualSteps : businessSteps;
  
  // Handle category toggle for individual preferences
  const handleCategoryToggle = (category: string) => {
    resetSessionTimeout(); // Reset the inactivity timer
    
    setIndividualPreferences({
      ...individualPreferences,
      categories: {
        ...individualPreferences.categories,
        [category]: !individualPreferences.categories[category as keyof typeof individualPreferences.categories]
      }
    });
  };
  
  // Handle notification toggle for individual preferences
  const handleNotificationToggle = (key: string) => {
    resetSessionTimeout(); // Reset the inactivity timer
    
    setIndividualPreferences({
      ...individualPreferences,
      notifications: {
        ...individualPreferences.notifications,
        [key]: !individualPreferences.notifications[key as keyof typeof individualPreferences.notifications]
      }
    });
  };
  
  // Handle location preference changes for individual preferences
  const handleLocationChange = (key: string, value: any) => {
    resetSessionTimeout(); // Reset the inactivity timer
    
    setIndividualPreferences({
      ...individualPreferences,
      location: {
        ...individualPreferences.location,
        [key]: value
      }
    });
  };
  
  // Handle offerings toggle for business preferences
  const handleOfferingToggle = (offering: string) => {
    resetSessionTimeout(); // Reset the inactivity timer
    
    setBusinessPreferences({
      ...businessPreferences,
      offerings: {
        ...businessPreferences.offerings,
        [offering]: !businessPreferences.offerings[offering as keyof typeof businessPreferences.offerings]
      }
    });
  };
  
  // Handle demographic toggle for business preferences
  const handleDemographicToggle = (group: string, category: string = 'ageGroups') => {
    resetSessionTimeout(); // Reset the inactivity timer
    
    if (category === 'ageGroups') {
      setBusinessPreferences({
        ...businessPreferences,
        demographics: {
          ...businessPreferences.demographics,
          ageGroups: {
            ...businessPreferences.demographics.ageGroups,
            [group]: !businessPreferences.demographics.ageGroups[group as keyof typeof businessPreferences.demographics.ageGroups]
          }
        }
      });
    } else {
      setBusinessPreferences({
        ...businessPreferences,
        demographics: {
          ...businessPreferences.demographics,
          [group]: !businessPreferences.demographics[group as keyof typeof businessPreferences.demographics]
        }
      });
    }
  };
  
  // Handle business hours change
  const handleBusinessHoursChange = (
    day: string, 
    field: 'open' | 'close' | 'closed', 
    value: string | boolean
  ) => {
    resetSessionTimeout(); // Reset the inactivity timer
    
    setBusinessPreferences({
      ...businessPreferences,
      businessHours: {
        ...businessPreferences.businessHours,
        [day]: {
          ...businessPreferences.businessHours[day as keyof typeof businessPreferences.businessHours],
          [field]: value
        }
      }
    });
  };
  
  // Handle next step
  const handleNext = () => {
    resetSessionTimeout(); // Reset the inactivity timer
    
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };
  
  // Handle previous step
  const handlePrevious = () => {
    resetSessionTimeout(); // Reset the inactivity timer
    
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  // Handle skipping onboarding
  const handleSkip = () => {
    resetSessionTimeout(); // Reset the inactivity timer
    
    toast({
      title: "Onboarding skipped",
      description: "You can always update your preferences in settings",
    });
    
    // Redirect to appropriate dashboard based on user type
    if (userType === 'individual') {
      setLocation("/");
    } else {
      setLocation("/vendor");
    }
  };
  
  // Authentication state (using HTTP-only cookies)
  const { user: authUser, refreshToken, isAuthenticated } = useAuth();
  
  // CSRF protection
  const { 
    isLoading: csrfLoading, 
    error: csrfError, 
    isReady: csrfReady, 
    refreshCsrfToken, 
    handleCsrfError,
    fetchWithProtection
  } = useCsrfProtection(true); // Auto-fetch token on mount
  
  // Form persistence
  const formData = {
    userType,
    step,
    preferences: userType === 'individual' ? individualPreferences : businessPreferences
  };
  
  const { 
    saveFormState, 
    restoreFormState, 
    clearFormState, 
    checkForSavedData,
    metadata: persistenceMetadata
  } = useFormPersistence(formData, {
    formId: `onboarding-${userType}`,
    autoSave: true,
    autoSaveInterval: 30 * 1000, // 30 seconds
    onRestoreSuccess: (data) => {
      console.log('Successfully restored onboarding data');
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
      
      setRestoringSession(false);
    },
    onSaveSuccess: () => {
      console.log('Successfully saved onboarding progress');
    }
  });
  
  // Session timeout handling reference
  const sessionTimeoutRef = useRef<number | null>(null);
  
  // Flag to track if security setup is complete (both auth and CSRF)
  const [securitySetupComplete, setSecuritySetupComplete] = useState(false);
  
  // Check for existing form data and restore session
  useEffect(() => {
    const checkForExistingData = async () => {
      const hasData = await checkForSavedData();
      
      if (hasData && persistenceMetadata.lastSaved) {
        console.log('Found saved onboarding data, setting restore flag');
        setRestoringSession(true);
      }
    };
    
    if (isAuthenticated) {
      checkForExistingData();
    }
  }, [checkForSavedData, persistenceMetadata.lastSaved, isAuthenticated]);
  
  // Check authentication and CSRF on component mount
  useEffect(() => {
    const verifySecuritySetup = async () => {
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
          console.log('CSRF token fetch failed');
          toast({
            title: "Security setup failed",
            description: "Unable to secure the connection. Please refresh the page and try again.",
            variant: "destructive"
          });
          return;
        }
        
        // Both authentication and CSRF protection are set up
        console.log('Security setup complete: Authentication and CSRF protection ready');
        setSecuritySetupComplete(true);
        
        // Set up session timeout handler to prompt re-authentication after inactivity
        setupSessionTimeoutHandler();
      } catch (error) {
        console.error('Security setup error:', error);
        toast({
          title: "Security setup error",
          description: "Please refresh the page and try again",
          variant: "destructive"
        });
        
        // Determine if it's an auth error or CSRF error
        if (error instanceof Error) {
          if (error.message.includes('CSRF') || error.message.includes('security')) {
            // Handle as CSRF error
            handleCsrfError(error);
          } else {
            // Handle as auth error
            setLocation("/auth");
          }
        }
      }
    };
    
    verifySecuritySetup();
    
    // Clean up session timeout handler on unmount
    return () => {
      if (sessionTimeoutRef.current) {
        window.clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, [isAuthenticated, refreshToken, refreshCsrfToken, handleCsrfError, setLocation, toast]);
  
  // Set up session timeout handler for inactivity
  const setupSessionTimeoutHandler = () => {
    // Clear any existing timeout
    if (sessionTimeoutRef.current) {
      window.clearTimeout(sessionTimeoutRef.current);
    }
    
    // Set new timeout for 25 minutes (slightly shorter than the token lifetime)
    sessionTimeoutRef.current = window.setTimeout(async () => {
      console.log('Session timeout due to inactivity');
      
      // Try to refresh the token silently
      const refreshSuccessful = await refreshToken();
      
      if (!refreshSuccessful) {
        toast({
          title: "Session expired",
          description: "Your session has expired due to inactivity. Please log in again to continue.",
          variant: "destructive"
        });
        setLocation("/auth");
      } else {
        // If refresh successful, set up a new timeout
        setupSessionTimeoutHandler();
      }
    }, 25 * 60 * 1000); // 25 minutes
  };
  
  // Reset the session timeout on user interaction
  const resetSessionTimeout = () => {
    setupSessionTimeoutHandler();
  };
  
  // Handle manually saving progress
  const handleSaveProgress = async () => {
    resetSessionTimeout(); // Reset the inactivity timer
    const saved = await saveFormState();
    
    if (saved) {
      toast({
        title: "Progress saved",
        description: "You can continue later where you left off",
      });
    } else {
      toast({
        title: "Could not save progress",
        description: "There was an issue saving your progress",
        variant: "destructive"
      });
    }
    
    return saved;
  };
  
  // Handle restoring session from saved data
  const handleRestoreSession = async () => {
    resetSessionTimeout(); // Reset the inactivity timer
    setRestoringSession(true);
    
    try {
      const data = await restoreFormState();
      
      if (!data) {
        toast({
          title: "Unable to restore session",
          description: "We couldn't find your saved progress",
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error restoring session:', error);
      toast({
        title: "Error restoring session",
        description: "There was a problem restoring your progress",
        variant: "destructive"
      });
      return false;
    }
  };
  
  // Handle discarding saved session
  const handleDiscardSession = async () => {
    resetSessionTimeout(); // Reset the inactivity timer
    await clearFormState();
    setRestoringSession(false);
    
    toast({
      title: "Progress discarded",
      description: "Starting a fresh session",
    });
    
    // Reset to first step
    setStep(1);
    
    // Reset preferences to defaults
    if (userType === 'individual') {
      setIndividualPreferences(defaultIndividualPreferences);
    } else {
      setBusinessPreferences(defaultBusinessPreferences);
    }
    
    return true;
  };
  
  // Handle completing onboarding
  const handleComplete = async () => {
    setLoading(true);
    resetSessionTimeout(); // Reset the inactivity timer
    
    try {
      // Perform security checks before saving preferences
      if (!securitySetupComplete) {
        console.log('Security setup not complete, refreshing tokens...');
        
        // Try to refresh auth token
        const refreshSuccessful = await refreshToken();
        
        if (!refreshSuccessful) {
          toast({
            title: "Session expired",
            description: "Please log in again to complete your setup",
            variant: "destructive"
          });
          setLocation("/auth");
          return;
        }
        
        // Try to refresh CSRF token
        const csrfSuccessful = await refreshCsrfToken();
        
        if (!csrfSuccessful) {
          toast({
            title: "Security validation failed",
            description: "Unable to secure the connection. Please refresh the page and try again.",
            variant: "destructive"
          });
          return;
        }
      }
      
      // Save preferences based on user type
      const preferencesData = userType === 'individual' 
        ? individualPreferences 
        : businessPreferences;
      
      // Save preferences using the CSRF-protected fetch from our hook
      await fetchWithProtection(`/api/v1/user/${user.id}/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userType,
          preferences: preferencesData
        })
      });
      
      toast({
        title: "Setup complete!",
        description: "Your preferences have been saved successfully",
      });
      
      // Redirect to appropriate dashboard based on user type
      if (userType === 'individual') {
        setLocation("/");
      } else {
        setLocation("/vendor");
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      
      // Check if error is due to authentication
      if (error instanceof Error && (error as any).status === 401) {
        toast({
          title: "Authentication error",
          description: "Your session has expired. Please log in again to complete setup.",
          variant: "destructive"
        });
        setLocation("/auth");
      } else if (error instanceof Error && 
                (error.message.includes('CSRF') || 
                 error.message.includes('security') || 
                 (error as any).status === 403)) {
        // Handle CSRF validation errors
        handleCsrfError(error);
      } else {
        toast({
          title: "Error saving preferences",
          description: "We'll use default settings for now. You can update later in settings.",
          variant: "destructive"
        });
        
        // Redirect anyway
        if (userType === 'individual') {
          setLocation("/");
        } else {
          setLocation("/vendor");
        }
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Render individual interests step
  const renderIndividualInterests = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">What types of deals interest you?</h2>
      <p className="text-gray-600">
        Select categories to get personalized deal recommendations
      </p>
      
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(individualPreferences.categories).map(([category, isSelected]) => (
          <div 
            key={category}
            className={`flex items-center space-x-2 rounded-md border p-3 cursor-pointer transition-colors ${
              isSelected 
                ? 'border-[#00796B] bg-[#E0F2F1] text-[#00796B]' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleCategoryToggle(category)}
          >
            <Checkbox 
              checked={isSelected}
              onCheckedChange={() => handleCategoryToggle(category)}
              className="data-[state=checked]:bg-[#00796B] data-[state=checked]:border-[#00796B]"
            />
            <span className="capitalize">{category}</span>
          </div>
        ))}
      </div>
    </div>
  );
  
  // Render individual location preferences step
  const renderIndividualLocation = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Location Preferences</h2>
      <p className="text-gray-600">
        Set your location preferences to find deals near you
      </p>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="location-services">Enable location services</Label>
            <p className="text-sm text-gray-500">Allow Pinnity to access your location</p>
          </div>
          <Switch
            id="location-services"
            checked={individualPreferences.location.enableLocationServices}
            onCheckedChange={(checked) => handleLocationChange('enableLocationServices', checked)}
          />
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label htmlFor="distance">Search radius: {individualPreferences.location.radius} miles</Label>
          </div>
          <Slider
            id="distance"
            defaultValue={[individualPreferences.location.radius]}
            max={50}
            min={1}
            step={1}
            onValueChange={(value) => handleLocationChange('radius', value[0])}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>1 mile</span>
            <span>25 miles</span>
            <span>50 miles</span>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Render individual notification preferences step
  const renderIndividualNotifications = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Notification Preferences</h2>
      <p className="text-gray-600">
        Choose how you'd like to be notified about new deals and updates
      </p>
      
      <div className="space-y-4">
        {[
          { id: 'pushEnabled', label: 'Push notifications', description: 'Receive notifications on your device' },
          { id: 'emailEnabled', label: 'Email notifications', description: 'Receive updates via email' },
          { id: 'dealAlerts', label: 'New deal alerts', description: 'Get notified about new deals in your area' },
          { id: 'weeklyDigest', label: 'Weekly digest', description: 'Receive a weekly summary of the best deals' },
          { id: 'favorites', label: 'Favorites updates', description: 'Updates about your saved deals' },
          { id: 'expiringDeals', label: 'Expiring deals', description: 'Be notified before your saved deals expire' }
        ].map(item => (
          <div key={item.id} className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={item.id}>{item.label}</Label>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <Switch
              id={item.id}
              checked={individualPreferences.notifications[item.id as keyof typeof individualPreferences.notifications]}
              onCheckedChange={() => handleNotificationToggle(item.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
  
  // Render business hours step
  const renderBusinessHours = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Business Hours</h2>
      <p className="text-gray-600">
        Set your regular business hours to help customers find you
      </p>
      
      <div className="space-y-4">
        {Object.entries(businessPreferences.businessHours).map(([day, hours]) => (
          <div key={day} className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:gap-4 items-center">
            <div className="font-medium capitalize sm:col-span-1">{day}</div>
            
            <div className="flex items-center gap-2 sm:col-span-3">
              <Switch
                id={`${day}-closed`}
                checked={!hours.closed}
                onCheckedChange={(checked) => handleBusinessHoursChange(day, 'closed', !checked)}
              />
              
              <div className={`flex flex-1 items-center gap-3 ${hours.closed ? 'opacity-50' : ''}`}>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`${day}-open`}>Open</Label>
                    <select
                      id={`${day}-open`}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00796B] focus:ring-[#00796B] sm:text-sm"
                      value={hours.open}
                      onChange={(e) => handleBusinessHoursChange(day, 'open', e.target.value)}
                      disabled={hours.closed}
                    >
                      {Array.from({ length: 24 }).map((_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <option key={`${hour}:00`} value={`${hour}:00`}>
                            {`${hour}:00`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor={`${day}-close`}>Close</Label>
                    <select
                      id={`${day}-close`}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00796B] focus:ring-[#00796B] sm:text-sm"
                      value={hours.close}
                      onChange={(e) => handleBusinessHoursChange(day, 'close', e.target.value)}
                      disabled={hours.closed}
                    >
                      {Array.from({ length: 24 }).map((_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <option key={`${hour}:00`} value={`${hour}:00`}>
                            {`${hour}:00`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                
                {hours.closed && (
                  <span className="text-sm text-gray-500 whitespace-nowrap">Closed</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  
  // Render business offerings step
  const renderBusinessOfferings = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Special Offerings</h2>
      <p className="text-gray-600">
        Tell us about any special programs or offerings you provide
      </p>
      
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Object.entries(businessPreferences.offerings).map(([offering, isSelected]) => (
          <div 
            key={offering}
            className={`flex items-center space-x-2 rounded-md border p-3 cursor-pointer transition-colors ${
              isSelected 
                ? 'border-[#00796B] bg-[#E0F2F1] text-[#00796B]' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleOfferingToggle(offering)}
          >
            <Checkbox 
              checked={isSelected}
              onCheckedChange={() => handleOfferingToggle(offering)}
              className="data-[state=checked]:bg-[#00796B] data-[state=checked]:border-[#00796B]"
            />
            <Label className="capitalize">{offering.replace(/([A-Z])/g, ' $1').trim()}</Label>
          </div>
        ))}
      </div>
    </div>
  );
  
  // Render business demographics step
  const renderBusinessDemographics = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Target Demographics</h2>
      <p className="text-gray-600">
        Help us understand your target customer base
      </p>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-medium mb-3">Age Groups</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(businessPreferences.demographics.ageGroups).map(([group, isSelected]) => {
              // Format the age group for display
              const displayName = {
                under18: 'Under 18',
                age18to24: '18-24',
                age25to34: '25-34',
                age35to44: '35-44',
                age45to54: '45-54',
                age55plus: '55+'
              }[group] || group;
              
              return (
                <div 
                  key={group}
                  className={`flex items-center space-x-2 rounded-md border p-3 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-[#00796B] bg-[#E0F2F1] text-[#00796B]' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleDemographicToggle(group)}
                >
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => handleDemographicToggle(group)}
                    className="data-[state=checked]:bg-[#00796B] data-[state=checked]:border-[#00796B]"
                  />
                  <span>{displayName}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="interest-targeting">Target by interest</Label>
              <p className="text-sm text-gray-500">Show deals to customers based on their interests</p>
            </div>
            <Switch
              id="interest-targeting"
              checked={businessPreferences.demographics.targetByInterest}
              onCheckedChange={() => handleDemographicToggle('targetByInterest', '')}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="local-focus">Local focus</Label>
              <p className="text-sm text-gray-500">Primarily target customers in your local area</p>
            </div>
            <Switch
              id="local-focus"
              checked={businessPreferences.demographics.localFocus}
              onCheckedChange={() => handleDemographicToggle('localFocus', '')}
            />
          </div>
        </div>
      </div>
    </div>
  );
  
  // Render completion step
  const renderCompletion = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-[#E0F2F1] rounded-full flex items-center justify-center mx-auto">
        <Check className="h-8 w-8 text-[#00796B]" />
      </div>
      
      <div>
        <h2 className="text-xl font-semibold">You're all set!</h2>
        <p className="text-gray-600 mt-2">
          Your {userType === 'individual' ? 'preferences' : 'business information'} has been saved.
          You can always update these settings later.
        </p>
      </div>
      
      <Button
        className="bg-[#00796B] hover:bg-[#00695C] text-white px-6"
        onClick={handleComplete}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Finishing setup...
          </>
        ) : (
          'Continue to dashboard'
        )}
      </Button>
    </div>
  );
  
  // Render current step content based on user type and current step
  const renderStepContent = () => {
    if (userType === 'individual') {
      switch (step) {
        case 1:
          return renderIndividualInterests();
        case 2:
          return renderIndividualLocation();
        case 3:
          return renderIndividualNotifications();
        case 4:
          return renderCompletion();
        default:
          return null;
      }
    } else {
      switch (step) {
        case 1:
          return renderBusinessHours();
        case 2:
          return renderBusinessOfferings();
        case 3:
          return renderBusinessDemographics();
        case 4:
          return renderCompletion();
        default:
          return null;
      }
    }
  };
  
  // Function to render the security status indicator
  const renderSecurityStatus = () => {
    // If still loading the security setup
    if (csrfLoading) {
      return (
        <div className="flex items-center gap-2 p-2 bg-gray-100 text-gray-700 text-sm rounded-md mb-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Setting up secure connection...</span>
        </div>
      );
    }
    
    // If there's a CSRF error
    if (csrfError) {
      return (
        <div className="flex items-center gap-2 p-2 bg-red-100 text-red-700 text-sm rounded-md mb-4">
          <ShieldAlert className="h-4 w-4" />
          <span>Security error: {csrfError}</span>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto text-xs"
            onClick={() => refreshCsrfToken()}
          >
            Retry
          </Button>
        </div>
      );
    }
    
    // If security setup is complete
    if (securitySetupComplete && csrfReady) {
      return (
        <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 text-sm rounded-md mb-4">
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-9.618 5.04L2 9.5l.382 5.7a8.001 8.001 0 007.976 7.8 11.981 11.981 0 014.284 0A8.001 8.001 0 0021.618 15.2L22 9.5l-.382-1.516z" />
            </svg>
            <span>Secure connection established</span>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="relative">
      {/* Session Recovery Notice - shown above the card when saved data exists */}
      {persistenceMetadata.hasPersistedData && persistenceMetadata.lastSaved && !restoringSession && (
        <SessionRecoveryNotice
          hasPersistedData={persistenceMetadata.hasPersistedData}
          lastSaved={new Date(persistenceMetadata.lastSaved)}
          onRestore={handleRestoreSession}
          onDiscard={handleDiscardSession}
        />
      )}
      
      <Card className="shadow-lg overflow-hidden">
        {/* Header with progress stepper and save button */}
        <div className="p-6 bg-white border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <RegistrationStepper steps={steps} currentStep={step} />
          
          {/* Save Progress Button */}
          <div className="flex items-center justify-end gap-2">
            <SaveProgressButton
              onClick={handleSaveProgress}
              metadata={persistenceMetadata}
              showLabel={true}
            />
            <SaveAndContinueModal 
              onSave={handleSaveProgress}
              metadata={persistenceMetadata}
              userEmail={user.email}
            />
          </div>
        </div>
        
        {/* Main content */}
        <div className="p-6">
        {/* Security status indicator */}
        {renderSecurityStatus()}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Actions */}
      <div className="p-6 bg-gray-50 border-t flex justify-between">
        {step === steps.length ? (
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={loading}
          >
            Maybe later
          </Button>
        ) : (
          <div className="flex gap-2">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={loading}
                className="flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={handleSkip}
              >
                Skip for now
              </Button>
            )}
          </div>
        )}
        
        {step < steps.length && (
          <Button
            onClick={handleNext}
            disabled={loading}
            className="bg-[#00796B] hover:bg-[#00695C] text-white px-6"
          >
            Continue
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </Card>
  </div>
  );
}