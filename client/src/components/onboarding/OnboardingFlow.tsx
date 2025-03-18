import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { apiPost } from "@/lib/api";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// Define schemas for different step forms
const individualPreferencesSchema = z.object({
  preferredCategories: z.array(z.string()).min(1, "Please select at least one category"),
  notificationPreferences: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean()
  }),
  locationTracking: z.boolean(),
  radius: z.number().min(1).max(50)
});

const businessPreferencesSchema = z.object({
  businessHours: z.object({
    monday: z.object({
      isOpen: z.boolean(),
      openTime: z.string().optional(),
      closeTime: z.string().optional()
    }),
    tuesday: z.object({
      isOpen: z.boolean(),
      openTime: z.string().optional(),
      closeTime: z.string().optional()
    }),
    wednesday: z.object({
      isOpen: z.boolean(),
      openTime: z.string().optional(),
      closeTime: z.string().optional()
    }),
    thursday: z.object({
      isOpen: z.boolean(),
      openTime: z.string().optional(),
      closeTime: z.string().optional()
    }),
    friday: z.object({
      isOpen: z.boolean(),
      openTime: z.string().optional(),
      closeTime: z.string().optional()
    }),
    saturday: z.object({
      isOpen: z.boolean(),
      openTime: z.string().optional(),
      closeTime: z.string().optional()
    }),
    sunday: z.object({
      isOpen: z.boolean(),
      openTime: z.string().optional(),
      closeTime: z.string().optional()
    })
  }),
  specialOfferings: z.array(z.string()).min(0),
  targetDemographics: z.string().min(3, "Please provide target demographics")
});

type IndividualPreferences = z.infer<typeof individualPreferencesSchema>;
type BusinessPreferences = z.infer<typeof businessPreferencesSchema>;

