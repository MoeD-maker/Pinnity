import { useState } from "react";
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
import { Loader2, ChevronRight, ChevronLeft, Check } from "lucide-react";

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
}

export default function OnboardingFlow({ userType, user }: OnboardingFlowProps) {
  const [location, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // Individual user preferences
  const [individualPreferences, setIndividualPreferences] = useState({
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
  });
  
  // Business user preferences
  const [businessPreferences, setBusinessPreferences] = useState({
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
  });

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
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };
  
  // Handle previous step
  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  // Handle skipping onboarding
  const handleSkip = () => {
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
  
  // Handle completing onboarding
  const handleComplete = async () => {
    setLoading(true);
    
    try {
      // Get the token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Save preferences based on user type
      const preferencesData = userType === 'individual' 
        ? individualPreferences 
        : businessPreferences;
      
      // Save preferences to the server
      const response = await fetch(`/api/user/${user.id}/preferences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userType,
          preferences: preferencesData
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }
      
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
  
  return (
    <Card className="shadow-lg overflow-hidden">
      {/* Progress stepper */}
      <div className="p-6 bg-white border-b">
        <RegistrationStepper steps={steps} currentStep={step} />
      </div>
      
      {/* Main content */}
      <div className="p-6">
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
  );
}