import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { debounce } from 'lodash';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Image as ImageIcon,
  AlertCircle,
  CropIcon,
  AlertTriangle,
  Eye,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ImageUploadWithCropper from '@/components/shared/ImageUploadWithCropper';
import SimpleDealImageUploader from '@/components/shared/SimpleDealImageUploader';
import DealPreview from '@/components/vendor/DealPreview';

// Helper functions for form state persistence
const STORAGE_KEY = 'pinnity-deal-form-draft';

// Debounced save function to avoid excessive saving
const debouncedSave = debounce((userId: number, data: any, step: number, imageUrl?: string) => {
  try {
    const draft = {
      userId,
      data,
      step,
      imageUrl,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    console.log('Form draft saved (debounced):', draft);
    return true;
  } catch (error) {
    console.error('Error saving form draft:', error);
    return false;
  }
}, 500); // 500ms debounce delay

// Save form data to localStorage
const saveFormDraft = (userId: number, data: any, step: number, imageUrl?: string) => {
  // Trigger the debounced save
  debouncedSave(userId, data, step, imageUrl);
  return true;
};

// Load form data from localStorage
const loadFormDraft = (userId: number) => {
  try {
    console.log('Attempting to load draft for user ID:', userId);
    const savedData = localStorage.getItem(STORAGE_KEY);
    
    if (!savedData) {
      console.log('No saved draft found in localStorage');
      return null;
    }
    
    console.log('Found saved data in localStorage:', savedData);
    const parsed = JSON.parse(savedData);
    
    // Only load draft for the current user
    if (parsed.userId !== userId) {
      console.log('Draft user ID does not match current user:', parsed.userId, 'vs', userId);
      return null;
    }
    
    console.log('Found valid draft for current user');
    
    // Parse dates from ISO strings back to Date objects
    if (parsed.data.startDate) {
      parsed.data.startDate = new Date(parsed.data.startDate);
    }
    if (parsed.data.endDate) {
      parsed.data.endDate = new Date(parsed.data.endDate);
    }
    
    return parsed;
  } catch (error) {
    console.error('Error loading form draft:', error);
    return null;
  }
};

// Clear saved form data
const clearFormDraft = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing form draft:', error);
    return false;
  }
};

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

// Standard terms and conditions checkboxes
const STANDARD_TERMS = [
  { id: 'no_combine', text: 'Cannot be combined with any other offers or discounts' },
  { id: 'valid_period', text: 'Valid only during the specified deal period' },
  { id: 'tax_excluded', text: 'Tax not included (discounts apply to pre-tax amounts)' },
  { id: 'no_cash', text: 'No cash value or cash back' },
  { id: 'participating_locations', text: 'Valid only at participating locations' },
  { id: 'management_rights', text: 'Management reserves the right to modify or cancel at any time' },
];

// Deal-type specific terms
const DEAL_TYPE_TERMS = {
  'bogo': [{ id: 'lesser_value', text: 'Discount applies to item of equal or lesser value' }],
  'percent_off': [{ id: 'max_discount', text: 'Maximum discount amount may apply' }],
  'fixed_amount': [{ id: 'min_purchase', text: 'Minimum purchase requirement may apply' }],
  'free_item': []
};

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

// Day names for recurring deals
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
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

  // Recurring deal fields
  isRecurring: z.boolean().default(false),
  recurringDays: z.array(z.number().min(0).max(6)).default([]),
  
  // Standard T&C checkboxes - default to all selected
  standardTerms: z.array(z.string()).default(STANDARD_TERMS.map(term => term.id)),
  // Deal-type specific T&C checkboxes
  dealTypeTerms: z.array(z.string()).default([]),
  // Additional custom terms
  customTerms: z.string().optional(),
  // The combined terms string that will be stored
  terms: z.string().optional(),
  redemptionCode: z.string().min(4, { message: 'Redemption code must be at least 4 characters' }).max(8, { message: 'Redemption code cannot exceed 8 characters' }),
  redemptionInstructions: z.string().optional(),
  imageUrl: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, { message: 'You must accept the terms' })
})
// Add validation: If isRecurring is true, recurringDays must not be empty
.refine(
  (data) => !data.isRecurring || (data.isRecurring && data.recurringDays.length > 0),
  {
    message: "Please select at least one day of the week for your recurring deal",
    path: ["recurringDays"]
  }
);