interface OnboardingFlowProps {
  userType: "individual" | "business";
  userId: number;
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingFlow({ userType, userId, onComplete, onSkip }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const totalSteps = userType === "individual" ? 3 : 4;
  const { toast } = useToast();

  // Individual onboarding forms
  const individualForm = useForm<IndividualPreferences>({
    resolver: zodResolver(individualPreferencesSchema),
    defaultValues: {
      preferredCategories: [],
      notificationPreferences: {
        email: true,
        push: true,
        sms: false
      },
      locationTracking: true,
      radius: 10
    }
  });

  // Business onboarding forms
  const businessForm = useForm<BusinessPreferences>({
    resolver: zodResolver(businessPreferencesSchema),
    defaultValues: {
      businessHours: {
        monday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
        tuesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
        wednesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
        thursday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
        friday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
        saturday: { isOpen: false, openTime: "", closeTime: "" },
        sunday: { isOpen: false, openTime: "", closeTime: "" }
      },
      specialOfferings: [],
      targetDemographics: ""
    }
  });

  const dealCategories = [
    { id: "food", label: "Food & Dining" },
    { id: "retail", label: "Retail & Shopping" },
    { id: "beauty", label: "Beauty & Wellness" },
    { id: "entertainment", label: "Entertainment" },
    { id: "fitness", label: "Fitness & Health" },
    { id: "services", label: "Services" },
    { id: "travel", label: "Travel & Experiences" }
  ];

  const specialOfferingOptions = [
    { id: "happy-hour", label: "Happy Hour" },
    { id: "loyalty-program", label: "Loyalty Program" },
    { id: "seasonal-specials", label: "Seasonal Specials" },
    { id: "first-time-customer", label: "First-Time Customer Discount" },
    { id: "special-events", label: "Special Events" },
    { id: "limited-time-offers", label: "Limited Time Offers" }
  ];

  const handleNext = async () => {
    if (step < totalSteps) {
      // Validate current step before proceeding
      if (userType === "individual") {
        if (step === 1) {
          const valid = await individualForm.trigger("preferredCategories");
          if (!valid) return;
        } else if (step === 2) {
          const valid = await individualForm.trigger(["notificationPreferences", "locationTracking"]);
          if (!valid) return;
        }
      } else { // business
        if (step === 1) {
          const valid = await businessForm.trigger("businessHours");
          if (!valid) return;
        } else if (step === 2) {
          const valid = await businessForm.trigger("specialOfferings");
          if (!valid) return;
        } else if (step === 3) {
          const valid = await businessForm.trigger("targetDemographics");
          if (!valid) return;
        }
      }
      
      setStep(prev => prev + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (userType === "individual") {
        const data = individualForm.getValues();
        await apiPost(`/api/user/${userId}/preferences`, data);
      } else {
        const data = businessForm.getValues();
        await apiPost(`/api/business/user/${userId}/preferences`, data);
      }
      
      toast({
        title: "Preferences saved",
        description: "Your preferences have been saved successfully"
      });
      
      onComplete();
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error saving preferences",
        description: "There was an error saving your preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants
  const variants = {
    enter: { opacity: 0, x: 100 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800">
          {userType === "individual" ? "Personalize Your Experience" : "Set Up Your Business"}
        </h2>
        <p className="text-gray-500 mt-2">
          {step} of {totalSteps} - {userType === "individual" 
            ? "Help us tailor Pinnity to your preferences" 
            : "Configure your business presence on Pinnity"}
        </p>
        
        {/* Progress bar */}
        <Progress className="mt-4" value={(step / totalSteps) * 100} />
      </div>

      {/* Skip button */}
      <div className="absolute top-4 right-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onSkip}
          className="text-gray-500 hover:text-gray-800 flex items-center gap-1"
        >
          Skip <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial="enter"
          animate="center"
          exit="exit"
          variants={variants}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="min-h-[350px]"
        >
          {userType === "individual" ? (
            // Individual onboarding steps
            <>
              {step === 1 && (
                <Form {...individualForm}>
                  <form className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">What kind of deals are you interested in?</h3>
                      <FormField
                        control={individualForm.control}
                        name="preferredCategories"
                        render={() => (
                          <FormItem>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {dealCategories.map((category) => (
                                <FormField
                                  key={category.id}
                                  control={individualForm.control}
                                  name="preferredCategories"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={category.id}
                                        className="flex flex-row items-start space-x-3 space-y-0 border rounded-md p-3"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(category.id)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, category.id])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) => value !== category.id
                                                    )
                                                  )
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal cursor-pointer">
                                          {category.label}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              )}

              {step === 2 && (
                <Form {...individualForm}>
                  <form className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">How would you like to be notified?</h3>
                      
                      <div className="space-y-4">
                        <FormField
                          control={individualForm.control}
                          name="notificationPreferences.email"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                              <div className="space-y-0.5">
                                <FormLabel>Email Notifications</FormLabel>
                                <FormDescription>
                                  Receive deal updates and offers via email
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={individualForm.control}
                          name="notificationPreferences.push"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                              <div className="space-y-0.5">
                                <FormLabel>Push Notifications</FormLabel>
                                <FormDescription>
                                  Receive alerts on your device
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={individualForm.control}
                          name="notificationPreferences.sms"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                              <div className="space-y-0.5">
                                <FormLabel>SMS Notifications</FormLabel>
                                <FormDescription>
                                  Get text messages about new deals nearby
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <h3 className="text-lg font-medium mb-4">Location Settings</h3>
                      
                      <FormField
                        control={individualForm.control}
                        name="locationTracking"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md mb-4">
                            <div className="space-y-0.5">
                              <FormLabel>Location Services</FormLabel>
                              <FormDescription>
                                Enable to discover deals near you
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {individualForm.watch("locationTracking") && (
                        <FormField
                          control={individualForm.control}
                          name="radius"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Search Radius (miles)</FormLabel>
                              <div className="flex items-center gap-4">
                                <FormControl>
                                  <Slider
                                    min={1}
                                    max={50}
                                    step={1}
                                    value={[field.value]}
                                    onValueChange={(value) => field.onChange(value[0])}
                                    className="flex-1"
                                  />
                                </FormControl>
                                <span className="w-12 text-center">{field.value}</span>
                              </div>
                              <FormDescription>
                                Show deals within this distance from your location
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </form>
                </Form>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-medium mb-2">
                      Ready to go!
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      We've personalized your experience based on your preferences. 
                      You can always update these settings later in your profile.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Business onboarding steps
            <>
              {step === 1 && (
                <Form {...businessForm}>
                  <form className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Set your business hours</h3>
                      
                      {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                        <div key={day} className="mb-4 p-3 border rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="font-medium capitalize">{day}</Label>
                            <FormField
                              control={businessForm.control}
                              name={`businessHours.${day}.isOpen` as any}
                              render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0">
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <span className="text-sm text-gray-500">
                                    {field.value ? "Open" : "Closed"}
                                  </span>
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {businessForm.watch(`businessHours.${day}.isOpen` as any) && (
                            <div className="grid grid-cols-2 gap-3">
                              <FormField
                                control={businessForm.control}
                                name={`businessHours.${day}.openTime` as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs text-gray-500">Opening Time</FormLabel>
                                    <FormControl>
                                      <Input type="time" {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={businessForm.control}
                                name={`businessHours.${day}.closeTime` as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs text-gray-500">Closing Time</FormLabel>
                                    <FormControl>
                                      <Input type="time" {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </form>
                </Form>
              )}

              {step === 2 && (
                <Form {...businessForm}>
                  <form className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Special Offerings & Promotions</h3>
                      <FormField
                        control={businessForm.control}
                        name="specialOfferings"
                        render={() => (
                          <FormItem>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {specialOfferingOptions.map((offering) => (
                                <FormField
                                  key={offering.id}
                                  control={businessForm.control}
                                  name="specialOfferings"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={offering.id}
                                        className="flex flex-row items-start space-x-3 space-y-0 border rounded-md p-3"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(offering.id)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, offering.id])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) => value !== offering.id
                                                    )
                                                  )
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal cursor-pointer">
                                          {offering.label}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              )}

              {step === 3 && (
                <Form {...businessForm}>
                  <form className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Target Customer Demographics</h3>
                      <FormField
                        control={businessForm.control}
                        name="targetDemographics"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Describe your ideal customers</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Example: Young professionals interested in fitness and health, ages 25-40"
                                className="resize-none h-32"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              This helps us better match your business with interested customers
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-medium mb-2">
                      Your business is ready!
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      You're all set to start creating deals and attracting customers.
                      You can manage these settings anytime from your business dashboard.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 1 || isLoading}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={isLoading}
          className="bg-[#00796B] hover:bg-[#004D40] text-white flex items-center gap-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
            </>
          ) : step === totalSteps ? (
            "Finish"
          ) : (
            <>
              Next <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}