import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useParams, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

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
import { AlertCircle, Calendar as CalendarIcon, ArrowLeft, Save, Eye, CheckCircle2 } from "lucide-react";
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
  { id: "other", label: "Other" }
];

// Standard terms that apply to all deals
const STANDARD_TERMS = [
  { id: "not_combinable", label: "Cannot be combined with other offers" },
  { id: "one_per_customer", label: "Limit one per customer" },
  { id: "subject_to_availability", label: "Subject to availability" },
  { id: "tax_and_tip_excluded", label: "Tax and gratuity not included" }
];

// Deal schema for form validation
const dealSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters' }).max(100),
  category: z.string({ required_error: 'Please select a category' }),
  description: z.string().min(20, { message: 'Description must be at least 20 characters' }).max(500),
  dealType: z.string({ required_error: 'Please select a deal type' }),
  discount: z.string().optional(),
  startDate: z.date({ required_error: 'Start date is required' }),
  endDate: z.date({ required_error: 'End date is required' }),
  maxRedemptionsPerCustomer: z.number().min(1).default(1),

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
  // No need for acceptTerms on edit page
  featured: z.boolean().default(false)
});

type DealFormValues = z.infer<typeof dealSchema>;

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
      standardTerms: STANDARD_TERMS.map(term => term.id),
      dealTypeTerms: [],
      customTerms: "",
      terms: "",
      redemptionCode: "",
      redemptionInstructions: "",
      imageUrl: "",
      featured: false
    }
  });

  // Fetch the deal data
  useEffect(() => {
    async function fetchDeal() {
      try {
        setLoading(true);
        const response = await apiRequest({
          url: `/api/deals/${dealId}`,
          method: 'GET'
        });

        if (response) {
          // Format dates for form
          const startDate = new Date(response.startDate);
          const endDate = new Date(response.endDate);

          // Extract standard terms
          const terms = response.terms || "";
          const standardTermsSelected = STANDARD_TERMS
            .filter(term => terms.includes(term.label))
            .map(term => term.id);

          // Reset form with fetched values
          form.reset({
            title: response.title,
            category: response.category,
            description: response.description,
            dealType: response.dealType,
            discount: response.discount || "",
            startDate,
            endDate,
            maxRedemptionsPerCustomer: response.maxRedemptionsPerCustomer || 1,
            standardTerms: standardTermsSelected,
            dealTypeTerms: [],
            customTerms: terms, // Store full terms in custom area for editing
            terms: response.terms,
            redemptionCode: response.redemptionCode || "",
            redemptionInstructions: response.redemptionInstructions || "",
            imageUrl: response.imageUrl || "",
            featured: response.featured || false
          });

          setPreviewTerms(terms);
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

    if (dealId) {
      fetchDeal();
    }
  }, [dealId, toast, form]);

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

  // Submit handler
  const onSubmit = async (data: DealFormValues) => {
    try {
      setSubmitting(true);

      // Combine all terms into a single string for storage
      updateTermsPreview();
      data.terms = previewTerms;

      // Submit to API
      await apiRequest({
        url: `/api/deals/${dealId}`,
        method: 'PUT',
        data
      });

      toast({
        title: "Success!",
        description: "Deal has been updated successfully.",
        variant: "default"
      });

      // Navigate back to deals list
      setLocation("/admin/deals");
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
            <BreadcrumbLink>Edit Deal</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Deal</h1>
            <p className="text-muted-foreground">
              Update details for this deal
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

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading deal data...</p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                <TabsList className="grid grid-cols-3 mb-6">
                  <TabsTrigger value="basics">Deal Basics</TabsTrigger>
                  <TabsTrigger value="terms">Terms & Availability</TabsTrigger>
                  <TabsTrigger value="redemption">Redemption</TabsTrigger>
                </TabsList>
                
                {/* Basics Tab */}
                <TabsContent value="basics" className="space-y-6">
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
                              Provide a URL for an image that represents this deal
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="featured"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Feature this deal
                              </FormLabel>
                              <FormDescription>
                                Featured deals appear prominently on the homepage and in search results
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button 
                        variant="outline" 
                        onClick={() => setLocation("/admin/deals")}
                      >
                        Cancel
                      </Button>
                      <Button type="button" onClick={() => setCurrentTab("terms")}>
                        Next: Terms & Availability
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                {/* Terms & Availability Tab */}
                <TabsContent value="terms" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Terms & Availability</CardTitle>
                      <CardDescription>
                        Define when this deal is available and any restrictions
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
                                    disabled={(date) => date < new Date("1900-01-01")}
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
                                      date < new Date("1900-01-01") ||
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
                      
                      <FormField
                        control={form.control}
                        name="maxRedemptionsPerCustomer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Redemptions Per Customer</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              How many times a single customer can redeem this deal
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium mb-3">Standard Terms</h3>
                          <div className="space-y-2">
                            <FormField
                              control={form.control}
                              name="standardTerms"
                              render={() => (
                                <FormItem>
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
                                            <FormLabel className="text-sm font-normal">
                                              {term.label}
                                            </FormLabel>
                                          </FormItem>
                                        )
                                      }}
                                    />
                                  ))}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="customTerms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Terms & Conditions</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter any additional terms specific to this deal..."
                                className="min-h-[120px]"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Specify any additional terms or restrictions
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="p-4 border rounded-md">
                        <h3 className="font-medium mb-2">Terms Preview</h3>
                        <div className="text-sm whitespace-pre-line">
                          {previewTerms || "No terms specified"}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => setCurrentTab("basics")}>
                        Back
                      </Button>
                      <Button type="button" onClick={() => setCurrentTab("redemption")}>
                        Next: Redemption
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                {/* Redemption Tab */}
                <TabsContent value="redemption" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Redemption Details</CardTitle>
                      <CardDescription>
                        Define how customers will redeem this deal
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="redemptionCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Redemption Code</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., SAVE20" {...field} />
                            </FormControl>
                            <FormDescription>
                              A unique code customers will use to redeem this deal (4-8 characters)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="redemptionInstructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Redemption Instructions</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Explain how customers should redeem this deal..."
                                className="min-h-[120px]"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Give clear instructions for how the redemption process works
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Redemption Process</AlertTitle>
                        <AlertDescription>
                          Customers will use this code when they visit your business. Your staff will verify the code before providing the discount.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => setCurrentTab("terms")}>
                        Back
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Update Deal
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
            </form>
          </Form>
        )}
      </div>
    </AdminLayout>
  );
}