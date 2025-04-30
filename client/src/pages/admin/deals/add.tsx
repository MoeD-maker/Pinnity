import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Calendar as CalendarIcon, ArrowLeft, Save, Eye, CheckCircle2, PlusCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AdminLayout from "@/components/admin/AdminLayout";

// Categories and deal types for selection
const CATEGORIES = [
  "Food & Drink",
  "Shopping",
  "Entertainment",
  "Services",
  "Health & Beauty",
  "Travel",
  "Home & Auto",
  "Other"
];

const DEAL_TYPES = [
  { id: "percent_off", label: "Percentage Off" },
  { id: "fixed_price", label: "Fixed Price" },
  { id: "bogo", label: "Buy One Get One" },
  { id: "free_gift", label: "Free Gift" },
  { id: "free_item", label: "Free Item" },
  { id: "other", label: "Other" }
];

// Standard terms that apply to all deals
const STANDARD_TERMS = [
  { id: "not_combinable", label: "Cannot be combined with any other offers or discounts" },
  { id: "one_per_customer", label: "Limit one per customer" },
  { id: "subject_to_availability", label: "Subject to availability" },
  { id: "tax_and_tip_excluded", label: "Tax and gratuity not included" },
  { id: "valid_only_at_location", label: "Valid only at participating locations" },
  { id: "management_right", label: "Management reserves the right to modify or cancel at any time" }
];

// Interface for business/vendor
interface Business {
  id: number;
  userId: number;
  businessName: string;
  businessCategory: string;
  verificationStatus: string;
  description?: string;
  address?: string;
  phone?: string;
  imageUrl?: string;
}

// Deal schema for form validation
const dealSchema = z.object({
  businessId: z.number({ required_error: 'Please select a vendor' }),
  otherBusinessName: z.string().optional(),
  title: z.string().min(5, { message: 'Title must be at least 5 characters' }).max(100),
  category: z.string({ required_error: 'Please select a category' }),
  description: z.string().min(20, { message: 'Description must be at least 20 characters' }).max(500),
  dealType: z.string({ required_error: 'Please select a deal type' }),
  discount: z.string().optional(),
  startDate: z.date({ required_error: 'Start date is required' }),
  endDate: z.date({ required_error: 'End date is required' }),
  maxRedemptionsPerUser: z.number().min(1).default(1),
  totalRedemptionsLimit: z.number().optional(),

  // Standard T&C checkboxes
  standardTerms: z.array(z.string()).default(STANDARD_TERMS.map(term => term.id)),
  // Additional custom terms
  customTerms: z.string().optional(),
  // The combined terms string that will be stored
  terms: z.string().optional(),
  
  redemptionCode: z.string().min(4, { message: 'Redemption code must be at least 4 characters' })
    .max(8, { message: 'Redemption code cannot exceed 8 characters' })
    .optional()
    .or(z.literal('')),
  redemptionInstructions: z.string().optional(),
  imageUrl: z.string().optional(),
  
  // New fields
  featured: z.boolean().default(false),
  requiresPin: z.boolean().default(true)
});

type DealFormValues = z.infer<typeof dealSchema>;

