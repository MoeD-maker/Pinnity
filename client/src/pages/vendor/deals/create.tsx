import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  CalendarIcon, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Percent, 
  Tag, 
  Clock, 
  Truck, 
  ShoppingBag,
  UploadCloud,
  Image,
  AlertCircle,
  CropIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Define deal categories that match those in consumer side
const CATEGORIES = [
  { id: 'food_drink', name: 'Food & Drink' },
  { id: 'shopping', name: 'Shopping' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'health_beauty', name: 'Health & Beauty' },
  { id: 'travel', name: 'Travel' },
  { id: 'services', name: 'Services' },
  { id: 'other', name: 'Other' }
];

// Deal type options
const DEAL_TYPES = [
  { id: 'percent_off', name: 'Percentage Off', icon: <Percent className="h-4 w-4" /> },
  { id: 'bogo', name: 'Buy One Get One Free', icon: <ShoppingBag className="h-4 w-4" /> },
  { id: 'free_item', name: 'Free Item with Purchase', icon: <Tag className="h-4 w-4" /> },
  { id: 'fixed_amount', name: 'Fixed Amount Off', icon: <Truck className="h-4 w-4" /> }
];

// Discount percentage options
const DISCOUNT_OPTIONS = [
  { value: '10%', label: '10% off' },
  { value: '15%', label: '15% off' },
  { value: '20%', label: '20% off' },
  { value: '25%', label: '25% off' },
  { value: '30%', label: '30% off' },
  { value: '40%', label: '40% off' },
  { value: '50%', label: '50% off' }
];

// Form schema for deal creation
const dealSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters' }).max(100),
  category: z.string({ required_error: 'Please select a category' }),
  description: z.string().min(20, { message: 'Description must be at least 20 characters' }).max(500),
  dealType: z.string({ required_error: 'Please select a deal type' }),
  discount: z.string().optional(),
  startDate: z.date({ required_error: 'Start date is required' }),
  endDate: z.date({ required_error: 'End date is required' }),
  maxRedemptionsPerCustomer: z.number().min(1).default(1),
  totalRedemptions: z.number().optional(),
  terms: z.string().optional(),
  redemptionCode: z.string().min(4, { message: 'Redemption code must be at least 4 characters' }).max(10),
  redemptionInstructions: z.string().optional(),
  imageUrl: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, { message: 'You must accept the terms' })
});

type DealFormValues = z.infer<typeof dealSchema>;

// Step definition for the wizard interface
const steps = [
  { id: 'basics', title: 'Deal Basics', description: 'Define your deal' },
  { id: 'terms', title: 'Deal Terms', description: 'Specify availability and limits' },
  { id: 'redemption', title: 'Redemption Setup', description: 'How customers redeem the deal' },
  { id: 'review', title: 'Review & Submit', description: 'Final check and submission' }
];

