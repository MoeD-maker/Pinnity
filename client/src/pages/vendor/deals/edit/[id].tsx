import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
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
  ImageIcon,
  AlertCircle,
  CropIcon,
  AlertTriangle,
  Eye,
  X,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import ImageUploadWithCropper from '@/components/shared/ImageUploadWithCropper';
import SimpleDealImageUploader from '@/components/shared/SimpleDealImageUploader';
import DealPreview from '@/components/vendor/DealPreview';
import CustomerDealPreview from '@/components/vendor/CustomerDealPreview';

// Define deal categories
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
  { id: 'one_per_customer', text: 'Limit one per customer' },
  { id: 'no_cash', text: 'No cash value' },
  { id: 'while_supplies', text: 'While supplies last' },
  { id: 'excludes_tax', text: 'Does not include tax or gratuity' },
  { id: 'management_rights', text: 'Management reserves the right to modify or cancel at any time' }
];

// Form schema for deal editing
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
  
  // Standard T&C checkboxes
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

type DealFormValues = z.infer<typeof dealSchema> & {
  featured?: boolean;
};

export default function EditDealPage() {
  const { id } = useParams<{ id: string }>();
  const dealId = parseInt(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState("basics");
  const [previewTerms, setPreviewTerms] = useState("");
  const [business, setBusiness] = useState<any>(null);
  const [dealImage, setDealImage] = useState<string>("");

  // Set up form with default values
  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: "",
      category: "",
      description: "",
      dealType: "",
      discount: "",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      maxRedemptionsPerCustomer: 1,
      isRecurring: false,
      recurringDays: [],
      standardTerms: STANDARD_TERMS.map(term => term.id),
      dealTypeTerms: [],
      customTerms: "",
      terms: "",
      redemptionCode: "",
      redemptionInstructions: "",
      imageUrl: "",
      acceptTerms: false
    }
  });

  // Fetch the deal data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch business data for the logged-in user
        if (user && user.id) {
          const businessResponse = await apiRequest(`/api/business/user/${user.id}`);
          if (businessResponse) {
            setBusiness(businessResponse);
          }
        }

        // Fetch the deal by ID
        const dealResponse = await apiRequest(`/api/deals/${dealId}`);

        if (dealResponse) {
          // Format dates for form
          const startDate = new Date(dealResponse.startDate);
          const endDate = new Date(dealResponse.endDate);

          // Parse terms to separate standard and custom terms
          let standardTermsSelection = STANDARD_TERMS.map(term => term.id);
          let dealTypeTermsSelection: string[] = [];
          let customTermsText = "";

          if (dealResponse.terms) {
            // This is a simplified approach - in a real app you might need 
            // more sophisticated parsing logic depending on how terms are stored
            standardTermsSelection = STANDARD_TERMS
              .filter(term => dealResponse.terms?.includes(term.text))
              .map(term => term.id);
            
            // Any text not matching standard terms could be considered custom
            customTermsText = dealResponse.terms;
          }

          // Set the image URL
          if (dealResponse.imageUrl) {
            setDealImage(dealResponse.imageUrl);
          }

          // Set all form values
          form.reset({
            title: dealResponse.title,
            category: dealResponse.category,
            description: dealResponse.description,
            dealType: dealResponse.dealType,
            discount: dealResponse.discount || "",
            startDate,
            endDate,
            maxRedemptionsPerCustomer: dealResponse.maxRedemptionsPerCustomer || 1,
            isRecurring: Boolean(dealResponse.recurringDays?.length),
            recurringDays: dealResponse.recurringDays || [],
            standardTerms: standardTermsSelection,
            dealTypeTerms: dealTypeTermsSelection,
            customTerms: customTermsText,
            terms: dealResponse.terms,
            redemptionCode: dealResponse.redemptionCode || "",
            redemptionInstructions: dealResponse.redemptionInstructions || "",
            imageUrl: dealResponse.imageUrl,
            acceptTerms: true // Pre-accepted since it's an edit
          });
        } else {
          // Handle the case where deal is not found
          toast({
            title: "Deal Not Found",
            description: "The requested deal could not be found.",
            variant: "destructive"
          });
          setLocation("/vendor");
        }
      } catch (error) {
        console.error("Error fetching deal:", error);
        toast({
          title: "Error",
          description: "Failed to load deal data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, dealId, form, toast, setLocation]);

  // Compile terms into a single string for submission
  const compileTerms = () => {
    let compiledTerms = "";
    
    // Add standard terms
    const selectedStandardTerms = form.getValues().standardTerms || [];
    const standardTermsText = STANDARD_TERMS
      .filter(term => selectedStandardTerms.includes(term.id))
      .map(term => term.text)
      .join('\n');
    
    if (standardTermsText) {
      compiledTerms += standardTermsText;
    }
    
    // Add custom terms
    const customTermsText = form.getValues().customTerms;
    if (customTermsText && customTermsText.trim()) {
      if (compiledTerms) compiledTerms += '\n';
      compiledTerms += customTermsText.trim();
    }
    
    return compiledTerms;
  };

  // Update terms preview whenever terms-related fields change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.includes('Terms') || name === 'customTerms') {
        setPreviewTerms(compileTerms());
      }
    });
    
    // Set initial preview
    setPreviewTerms(compileTerms());
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Handle image upload
  const handleImageChange = (url: string) => {
    setDealImage(url);
    form.setValue("imageUrl", url);
  };

  // Handle form submission
  const onSubmit = async (data: DealFormValues) => {
    try {
      setSubmitting(true);
      
      // Make sure the terms are compiled correctly
      const compiledTerms = compileTerms();
      data.terms = compiledTerms;
      
      // Set the uploaded image
      data.imageUrl = dealImage;

      // Resubmit deal for approval if it was previously rejected or needed revision
      const deal = await apiRequest(`/api/deals/${dealId}`);
      let resubmitForApproval = false;
      
      if (deal && (deal.status === 'rejected' || deal.status === 'pending_revision')) {
        resubmitForApproval = true;
      }
      
      // Send the update request
      const updatedDeal = await apiRequest(`/api/deals/${dealId}`, {
        method: 'PUT',
        data: {
          ...data,
          // If resubmitting, explicitly set status back to 'pending'
          status: resubmitForApproval ? 'pending' : undefined
        }
      });
      
      if (updatedDeal) {
        toast({
          title: "Deal Updated",
          description: resubmitForApproval 
            ? "Deal has been updated and resubmitted for approval" 
            : "Deal has been successfully updated",
        });
        
        // Navigate back to vendor dashboard
        setLocation("/vendor");
      }
    } catch (error) {
      console.error("Error updating deal:", error);
      toast({
        title: "Error",
        description: "Failed to update deal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B]"></div>
      </div>
    );
  }

  return (
    <div className="container p-4 mx-auto max-w-6xl">
      <Breadcrumb className="mb-6">
        <BreadcrumbItem>
          <BreadcrumbLink href="/vendor">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink>Edit Deal</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Edit Deal</h1>
          <p className="text-muted-foreground">
            Update details for this deal
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setLocation("/vendor")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="basics" value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="basics">Basic Details</TabsTrigger>
            <TabsTrigger value="terms">Terms & Redemption</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          
          {/* Basic Details Tab */}
          <TabsContent value="basics">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Deal Information</CardTitle>
                    <CardDescription>Enter the basic information about your deal</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Deal Title <span className="text-red-500">*</span></Label>
                      <Input
                        id="title"
                        placeholder="e.g., 50% Off Premium Coffee"
                        {...form.register("title")}
                      />
                      {form.formState.errors.title && (
                        <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                      <Select
                        onValueChange={value => form.setValue("category", value)}
                        defaultValue={form.getValues().category}
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
                        className="min-h-[100px]"
                        {...form.register("description")}
                      />
                      {form.formState.errors.description && (
                        <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Deal Type & Value</CardTitle>
                    <CardDescription>Select the type of deal you're offering</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Deal Type <span className="text-red-500">*</span></Label>
                      <RadioGroup
                        onValueChange={value => form.setValue("dealType", value)}
                        defaultValue={form.getValues().dealType}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2"
                      >
                        {DEAL_TYPES.map(type => (
                          <div key={type.id} className="flex items-center">
                            <RadioGroupItem value={type.id} id={`deal-type-${type.id}`} className="peer sr-only" />
                            <Label
                              htmlFor={`deal-type-${type.id}`}
                              className="flex items-center space-x-2 rounded-md border-2 border-muted bg-transparent p-3 hover:border-accent peer-checked:border-primary peer-checked:bg-primary/5 cursor-pointer w-full"
                            >
                              <div className="flex-shrink-0 rounded-full border p-1">
                                {type.icon}
                              </div>
                              <div className="text-sm font-medium leading-none">{type.name}</div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      {form.formState.errors.dealType && (
                        <p className="text-sm text-red-500">{form.formState.errors.dealType.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="discount">Discount Value <span className="text-red-500">*</span></Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="discount"
                          placeholder={form.getValues().dealType === 'percent_off' ? "e.g., 50%" : "e.g., $10"}
                          {...form.register("discount")}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {form.getValues().dealType === 'percent_off' ? 
                          "Enter the percentage discount (e.g., 50%, 25%)" :
                          form.getValues().dealType === 'fixed_amount' ?
                            "Enter the fixed amount discount (e.g., $10, $25)" :
                            "Enter the value or description of the offer"}
                      </p>
                      {form.formState.errors.discount && (
                        <p className="text-sm text-red-500">{form.formState.errors.discount.message}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Deal Dates</CardTitle>
                    <CardDescription>Set when your deal starts and ends</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date <span className="text-red-500">*</span></Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !form.getValues().startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {form.getValues().startDate ? (
                                format(form.getValues().startDate, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={form.getValues().startDate}
                              onSelect={date => date && form.setValue("startDate", date)}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {form.formState.errors.startDate && (
                          <p className="text-sm text-red-500">{form.formState.errors.startDate.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date <span className="text-red-500">*</span></Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !form.getValues().endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {form.getValues().endDate ? (
                                format(form.getValues().endDate, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={form.getValues().endDate}
                              onSelect={date => date && form.setValue("endDate", date)}
                              disabled={(date) => 
                                date < new Date() || 
                                (form.getValues().startDate && date < form.getValues().startDate)
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {form.formState.errors.endDate && (
                          <p className="text-sm text-red-500">{form.formState.errors.endDate.message}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isRecurring"
                          checked={form.getValues().isRecurring}
                          onCheckedChange={checked => form.setValue("isRecurring", checked)}
                        />
                        <Label htmlFor="isRecurring" className="cursor-pointer">This is a recurring deal</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="w-[250px] text-xs">
                                Recurring deals repeat on specific days of the week during the date range.
                                For example, a "Taco Tuesday" deal would recur every Tuesday between the start and end dates.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      
                      {form.getValues().isRecurring && (
                        <div className="pt-2">
                          <Label className="mb-2 block text-sm">Select Days <span className="text-red-500">*</span></Label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: 0, label: 'Sunday' },
                              { value: 1, label: 'Monday' },
                              { value: 2, label: 'Tuesday' },
                              { value: 3, label: 'Wednesday' },
                              { value: 4, label: 'Thursday' },
                              { value: 5, label: 'Friday' },
                              { value: 6, label: 'Saturday' }
                            ].map(day => (
                              <div key={day.value} className="flex items-center">
                                <Checkbox
                                  id={`day-${day.value}`}
                                  checked={form.getValues().recurringDays?.includes(day.value)}
                                  onCheckedChange={checked => {
                                    const currentDays = form.getValues().recurringDays || [];
                                    const newDays = checked
                                      ? [...currentDays, day.value].sort()
                                      : currentDays.filter(d => d !== day.value);
                                    form.setValue("recurringDays", newDays);
                                  }}
                                  className="mr-2"
                                />
                                <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                                  {day.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                          {form.formState.errors.recurringDays && (
                            <p className="text-sm text-red-500">{form.formState.errors.recurringDays.message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Deal Image</CardTitle>
                    <CardDescription>Upload an image for your deal (optional)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <SimpleDealImageUploader
                        onImageChange={handleImageChange}
                        existingImageUrl={dealImage}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="md:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>How your deal will appear</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DealPreview 
                      values={{
                        ...form.getValues(),
                        imageUrl: dealImage,
                        business: business
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div className="mt-6 flex justify-between">
              <Button type="button" variant="outline" onClick={() => setLocation("/vendor")}>
                Cancel
              </Button>
              <Button type="button" onClick={() => setCurrentTab("terms")}>
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
          
          {/* Terms & Redemption Tab */}
          <TabsContent value="terms">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Terms & Conditions</CardTitle>
                    <CardDescription>Set terms and conditions for your deal</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Standard Terms</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {STANDARD_TERMS.map(term => (
                          <div key={term.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={`term-${term.id}`}
                              checked={form.getValues().standardTerms?.includes(term.id)}
                              onCheckedChange={checked => {
                                const currentTerms = form.getValues().standardTerms || [];
                                const newTerms = checked
                                  ? [...currentTerms, term.id]
                                  : currentTerms.filter(t => t !== term.id);
                                form.setValue("standardTerms", newTerms);
                              }}
                              className="mt-1"
                            />
                            <Label htmlFor={`term-${term.id}`} className="text-sm cursor-pointer">
                              {term.text}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="customTerms">Additional Terms & Conditions</Label>
                      <Textarea
                        id="customTerms"
                        placeholder="Add any additional terms specific to your deal..."
                        className="min-h-[120px]"
                        {...form.register("customTerms")}
                      />
                      <p className="text-xs text-muted-foreground">
                        Add any additional terms specific to this deal. These will be displayed to customers before redemption.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Redemption Details</CardTitle>
                    <CardDescription>Set up how customers will redeem your deal</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxRedemptionsPerCustomer">Max Redemptions Per Customer</Label>
                      <Input
                        id="maxRedemptionsPerCustomer"
                        type="number"
                        min="1"
                        {...form.register("maxRedemptionsPerCustomer", {
                          valueAsNumber: true,
                        })}
                      />
                      <p className="text-xs text-muted-foreground">
                        How many times can a single customer redeem this deal?
                      </p>
                      {form.formState.errors.maxRedemptionsPerCustomer && (
                        <p className="text-sm text-red-500">{form.formState.errors.maxRedemptionsPerCustomer.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="redemptionCode">Redemption Code <span className="text-red-500">*</span></Label>
                      <Input
                        id="redemptionCode"
                        placeholder="e.g., COFFEE50"
                        {...form.register("redemptionCode")}
                      />
                      <p className="text-xs text-muted-foreground">
                        This is the code customers will show when redeeming your deal in-store
                      </p>
                      {form.formState.errors.redemptionCode && (
                        <p className="text-sm text-red-500">{form.formState.errors.redemptionCode.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="redemptionInstructions">Redemption Instructions</Label>
                      <Textarea
                        id="redemptionInstructions"
                        placeholder="Instructions for redeeming this deal..."
                        {...form.register("redemptionInstructions")}
                      />
                      <p className="text-xs text-muted-foreground">
                        Provide clear instructions on how customers can redeem this deal (e.g., "Show this code at checkout")
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Agreement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="acceptTerms"
                        checked={form.getValues().acceptTerms}
                        onCheckedChange={checked => form.setValue("acceptTerms", checked === true)}
                        className="mt-1"
                      />
                      <div>
                        <Label htmlFor="acceptTerms" className="cursor-pointer">
                          I confirm that this deal complies with all platform guidelines and terms of service
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          By checking this box, you agree that this deal adheres to our platform guidelines 
                          and that you have the authority to offer this deal on behalf of your business.
                        </p>
                        {form.formState.errors.acceptTerms && (
                          <p className="text-sm text-red-500 mt-1">{form.formState.errors.acceptTerms.message}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="md:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Terms Preview</CardTitle>
                    <CardDescription>How your terms will appear to customers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-3 rounded-md text-sm">
                      {previewTerms ? (
                        previewTerms.split('\n').map((term, i) => (
                          <p key={i} className="mb-2">{term}</p>
                        ))
                      ) : (
                        <p className="text-muted-foreground italic">No terms selected yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div className="mt-6 flex justify-between">
              <Button type="button" variant="outline" onClick={() => setCurrentTab("basics")}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button type="button" onClick={() => setCurrentTab("preview")}>
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
          
          {/* Preview Tab */}
          <TabsContent value="preview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">Business View</h3>
                <DealPreview 
                  values={{
                    ...form.getValues(),
                    imageUrl: dealImage,
                    business: business
                  }}
                />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-4">Customer View</h3>
                <CustomerDealPreview 
                  values={{
                    ...form.getValues(),
                    imageUrl: dealImage,
                    business: business
                  }}
                />
              </div>
            </div>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Final Review</CardTitle>
                <CardDescription>Review your deal before submission</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    All required fields are complete
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    You've provided clear terms and conditions
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Deal dates are correctly set
                  </li>
                  {dealImage ? (
                    <li className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Deal image uploaded
                    </li>
                  ) : (
                    <li className="flex items-center text-sm">
                      <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                      Deal image (optional) is missing
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
            
            <Alert variant="warning" className="mb-8">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                After updating, your deal may need to be reviewed by our team before becoming active.
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setCurrentTab("terms")}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#00796B] hover:bg-[#005b4f]">
                {submitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span> Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" /> Update Deal
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}