export default function AddDealPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState("basics");
  const [previewTerms, setPreviewTerms] = useState("");
  const [manualVendorEntry, setManualVendorEntry] = useState(false);

  // Fetch all vendors (both approved and pending for admin)
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['admin', 'vendors'],
    queryFn: async () => {
      try {
        // Try to get all vendors - both approved and pending
        const response = await apiRequest('/api/v1/admin/businesses');
        
        // Handle both array and object response formats
        let vendorsArray: Business[] = [];
        
        if (Array.isArray(response)) {
          vendorsArray = response;
        } else if (response && typeof response === 'object') {
          vendorsArray = Object.values(response);
        }
        
        // Filter for approved and pending businesses 
        return vendorsArray.filter(vendor => 
          vendor.verificationStatus === 'approved' || 
          vendor.verificationStatus === 'verified' || 
          vendor.verificationStatus === 'pending'
        );
      } catch (error) {
        console.error('Error fetching vendors:', error);
        return [];
      }
    }
  });

  // Set up form with default values
  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      businessId: undefined,
      otherBusinessName: "",
      title: "",
      category: "",
      description: "",
      dealType: "",
      discount: "",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      maxRedemptionsPerUser: 1,
      totalRedemptionsLimit: undefined, 
      standardTerms: STANDARD_TERMS.map(term => term.id),
      customTerms: "",
      terms: "",
      redemptionCode: "",
      redemptionInstructions: "",
      imageUrl: "",
      featured: false,
      requiresPin: true
    }
  });

  // Generate a random 5-digit PIN code for the deal
  const generateRandomPin = () => {
    const pin = Math.floor(10000 + Math.random() * 90000).toString();
    form.setValue("redemptionCode", pin);
  };

  // Handler to update preview terms when form values change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.includes('Terms') || name === 'customTerms') {
        updateTermsPreview();
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Function to update terms preview
  const updateTermsPreview = () => {
    const values = form.getValues();
    
    let termsText = "";

    // Add standard terms
    if (values.standardTerms && values.standardTerms.length > 0) {
      STANDARD_TERMS.forEach(term => {
        if (values.standardTerms.includes(term.id)) {
          termsText += `• ${term.label}\n`;
        }
      });
    }

    // Add custom terms
    if (values.customTerms) {
      termsText += values.customTerms;
    }

    setPreviewTerms(termsText);
    form.setValue("terms", termsText);
  };

  // Handle requiresPin toggle
  useEffect(() => {
    const { requiresPin } = form.watch();
    
    if (requiresPin && !form.getValues("redemptionCode")) {
      // Generate a PIN if one doesn't exist and the toggle is turned on
      generateRandomPin();
    } else if (!requiresPin) {
      // Clear PIN if toggle is turned off
      form.setValue("redemptionCode", "");
    }
  }, [form.watch("requiresPin")]);

  // Submit handler
  const onSubmit = async (data: DealFormValues) => {
    try {
      setSubmitting(true);
      
      console.log("=== FORM SUBMISSION DEBUG START ===");
      console.log("Current user in context:", user);

      // Combine all terms into a single string for storage
      updateTermsPreview();
      data.terms = previewTerms;

      // If using manual vendor entry, set a special placeholder businessId
      if (manualVendorEntry && data.otherBusinessName) {
        // Using -1 as special placeholder to indicate manual entry
        data.businessId = -1; 
        console.log("Using manual vendor entry with name:", data.otherBusinessName);
      } else {
        console.log("Using existing vendor with ID:", data.businessId);
      }

      console.log("Complete form data to be submitted:", JSON.stringify(data, null, 2));

      // Direct check of authentication
      const checkAuthResponse = await fetch('/api/v1/auth/check', {
        credentials: 'include'
      });
      console.log("Auth check response status:", checkAuthResponse.status);
      const authCheckData = await checkAuthResponse.json();
      console.log("Auth check response data:", authCheckData);

      // Use apiRequest which handles CSRF properly instead of direct fetch
      console.log("Using apiRequest helper to submit form...");
      try {
        // Use a direct fetch approach for debugging purposes
        console.log("Making direct fetch for debugging...");
        const directHeaders = new Headers();
        directHeaders.append('Content-Type', 'application/json');
        
        // Get a fresh CSRF token
        const csrfResponse = await fetch('/api/csrf-token', { 
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const csrfData = await csrfResponse.json();
        console.log("Got CSRF token for debugging:", csrfData.csrfToken);
        directHeaders.append('CSRF-Token', csrfData.csrfToken);
        
        const directResponse = await fetch('/api/v1/admin/deals', {
          method: 'POST',
          headers: directHeaders,
          credentials: 'include',
          body: JSON.stringify(data)
        });
        
        console.log("Direct fetch status:", directResponse.status);
        console.log("Direct fetch status text:", directResponse.statusText);
        
        // Convert headers to a plain object for logging
        const headerObj: Record<string, string> = {};
        directResponse.headers.forEach((value, key) => {
          headerObj[key] = value;
        });
        console.log("Direct fetch headers:", headerObj);
        
        const responseText = await directResponse.text();
        console.log("Raw response text length:", responseText.length);
        
        // Check if we got HTML instead of JSON
        if (responseText.includes('<!DOCTYPE')) {
          console.error("Received HTML response instead of JSON!");
          console.error("First 500 chars:", responseText.substring(0, 500));
          throw new Error("Received HTML page instead of JSON. This is likely a server or CSRF configuration issue.");
        }
        
        // Try to parse as JSON
        let jsonData;
        try {
          jsonData = JSON.parse(responseText);
          console.log("Successfully parsed JSON response:", jsonData);
        } catch (parseError) {
          console.error("Failed to parse response as JSON:", parseError);
          throw new Error("Server returned invalid JSON: " + responseText.substring(0, 100));
        }
        
        console.log("Deal created successfully:", jsonData);
        
        toast({
          title: "Success!",
          description: "Deal has been created successfully.",
          variant: "default"
        });
        
        return jsonData;
      } catch (directError) {
        console.error("Direct fetch approach failed:", directError);
        
        // Fall back to apiRequest helper as backup
        console.log("Falling back to apiRequest helper...");
        try {
          const response = await apiRequest(`/api/v1/admin/deals`, {
            method: 'POST',
            data
          });
          console.log("apiRequest response:", response);
          
          toast({
            title: "Success!",
            description: "Deal has been created successfully.",
            variant: "default"
          });
          
          return response;
        } catch (apiRequestError) {
          console.error("apiRequest approach also failed:", apiRequestError);
          
          // Show error to user
          toast({
            title: "Error",
            description: "Failed to create deal: " + (apiRequestError instanceof Error ? apiRequestError.message : "Unknown error"),
            variant: "destructive"
          });
          
          throw apiRequestError;
        }
      }

      // Invalidate queries to ensure admin dashboard shows the new deal
      try {
        import('@/lib/queryClient').then(({ queryClient }) => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'deals'] });
          queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
          console.log("Successfully invalidated queries");
        });
      } catch (invalidateError) {
        console.error("Failed to invalidate queries:", invalidateError);
      }
      
      // Navigate back to deals list
      setLocation("/admin/deals");
    } catch (error) {
      console.error("Error creating deal:", error);
      
      let errorMessage = "Failed to create deal. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container p-4 mx-auto">
        <Breadcrumb className="mb-6">
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/deals">Deals</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink>Create New Deal</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create New Deal</h1>
            <p className="text-muted-foreground">
              Add a new deal to the platform
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setLocation("/admin/deals")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Deals
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="basics">Deal Basics</TabsTrigger>
                <TabsTrigger value="terms">Terms & Availability</TabsTrigger>
                <TabsTrigger value="redemption">Redemption & Features</TabsTrigger>
              </TabsList>
              
              {/* Basics Tab */}
              <TabsContent value="basics" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Vendor Information</CardTitle>
                    <CardDescription>
                      Select the vendor this deal belongs to
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Switch 
                        id="vendor-toggle" 
                        checked={manualVendorEntry}
                        onCheckedChange={setManualVendorEntry}
                      />
                      <label 
                        htmlFor="vendor-toggle" 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Manual Vendor Entry
                      </label>
                    </div>

                    {!manualVendorEntry ? (
                      <FormField
                        control={form.control}
                        name="businessId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vendor</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))} 
                              defaultValue={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a vendor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {vendors.map((vendor) => (
                                  <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                    {vendor.businessName} 
                                    {vendor.verificationStatus === "pending" && 
                                      <span className="ml-2 text-yellow-500">(Pending)</span>
                                    }
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select the vendor this deal belongs to
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="otherBusinessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vendor Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter vendor name manually" {...field} />
                            </FormControl>
                            <FormDescription>
                              Enter the name of the vendor manually
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Deal Information</CardTitle>
                    <CardDescription>
                      Enter the basic information about this deal
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deal Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 20% Off Your First Purchase" {...field} />
                          </FormControl>
                          <FormDescription>
                            Keep it concise and attention-grabbing
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CATEGORIES.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Categorize your deal to help customers find it
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your deal in detail..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Provide a detailed description of what the deal offers
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dealType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deal Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a deal type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {DEAL_TYPES.map((type) => (
                                  <SelectItem key={type.id} value={type.id}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              The type of promotion you're offering
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="discount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount/Value</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 20%, $10 off, etc." {...field} />
                            </FormControl>
                            <FormDescription>
                              Specify the discount amount or value
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" type="button" onClick={() => setLocation("/admin/deals")}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={() => setCurrentTab("terms")}>
                      Next
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Terms & Availability Tab */}
              <TabsContent value="terms" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Deal Availability</CardTitle>
                    <CardDescription>
                      Set when the deal is valid and any redemption limits
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Start Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              When the deal becomes active
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>End Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => 
                                    date < new Date() || 
                                    (form.getValues("startDate") && date < form.getValues("startDate"))
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              When the deal expires
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="maxRedemptionsPerUser"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Redemptions Per User</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1} 
                                defaultValue={1}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormDescription>
                              How many times a single user can redeem this deal
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="totalRedemptionsLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Redemption Limit</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                min={1}
                                placeholder="No limit"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum number of total redemptions (leave empty for unlimited)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Terms & Conditions</CardTitle>
                    <CardDescription>
                      Define the terms and conditions for this deal
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="standardTerms"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Standard Terms</FormLabel>
                            <FormDescription>
                              Select standard terms that apply to this deal
                            </FormDescription>
                          </div>
                          <div className="space-y-2">
                            {STANDARD_TERMS.map((term) => (
                              <FormField
                                key={term.id}
                                control={form.control}
                                name="standardTerms"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={term.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(term.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, term.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== term.id
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {term.label}
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
                    
                    <FormField
                      control={form.control}
                      name="customTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Terms</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter any additional terms and conditions..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Add any specific terms or restrictions for this deal
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="mt-6 border rounded-md p-4 bg-muted/50">
                      <h3 className="text-sm font-medium mb-2">Terms Preview</h3>
                      <pre className="text-xs whitespace-pre-wrap">{previewTerms}</pre>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setCurrentTab("basics")}>
                      Previous
                    </Button>
                    <Button type="button" onClick={() => setCurrentTab("redemption")}>
                      Next
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Redemption Tab */}
              <TabsContent value="redemption" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Deal Features</CardTitle>
                    <CardDescription>
                      Configure special features for this deal
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="featured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Featured Deal</FormLabel>
                            <FormDescription>
                              Featured deals will be highlighted in the app and may appear on the homepage
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requiresPin"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Requires PIN</FormLabel>
                            <FormDescription>
                              If enabled, customers must enter a PIN code to redeem the deal. 
                              Only admins can create deals that don't require a PIN.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Redemption Details</CardTitle>
                    <CardDescription>
                      Configure how the deal can be redeemed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="redemptionCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Redemption PIN {form.watch("requiresPin") && "(Required)"}
                            </FormLabel>
                            <div className="flex space-x-2">
                              <FormControl>
                                <Input 
                                  placeholder="e.g., 12345"
                                  {...field}
                                  disabled={!form.watch("requiresPin")}
                                />
                              </FormControl>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={generateRandomPin}
                                disabled={!form.watch("requiresPin")}
                              >
                                Generate
                              </Button>
                            </div>
                            <FormDescription>
                              {form.watch("requiresPin") 
                                ? "PIN code that customers must enter to redeem the deal" 
                                : "No PIN needed for this deal (Admin-only feature)"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="redemptionInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Redemption Instructions</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter instructions for redeeming this deal..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Provide clear instructions on how to redeem the deal
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deal Image URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/image.jpg" {...field} />
                          </FormControl>
                          <FormDescription>
                            URL to an image representing this deal (optional)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setCurrentTab("terms")}>
                      Previous
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-background"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Create Deal
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
}