export type DealFormValues = z.infer<typeof dealSchema> & {
  featured?: boolean;
};

// Step definition for the wizard interface
const steps = [
  { id: 'basics', title: 'Deal Basics', description: 'Define your deal' },
  { id: 'terms', title: 'Deal Terms', description: 'Specify availability and limits' },
  { id: 'redemption', title: 'Redemption Setup', description: 'How customers redeem the deal' },
  { id: 'review', title: 'Review & Submit', description: 'Final check and submission' }
];

export default function CreateDealPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  
  // Image upload related state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
  const [showImageHover, setShowImageHover] = useState(false);
  // Logo is now mandatory, so we removed the useLogo toggle
  const [logoPosition, setLogoPosition] = useState<'top-right' | 'bottom-right'>('top-right');
  const [dimensionsWarning, setDimensionsWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSelectedImage(file);
    
    // Create a preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Check image dimensions
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      
      // Validate dimensions
      if (img.width < 600) {
        setDimensionsWarning("Image is too small. Minimum width should be 600px.");
      } else if (Math.abs(img.width / img.height - 4/3) > 0.2) {
        setDimensionsWarning("Image doesn't follow the recommended 4:3 ratio.");
      } else {
        setDimensionsWarning(null);
      }
      
      // Set the imageUrl in the form
      form.setValue("imageUrl", url);
    };
    img.src = url;
  };
  
  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  // Ensure business has a logo (since logo display is now mandatory)
  const ensureBusinessLogo = () => {
    if (!business) return;
    
    console.log('LOGO DEBUG - Business data check - ID:', business.id);
    console.log('LOGO DEBUG - Fields check - logoUrl:', business.logoUrl);
    console.log('LOGO DEBUG - Fields check - imageUrl:', business.imageUrl);
    
    // Create a copy of the business object for potential updates
    let needsUpdate = false;
    const updatedBusiness = { ...business };
    
    // Ensure cross-compatibility between logoUrl and imageUrl
    if (!updatedBusiness.logoUrl && updatedBusiness.imageUrl) {
      console.log('LOGO DEBUG - Adding logoUrl from imageUrl:', updatedBusiness.imageUrl);
      updatedBusiness.logoUrl = updatedBusiness.imageUrl;
      needsUpdate = true;
    }
    
    if (!updatedBusiness.imageUrl && updatedBusiness.logoUrl) {
      console.log('LOGO DEBUG - Adding imageUrl from logoUrl:', updatedBusiness.logoUrl);
      updatedBusiness.imageUrl = updatedBusiness.logoUrl;
      needsUpdate = true;
    }
    
    // If neither field has a value, set a fallback
    if (!updatedBusiness.logoUrl && !updatedBusiness.imageUrl) {
      console.warn('LOGO DEBUG - No logo URL found, setting fallback');
      updatedBusiness.logoUrl = 'https://placehold.co/400x400/00796B/white?text=Logo';
      updatedBusiness.imageUrl = 'https://placehold.co/400x400/00796B/white?text=Logo';
      needsUpdate = true;
    }
    
    // Validate URLs
    try {
      // Handle both regular URLs and data URLs
      if (updatedBusiness.logoUrl) {
        if (updatedBusiness.logoUrl.startsWith('data:')) {
          console.log('LOGO DEBUG - Logo URL is a valid data URL');
        } else {
          const url = new URL(updatedBusiness.logoUrl);
          console.log('LOGO DEBUG - Logo URL is valid:', url.toString());
        }
      }
    } catch (e) {
      console.error('LOGO DEBUG - Logo URL is invalid, setting fallback');
      updatedBusiness.logoUrl = 'https://placehold.co/400x400/00796B/white?text=Logo';
      updatedBusiness.imageUrl = 'https://placehold.co/400x400/00796B/white?text=Logo';
      needsUpdate = true;
    }
    
    // Apply updates if needed
    if (needsUpdate) {
      console.log('LOGO DEBUG - Updating business with enhanced data:', updatedBusiness);
      setBusiness(updatedBusiness);
    }
  };
  
  // Change logo position
  const handleLogoPositionChange = (position: 'top-right' | 'bottom-right') => {
    setLogoPosition(position);
  };
  
  // Update the combined terms field from the selected standard, deal-specific, and custom terms
  const updateCombinedTerms = () => {
    // Get current values
    const standardTermIds = form.getValues("standardTerms") || [];
    const dealTypeTermIds = form.getValues("dealTypeTerms") || [];
    const customTermsText = form.getValues("customTerms") || '';
    const isRecurring = form.getValues("isRecurring") || false;
    const recurringDays = form.getValues("recurringDays") || [];
    
    // Get the text of the selected standard terms
    const standardTermsText = standardTermIds
      .map(id => STANDARD_TERMS.find(term => term.id === id)?.text)
      .filter(Boolean);
    
    // Get the text of the selected deal-type terms
    const dealTypeTermsText = dealTypeTermIds
      .map(id => {
        const dealType = form.getValues("dealType") as keyof typeof DEAL_TYPE_TERMS;
        return DEAL_TYPE_TERMS[dealType]?.find(term => term.id === id)?.text;
      })
      .filter(Boolean);
    
    // Combine all terms
    const allTerms = [...standardTermsText, ...dealTypeTermsText];
    
    // Add recurring deal terms if applicable
    if (isRecurring && recurringDays.length > 0) {
      const daysText = recurringDays
        .sort()
        .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label)
        .join(', ');
      allTerms.unshift(`Valid only on the following days: ${daysText}`);
    }
    
    // Add custom terms if any
    if (customTermsText.trim()) {
      // Split custom terms by line breaks to add as separate bullet points
      const customTermsLines = customTermsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
        
      allTerms.push(...customTermsLines);
    }
    
    // Format as a bulleted list
    const formattedTerms = allTerms.length > 0
      ? allTerms.map(term => `• ${term}`).join('\n')
      : '';
    
    // Set the combined terms field
    form.setValue("terms", formattedTerms);
  };
  
  // State to track if a saved draft is available
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [savedDraftDate, setSavedDraftDate] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  
  // Initialize form with default values or saved draft
  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: '',
      category: '',
      description: '',
      dealType: '',
      startDate: new Date(new Date().setHours(new Date().getHours() + 24)), // Default to 24 hours in future
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), // Default to 1 month duration
      maxRedemptionsPerCustomer: 1,
      // Recurring deal fields
      isRecurring: false,
      recurringDays: [],
      // All standard terms selected by default
      standardTerms: STANDARD_TERMS.map(term => term.id),
      dealTypeTerms: [],
      customTerms: '',
      terms: '',
      redemptionCode: generateRandomCode(),
      redemptionInstructions: '',
      acceptTerms: false
    }
  });
  
  // Watch form values for UI updates
  const watchedValues = form.watch();
  
  // Ref to track initial render
  const isInitialRender = useRef(true);
  
  // Save form state when values change
  useEffect(() => {
    // Skip saving on initial render to avoid saving default values
    if (isInitialRender.current) {
      console.log('Skipping save on initial render');
      isInitialRender.current = false;
      return;
    }
    
    // Only save if the user has made changes and we're not submitting
    if (user?.id && !submitting && form.formState.isDirty) {
      const formData = form.getValues();
      
      // Check if there's meaningful data to save (at least title or description)
      const hasContent = formData.title?.trim() || formData.description?.trim() || formData.category;
      
      if (hasContent) {
        console.log('Auto-saving form data (user made changes):', formData);
        saveFormDraft(user.id, formData, currentStep, previewUrl);
        
        // Set flag for having a saved draft
        if (!hasSavedDraft) {
          setHasSavedDraft(true);
        }
      } else {
        console.log('Form has no meaningful content, skipping save');
      }
    }
  }, [watchedValues, currentStep, previewUrl, user?.id, submitting, form.formState.isDirty]);
  
  // Fetch business data when component mounts
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (user?.id) {
        try {
          const data = await apiRequest(`/api/business/user/${user.id}`);
          
          console.log('Setting business data with ID:', data.id);
          console.log('Business data:', data);
          console.log('DEBUG - Business imageUrl:', data.imageUrl);
          console.log('DEBUG - Business logoUrl:', data.logoUrl);
          
          // Ensure consistent property naming - the database field is 'imageUrl'
          // but the client code expects 'logoUrl'. Map between them for consistency.
          const enhancedData = {
            ...data,
            // Ensure logoUrl exists by copying it from imageUrl if necessary
            logoUrl: data.logoUrl || data.imageUrl || null
          };
          
          // For robustness, make imageUrl available too if only logoUrl exists
          if (!enhancedData.imageUrl && enhancedData.logoUrl) {
            enhancedData.imageUrl = enhancedData.logoUrl;
          }
          
          // Check if a logo is available through either field
          if (!enhancedData.logoUrl) {
            console.warn('Business logo URL is missing or undefined. No imageUrl or logoUrl found.');
            // Set a default logo as fallback
            enhancedData.logoUrl = 'https://placehold.co/400x400/teal/white?text=Business';
          } else {
            console.log('Business logo URL set:', enhancedData.logoUrl);
          }
          
          // Store the updated business data with guaranteed logo
          console.log('Setting enhanced business data:', enhancedData);
          setBusiness(enhancedData);
          
          // Ensure the business has a logo (mandatory)
          ensureBusinessLogo();
        } catch (error) {
          console.error('Error loading business data:', error);
          toast({
            title: "Error loading business data",
            description: "Please try again or contact support",
            variant: "destructive"
          });
        }
      }
    };
    
    fetchBusinessData();
  }, [user]);

  // Initialize terms when component mounts and check for saved draft
  useEffect(() => {
    // Check for saved draft first so we don't overwrite loaded data
    if (user?.id) {
      console.log('Checking for saved draft at component mount');
      const savedDraft = loadFormDraft(user.id);
      if (savedDraft) {
        console.log('Found saved draft at component mount, showing banner');
        // We have a saved draft, set flag for showing banner
        setHasSavedDraft(true);
        setShowDraftBanner(true);
        
        // Format date for display
        const formattedDate = new Date(savedDraft.lastUpdated).toLocaleString();
        setSavedDraftDate(formattedDate);
        
        // Allow user to decide whether to load the draft via the banner
        // We don't automatically load the draft data here
      }
    }
    
    updateCombinedTerms();
    
    // Validate start date is at least 24 hours in future
    const startDate = form.getValues("startDate");
    if (startDate) {
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 24);
      if (startDate < tomorrow) {
        form.setError("startDate", {
          type: "manual",
          message: "Please select a start date at least 24 hours in the future to allow for approval."
        });
      }
    }
  }, [user?.id]);
  
  // Update deal-type specific terms when deal type changes
  useEffect(() => {
    if (watchedValues.dealType) {
      // Get deal-type specific terms for this deal type
      const dealTypeSpecificTerms = DEAL_TYPE_TERMS[watchedValues.dealType as keyof typeof DEAL_TYPE_TERMS] || [];
      
      // Select all deal-type specific terms by default
      if (dealTypeSpecificTerms.length > 0) {
        form.setValue('dealTypeTerms', dealTypeSpecificTerms.map(term => term.id));
      } else {
        form.setValue('dealTypeTerms', []);
      }
      
      // Update the combined terms
      updateCombinedTerms();
    }
  }, [watchedValues.dealType]);
  
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
  
  // Load saved draft if available
  const loadSavedDraft = () => {
    if (!user?.id) {
      console.error('Cannot load draft: User ID is not available');
      return;
    }
    
    console.log('Loading saved draft for user ID:', user.id);
    const savedDraft = loadFormDraft(user.id);
    
    if (!savedDraft) {
      console.error('No valid draft found to load');
      toast({
        title: "No draft found",
        description: "We couldn't find a saved draft to restore.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      console.log('Loading draft data:', savedDraft);
      
      // Format the date for display
      const formattedDate = new Date(savedDraft.lastUpdated).toLocaleString();
      setSavedDraftDate(formattedDate);
      
      // Reset form first to clear any current values
      form.reset();
      
      // Set the draft data to the form
      console.log('Setting form values from draft data:', savedDraft.data);
      Object.entries(savedDraft.data).forEach(([key, value]) => {
        // Skip undefined values
        if (value !== undefined) {
          console.log(`Setting form field ${key}:`, value);
          form.setValue(key as any, value);
        }
      });
      
      // Mark form as dirty programmatically after loading values
      // We can't directly modify formState, so we'll use a different approach
      
      // We need a different approach to let the form know these values are "dirty"
      // Using form.setValue with the third parameter (shouldDirty) set to true
      setTimeout(() => {
        // Re-apply the form values with shouldDirty flag
        Object.entries(savedDraft.data).forEach(([key, value]) => {
          // Skip undefined values or arrays/objects that might cause issues
          if (value !== undefined && typeof value !== 'object') {
            console.log(`Re-setting form field ${key} with shouldDirty=true`);
            form.setValue(key as any, value, { shouldDirty: true });
          }
        });
        
        // Trigger validation to update form state
        form.trigger();
        
        // Log to confirm data was restored
        console.log('Form values after loading draft:', form.getValues());
      }, 10);
      
      // Set the saved step
      console.log('Setting current step to:', savedDraft.step || 0);
      setCurrentStep(savedDraft.step || 0);
      
      // Set image preview if available
      if (savedDraft.imageUrl) {
        console.log('Setting preview URL:', savedDraft.imageUrl);
        setPreviewUrl(savedDraft.imageUrl);
      }
      
      // Update UI state
      setHasSavedDraft(true);
      setShowDraftBanner(false); // Hide the banner after loading
      
      // Show success message
      toast({
        title: "Draft restored",
        description: `Your previous progress from ${formattedDate} has been loaded.`,
      });
      
      console.log('Draft loaded successfully');
    } catch (error) {
      console.error('Error loading draft:', error);
      toast({
        title: "Error loading draft",
        description: "There was a problem loading your saved progress.",
        variant: "destructive"
      });
    }
  };
  
  // Discard saved draft
  const discardDraft = () => {
    clearFormDraft();
    setHasSavedDraft(false);
    setShowDraftBanner(false);
    
    // Reset form to default values
    form.reset();
    
    // Clear preview URL
    setPreviewUrl('');
    
    // Reset step
    setCurrentStep(0);
    
    toast({
      title: "Draft discarded",
      description: "Your saved progress has been cleared.",
    });
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Make sure the terms are properly combined before submission
      updateCombinedTerms();
      
      // Get form values
      const values = form.getValues();
      
      if (!business?.id) {
        throw new Error("Business information not available. Please try again or contact support.");
      }
      
      // Convert dates to ISO string format
      const dealData = {
        ...values,
        startDate: values.startDate?.toISOString(),
        endDate: values.endDate?.toISOString(),
        businessId: business.id, // Ensure the business ID is included
        // Let the server set the status to pending
        viewCount: 0,
        saveCount: 0,
        redemptionCount: 0
      };
      
      // Submit to API endpoint using our API client which adds auth headers
      console.log('Submitting deal:', dealData);
      
      // Use the apiRequest helper which handles auth tokens automatically
      const deal = await apiRequest('/api/deals', {
        method: 'POST',
        data: dealData
      });
      
      console.log('Deal created successfully:', deal);
      
      // Clear the saved draft after successful submission
      clearFormDraft();
      setHasSavedDraft(false);
      
      toast({
        title: "Deal created successfully",
        description: "Your deal has been submitted for approval",
        variant: "default"
      });
      
      // Redirect to the vendor dashboard
      setLocation('/vendor');
    } catch (error) {
      console.error('Error submitting deal:', error);
      toast({
        title: "Error creating deal",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
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
        // Add recurringDays validation when isRecurring is true
        return form.getValues("isRecurring") 
          ? ['startDate', 'endDate', 'maxRedemptionsPerCustomer', 'terms', 'isRecurring', 'recurringDays']
          : ['startDate', 'endDate', 'maxRedemptionsPerCustomer', 'terms'];
      case 2: // Redemption
        return ['redemptionCode', 'redemptionInstructions'];
      case 3: // Review
        return ['acceptTerms'];
      default:
        return [];
    }
  }
  
  // Generate a random redemption code
  function generateRandomCode() {
    // Generate a 5-digit numeric code
    // Calculate min and max values for a 5-digit number
    const min = 10000; // Minimum 5-digit number
    const max = 99999; // Maximum 5-digit number
    
    // Generate a random number between min and max (inclusive)
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
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
      
      {/* Saved draft notification */}
      {showDraftBanner && hasSavedDraft && savedDraftDate && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3 flex-1 md:flex md:justify-between items-center">
              <p className="text-sm text-blue-700">
                We found an unfinished deal draft from {savedDraftDate}. Would you like to continue where you left off?
              </p>
              <div className="mt-3 md:mt-0 md:ml-6 flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={discardDraft}
                  className="text-xs h-8"
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={loadSavedDraft}
                  className="bg-blue-600 hover:bg-blue-700 text-xs h-8"
                >
                  Load Draft
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDraftBanner(false)}
                  className="text-xs h-8 p-0 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
              {/* Recurring Deal Toggle */}
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                <Switch
                  id="isRecurring"
                  checked={watchedValues.isRecurring}
                  onCheckedChange={(checked) => {
                    form.setValue("isRecurring", checked);
                    // If turning off recurring, clear recurringDays
                    if (!checked) {
                      form.setValue("recurringDays", []);
                    }
                  }}
                />
                <Label htmlFor="isRecurring" className="font-medium cursor-pointer">
                  This is a recurring deal (e.g., "Taco Tuesdays", "Weekend Special")
                </Label>
              </div>
              
              {/* Recurring Days Selector (shown only when isRecurring is true) */}
              {watchedValues.isRecurring && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Select days when this deal is valid:</Label>
                    {form.formState.errors.recurringDays && (
                      <p className="text-sm text-red-500">{form.formState.errors.recurringDays.message}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <div
                        key={day.value}
                        className={cn(
                          "flex items-center justify-center p-2 rounded-md border cursor-pointer transition-colors",
                          watchedValues.recurringDays?.includes(day.value)
                            ? "bg-[#00796B] text-white border-[#00796B]"
                            : "border-gray-300 hover:border-[#00796B] hover:bg-[#00796B10]"
                        )}
                        onClick={() => {
                          const currentDays = [...(watchedValues.recurringDays || [])];
                          if (currentDays.includes(day.value)) {
                            // Remove the day
                            form.setValue("recurringDays", currentDays.filter(d => d !== day.value));
                          } else {
                            // Add the day
                            form.setValue("recurringDays", [...currentDays, day.value].sort());
                          }
                        }}
                      >
                        {day.label.substring(0, 3)}
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-sm mt-2 text-gray-600">
                    Selected: 
                    {watchedValues.recurringDays && watchedValues.recurringDays.length > 0 
                      ? ' Valid every ' + watchedValues.recurringDays
                          .sort()
                          .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label)
                          .join(', ')
                      : ' No days selected'
                    }
                  </div>
                </div>
              )}
              
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
                        onSelect={(date) => {
                          form.setValue("startDate", date || new Date());
                          
                          // Check if selected date is less than 24 hours in the future
                          if (date) {
                            const tomorrow = new Date();
                            tomorrow.setHours(tomorrow.getHours() + 24);
                            if (date < tomorrow) {
                              form.setError("startDate", {
                                type: "manual",
                                message: "Please select a start date at least 24 hours in the future to allow for approval."
                              });
                            } else {
                              form.clearErrors("startDate");
                            }
                          }
                        }}
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
              
              <Alert className="bg-amber-50 border-amber-200 mt-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-700 text-sm">
                  Please allow up to 24 hours for deal approval before your deal goes live.
                </AlertDescription>
              </Alert>
              
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
                

              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Terms & Conditions</h3>
                  <div className="text-sm text-[#00796B] bg-[#E0F2F1] px-2 py-1 rounded">
                    {watchedValues.standardTerms?.length + watchedValues.dealTypeTerms?.length} Terms Selected
                  </div>
                </div>
                
                {/* Standard Terms & Conditions */}
                <div className="space-y-2 p-4 bg-gray-50 rounded-md border">
                  <h4 className="font-medium text-sm">Standard Terms & Conditions</h4>
                  <div className="space-y-3 mt-2">
                    {STANDARD_TERMS.map((term) => (
                      <div key={term.id} className="flex items-start space-x-2">
                        <Checkbox 
                          id={`standard-term-${term.id}`} 
                          checked={watchedValues.standardTerms?.includes(term.id)}
                          onCheckedChange={(checked) => {
                            const currentTerms = form.getValues("standardTerms") || [];
                            if (checked) {
                              if (!currentTerms.includes(term.id)) {
                                form.setValue("standardTerms", [...currentTerms, term.id]);
                              }
                            } else {
                              form.setValue(
                                "standardTerms", 
                                currentTerms.filter((id) => id !== term.id)
                              );
                            }
                            
                            // After changing selection, update the terms field
                            updateCombinedTerms();
                          }}
                          className="mt-1"
                        />
                        <label 
                          htmlFor={`standard-term-${term.id}`} 
                          className="text-sm leading-tight cursor-pointer"
                        >
                          {term.text}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Deal-type specific Terms & Conditions */}
                {watchedValues.dealType && DEAL_TYPE_TERMS[watchedValues.dealType as keyof typeof DEAL_TYPE_TERMS]?.length > 0 && (
                  <div className="space-y-2 p-4 bg-[#E0F2F1] bg-opacity-30 rounded-md border border-[#B2DFDB]">
                    <h4 className="font-medium text-sm">
                      {DEAL_TYPES.find(d => d.id === watchedValues.dealType)?.name} Specific Terms
                    </h4>
                    <div className="space-y-3 mt-2">
                      {DEAL_TYPE_TERMS[watchedValues.dealType as keyof typeof DEAL_TYPE_TERMS].map((term) => (
                        <div key={term.id} className="flex items-start space-x-2">
                          <Checkbox 
                            id={`deal-type-term-${term.id}`} 
                            checked={watchedValues.dealTypeTerms?.includes(term.id)}
                            onCheckedChange={(checked) => {
                              const currentTerms = form.getValues("dealTypeTerms") || [];
                              if (checked) {
                                if (!currentTerms.includes(term.id)) {
                                  form.setValue("dealTypeTerms", [...currentTerms, term.id]);
                                }
                              } else {
                                form.setValue(
                                  "dealTypeTerms", 
                                  currentTerms.filter((id) => id !== term.id)
                                );
                              }
                              
                              // After changing selection, update the terms field
                              updateCombinedTerms();
                            }}
                            className="mt-1"
                          />
                          <label 
                            htmlFor={`deal-type-term-${term.id}`} 
                            className="text-sm leading-tight cursor-pointer"
                          >
                            {term.text}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Additional Custom Terms */}
                <div className="space-y-2">
                  <Label htmlFor="customTerms">Additional Terms & Conditions (Optional)</Label>
                  <Textarea 
                    id="customTerms" 
                    placeholder="Enter any additional terms or restrictions specific to this deal..." 
                    rows={3}
                    {...form.register("customTerms")}
                    onChange={(e) => {
                      form.setValue("customTerms", e.target.value);
                      updateCombinedTerms();
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    E.g. "Valid for dine-in only", "First-time customers only", etc.
                  </p>
                </div>
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
                    Redemption Code <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs text-gray-500">(Give this to customers during redemption)</span>
                  </Label>
                  <div className="flex">
                    <Input 
                      id="redemptionCode" 
                      placeholder="e.g. 12345" 
                      maxLength={5}
                      className="text-center font-mono text-lg tracking-wider"
                      {...form.register("redemptionCode")}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="ml-2"
                      onClick={() => form.setValue("redemptionCode", generateRandomCode())}
                    >
                      Generate Code
                    </Button>
                  </div>
                  {form.formState.errors.redemptionCode && (
                    <p className="text-sm text-red-500">{form.formState.errors.redemptionCode.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    This 5-digit code will be provided to customers when they visit your business to redeem this deal
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
                  Redemption Process
                </h3>
                <div className="p-4 border rounded-md bg-white">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Customer visits your business and requests to redeem the deal</li>
                    <li>Customer shows the deal on their Pinnity app</li>
                    <li>Your staff provides the redemption code: <span className="font-mono font-bold">{watchedValues.redemptionCode}</span></li>
                    <li>Customer enters the code in their app to confirm redemption</li>
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
              
              {/* Deal Image Upload */}
              <div className="space-y-4">
                <h3 className="font-medium">Deal Image</h3>
                
                <div className="border rounded-lg p-4">
                  {/* Simplified deal image uploader with integrated logo */}
                  <div className="grid grid-cols-1 gap-6">
                    <div className="relative">
                      <SimpleDealImageUploader
                        onImageChange={(image) => {
                          if (image) {
                            setPreviewUrl(image);
                            // Store the image for form submission
                            form.setValue("imageUrl", image);
                            
                            // Get dimensions for the UI display
                            const img = new Image();
                            img.onload = () => {
                              setImageDimensions({ 
                                width: img.width, 
                                height: img.height 
                              });
                            };
                            img.src = image;
                          } else {
                            setPreviewUrl('');
                            form.setValue("imageUrl", '');
                            setImageDimensions(null);
                          }
                        }}
                        currentImage={previewUrl}
                        className="w-full"
                      />
                      
                      {/* Business logo overlay directly on the main upload preview */}
                      {console.log('Logo rendering check - previewUrl:', previewUrl)}
                      {console.log('Logo rendering check - business:', business)}
                      {console.log('Logo rendering check - business?.logoUrl:', business?.logoUrl)}
                      {previewUrl && business?.logoUrl && (
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                          <div className={cn(
                            "absolute w-16 h-16 bg-white/90 rounded-md flex items-center justify-center p-2",
                            logoPosition === 'top-right' && "top-4 right-4",
                            logoPosition === 'bottom-right' && "bottom-4 right-4"
                          )}>
                            {/* Logo source rendering */}
                            <img 
                              src={business.logoUrl} 
                              alt={business.name} 
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                console.error('Error loading business logo in main image preview:', e);
                                // On error, load a placeholder
                                e.currentTarget.src = 'https://placehold.co/400x400/teal/white?text=Logo';
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Logo position selection */}
                    {previewUrl && (
                      <div className="flex flex-col space-y-3">
                        <h4 className="font-medium text-sm">Business Logo Position</h4>
                        <p className="text-sm text-gray-600">Your business logo will be displayed on the deal image. Please select a position:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant={logoPosition === 'top-right' ? 'default' : 'outline'}
                            className="h-10 w-full"
                            onClick={() => handleLogoPositionChange('top-right')}
                          >
                            Top Right ↗
                          </Button>
                          <Button
                            size="sm"
                            variant={logoPosition === 'bottom-right' ? 'default' : 'outline'}
                            className="h-10 w-full"
                            onClick={() => handleLogoPositionChange('bottom-right')}
                          >
                            Bottom Right ↘
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4 mr-2 text-blue-500" />
                      <AlertDescription className="text-xs text-blue-700">
                        <strong>Image Tips:</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                          <li>Use high-quality, eye-catching images that showcase your deal</li>
                          <li>Landscape format (4:3 ratio) works best for featured promotions</li>
                          <li>Avoid excessive text in the image</li>
                          <li>Maintain clear branding that aligns with your business</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </div>
              
              {/* Deal Summary */}
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
                </div>
                
                <div className="space-y-1 mt-4">
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm">{watchedValues.description}</p>
                </div>
              </div>
              
              {/* We've removed the separate Customer Preview Section as requested */}
              
              {/* Terms & Conditions */}
              {watchedValues.terms && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Terms & Conditions</p>
                  <div className="p-3 bg-gray-50 rounded border text-sm space-y-1">
                    {watchedValues.terms.split('\n').map((term, index) => (
                      <p key={index} className="text-sm">{term}</p>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 italic">
                    {watchedValues.standardTerms?.length || 0} standard terms and {watchedValues.dealTypeTerms?.length || 0} deal-specific terms
                  </p>
                </div>
              )}
              
              {/* Redemption Info */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Redemption Code</p>
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
              
              {/* Terms Acceptance */}
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