export default function CreateDealPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  
  // Image upload related state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
  const [showImageHover, setShowImageHover] = useState(false);
  const [useLogo, setUseLogo] = useState(false);
  const [logoPosition, setLogoPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize form with default values
  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: '',
      category: '',
      description: '',
      dealType: '',
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), // Default to 1 month duration
      maxRedemptionsPerCustomer: 1,
      totalRedemptions: undefined,
      terms: '',
      redemptionCode: generateRandomCode(),
      redemptionInstructions: '',
      acceptTerms: false
    }
  });
  
  // Watch form values for UI updates
  const watchedValues = form.watch();
  
  // Calculate progress percentage
  const progress = ((currentStep + 1) / steps.length) * 100;
  
  // Handle back button
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      // Go back to deals list
      setLocation('/vendor');
    }
  };
  
  // Handle next button
  const handleNext = async () => {
    // Validate current step fields
    const fieldsToValidate = getFieldsForStep(currentStep);
    
    const isValid = await form.trigger(fieldsToValidate as any);
    
    if (isValid) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
      } else {
        // Submit the form on the last step
        handleSubmit();
      }
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Get form values
      const values = form.getValues();
      
      // TODO: Submit to API endpoint
      console.log('Submitting deal:', values);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Redirect to success page or deals list
      setLocation('/vendor');
    } catch (error) {
      console.error('Error submitting deal:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Get the fields that should be validated for each step
  function getFieldsForStep(step: number): (keyof DealFormValues)[] {
    switch (step) {
      case 0: // Basics
        return ['title', 'category', 'description', 'dealType', 'discount'];
      case 1: // Terms
        return ['startDate', 'endDate', 'maxRedemptionsPerCustomer', 'terms'];
      case 2: // Redemption
        return ['redemptionCode', 'redemptionInstructions'];
      case 3: // Review
        return ['acceptTerms'];
      default:
        return [];
    }
  }
  
  // Generate a random redemption PIN code
  function generateRandomCode() {
    // Generate a 6-digit PIN for redemption
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={handleBack} className="mr-2">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create New Deal</h1>
      </div>
      
      {/* Progress bar */}
      <div className="mb-8">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2">
          {steps.map((step, index) => (
            <div key={step.id} className="text-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1",
                index < currentStep 
                  ? "bg-[#00796B] text-white" 
                  : index === currentStep 
                    ? "border-2 border-[#00796B] text-[#00796B]" 
                    : "border border-gray-300 text-gray-400"
              )}>
                {index < currentStep ? 
                  <CheckCircle className="h-5 w-5" /> : 
                  (index + 1)
                }
              </div>
              <div className={cn(
                "text-xs",
                index <= currentStep ? "text-[#00796B] font-medium" : "text-gray-400"
              )}>
                {step.title}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Deal Basics */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Deal Title <span className="text-red-500">*</span></Label>
                <Input 
                  id="title" 
                  placeholder="e.g. 25% Off All Smoothies" 
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  Clear, concise title that grabs customer attention
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                <Select 
                  onValueChange={(value) => form.setValue("category", value)}
                  defaultValue={watchedValues.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.category && (
                  <p className="text-sm text-red-500">{form.formState.errors.category.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
                <Textarea 
                  id="description" 
                  placeholder="Describe your deal in detail..." 
                  rows={4}
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
                )}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Be specific about what customers receive</span>
                  <span>{watchedValues.description?.length || 0}/500</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <Label>Deal Type <span className="text-red-500">*</span></Label>
                <RadioGroup 
                  onValueChange={(value) => form.setValue("dealType", value)}
                  value={watchedValues.dealType}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {DEAL_TYPES.map(type => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={type.id} id={type.id} />
                      <Label htmlFor={type.id} className="flex items-center cursor-pointer">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 mr-2">
                          {type.icon}
                        </div>
                        {type.name}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {form.formState.errors.dealType && (
                  <p className="text-sm text-red-500">{form.formState.errors.dealType.message}</p>
                )}
              </div>
              
              {watchedValues.dealType === 'percent_off' && (
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount Percentage <span className="text-red-500">*</span></Label>
                  <Select 
                    onValueChange={(value) => form.setValue("discount", value)}
                    defaultValue={watchedValues.discount}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select discount percentage" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCOUNT_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.discount && (
                    <p className="text-sm text-red-500">{form.formState.errors.discount.message}</p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Step 2: Deal Terms */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Start Date <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {watchedValues.startDate ? (
                          format(watchedValues.startDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={watchedValues.startDate}
                        onSelect={(date) => form.setValue("startDate", date || new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.startDate && (
                    <p className="text-sm text-red-500">{form.formState.errors.startDate.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>End Date <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {watchedValues.endDate ? (
                          format(watchedValues.endDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={watchedValues.endDate}
                        onSelect={(date) => form.setValue("endDate", date || new Date())}
                        initialFocus
                        disabled={(date) => date < (watchedValues.startDate || new Date())}
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.endDate && (
                    <p className="text-sm text-red-500">{form.formState.errors.endDate.message}</p>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label htmlFor="maxRedemptionsPerCustomer">Maximum Redemptions Per Customer</Label>
                  <Input 
                    id="maxRedemptionsPerCustomer" 
                    type="number"
                    className="w-20 text-center"
                    min={1}
                    {...form.register("maxRedemptionsPerCustomer", { valueAsNumber: true })}
                  />
                </div>
                {form.formState.errors.maxRedemptionsPerCustomer && (
                  <p className="text-sm text-red-500">{form.formState.errors.maxRedemptionsPerCustomer.message}</p>
                )}
                
                <div className="flex justify-between items-center">
                  <Label htmlFor="totalRedemptions">
                    Total Available Redemptions
                    <span className="ml-2 text-xs text-gray-500">(Optional, leave empty for unlimited)</span>
                  </Label>
                  <Input 
                    id="totalRedemptions" 
                    type="number"
                    className="w-20 text-center"
                    min={1}
                    {...form.register("totalRedemptions", { valueAsNumber: true })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea 
                  id="terms" 
                  placeholder="Any additional terms or restrictions..." 
                  rows={4}
                  {...form.register("terms")}
                />
                <p className="text-xs text-gray-500">
                  E.g. "Cannot be combined with other offers", "Valid for dine-in only", etc.
                </p>
              </div>
            </div>
          )}
          
          {/* Step 3: Redemption Setup */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-blue-700">
                  You will provide customers with a unique PIN at the time of redemption. Customers will enter this PIN in their app to confirm the deal.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="redemptionCode">
                    Redemption PIN <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs text-gray-500">(Give this to customers during redemption)</span>
                  </Label>
                  <div className="flex">
                    <Input 
                      id="redemptionCode" 
                      placeholder="e.g. 123456" 
                      maxLength={6}
                      className="text-center font-mono text-lg tracking-wider"
                      {...form.register("redemptionCode")}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="ml-2"
                      onClick={() => form.setValue("redemptionCode", generateRandomCode())}
                    >
                      Generate PIN
                    </Button>
                  </div>
                  {form.formState.errors.redemptionCode && (
                    <p className="text-sm text-red-500">{form.formState.errors.redemptionCode.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    This PIN will be provided to customers when they visit your business to redeem this deal
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="redemptionInstructions">Special Redemption Instructions</Label>
                  <Textarea 
                    id="redemptionInstructions" 
                    placeholder="Any special instructions for redeeming this deal..." 
                    rows={3}
                    {...form.register("redemptionInstructions")}
                  />
                  <p className="text-xs text-gray-500">
                    For example: "Must present valid ID", "Available only during business hours", "Limit one per customer"
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg border mt-6">
                <h3 className="font-medium mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-[#00796B]" />
                  New Redemption Process
                </h3>
                <div className="p-4 border rounded-md bg-white">
                  <p className="text-sm mb-4">This is how the new PIN-based redemption works:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Customer visits your business and requests to redeem the deal</li>
                    <li>Customer shows the deal on their Pinnity app</li>
                    <li>Your staff provides the redemption PIN: <span className="font-mono font-bold">{watchedValues.redemptionCode}</span></li>
                    <li>Customer enters the PIN in their app to confirm redemption</li>
                    <li>Deal is marked as redeemed in the system</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 4: Review & Submit */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Alert className="bg-yellow-50 border-yellow-200">
                <Info className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-700">
                  Please review your deal information carefully. All deals require admin approval before becoming active.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <h3 className="font-medium">Deal Summary</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Title</p>
                    <p className="text-sm">{watchedValues.title}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Category</p>
                    <p className="text-sm">{CATEGORIES.find(c => c.id === watchedValues.category)?.name || '-'}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Deal Type</p>
                    <p className="text-sm">{DEAL_TYPES.find(t => t.id === watchedValues.dealType)?.name || '-'}</p>
                  </div>
                  
                  {watchedValues.dealType === 'percent_off' && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Discount</p>
                      <p className="text-sm">{watchedValues.discount}</p>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Start Date</p>
                    <p className="text-sm">{watchedValues.startDate ? format(watchedValues.startDate, "PPP") : '-'}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium">End Date</p>
                    <p className="text-sm">{watchedValues.endDate ? format(watchedValues.endDate, "PPP") : '-'}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Max Redemptions Per Customer</p>
                    <p className="text-sm">{watchedValues.maxRedemptionsPerCustomer}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Total Available Redemptions</p>
                    <p className="text-sm">{watchedValues.totalRedemptions || 'Unlimited'}</p>
                  </div>
                </div>
                
                <div className="space-y-1 mt-4">
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm">{watchedValues.description}</p>
                </div>
                
                {watchedValues.terms && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Terms & Conditions</p>
                    <p className="text-sm">{watchedValues.terms}</p>
                  </div>
                )}
                
                <div className="space-y-1">
                  <p className="text-sm font-medium">Redemption PIN</p>
                  <p className="text-sm font-mono">{watchedValues.redemptionCode}</p>
                </div>
                
                {watchedValues.redemptionInstructions && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Redemption Instructions</p>
                    <p className="text-sm">{watchedValues.redemptionInstructions}</p>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="acceptTerms" 
                  checked={watchedValues.acceptTerms}
                  onCheckedChange={(checked) => form.setValue("acceptTerms", checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="acceptTerms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I confirm this deal complies with Pinnity's terms and conditions
                  </label>
                  <p className="text-sm text-gray-500">
                    By submitting, you agree to our <a href="#" className="text-[#00796B] underline">Terms of Service</a> and <a href="#" className="text-[#00796B] underline">Deal Guidelines</a>
                  </p>
                </div>
              </div>
              {form.formState.errors.acceptTerms && (
                <p className="text-sm text-red-500">{form.formState.errors.acceptTerms.message}</p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button
            variant="outline"
            onClick={handleBack}
          >
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>
          <Button
            className="bg-[#00796B] hover:bg-[#004D40]"
            onClick={handleNext}
            disabled={submitting}
          >
            {submitting ? 'Processing...' : currentStep < steps.length - 1 ? 'Continue' : 'Submit Deal for Approval'}
            {!submitting && currentStep < steps.length - 1 && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}