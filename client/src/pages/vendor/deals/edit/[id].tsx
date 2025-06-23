import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
// Using input for dates instead of DatePicker due to component issues
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, CalendarIcon, UploadCloud, Trash, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { DealPreview } from '@/components/vendor/DealPreview';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Switch } from '@/components/ui/switch';

// Define the schema for deal form validation
const dealFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }).max(100, { message: "Title cannot exceed 100 characters" }),
  description: z.string().min(20, { message: "Description must be at least 20 characters" }).max(500, { message: "Description cannot exceed 500 characters" }),
  category: z.string().min(1, { message: "Please select a category" }),
  dealType: z.string().min(1, { message: "Please select a deal type" }),
  discount: z.string().min(1, { message: "Please provide discount details" }),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  terms: z.string().optional(),
  maxRedemptionsPerCustomer: z.coerce.number().int().min(1, { message: "Must allow at least 1 redemption per customer" }).default(1),
  redemptionCode: z.string().min(3, { message: "Redemption code must be at least 3 characters long" }).max(20, { message: "Redemption code cannot exceed 20 characters" }),
  redemptionInstructions: z.string().optional(),
  imageUrl: z.string().optional(),
  isLimited: z.boolean().default(false),
  maxRedemptions: z.coerce.number().int().optional(),
  isRecurring: z.boolean().default(false),
  recurringDays: z.array(z.number()).optional(),
  status: z.string().optional(),
}).refine(
  (data) => {
    return !data.isLimited || (data.isLimited && data.maxRedemptions && data.maxRedemptions >= 1);
  },
  {
    message: "Please specify the maximum number of redemptions",
    path: ["maxRedemptions"],
  }
).refine(
  (data) => {
    return !data.isRecurring || (data.isRecurring && data.recurringDays && data.recurringDays.length > 0);
  },
  {
    message: "Please select at least one day for recurring deals",
    path: ["recurringDays"],
  }
).refine(
  (data) => {
    return data.endDate >= data.startDate;
  },
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

export default function EditDealPage() {
  const { id } = useParams<{ id: string }>();
  const dealId = parseInt(id, 10);
  if (Number.isNaN(dealId)) {
    // If dealId is not a valid number, return an error
    return (
      <div className="container p-4 mx-auto max-w-6xl">
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Invalid Deal ID</h1>
            <p className="mb-4">The deal ID provided is not valid.</p>
            <Button onClick={() => window.location.href = '/vendor'}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dealStatus, setDealStatus] = useState<string>('');
  const [currentTab, setCurrentTab] = useState('basic');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [dealData, setDealData] = useState<any>(null);
  const [showApprovalWarning, setShowApprovalWarning] = useState(false);
  
  // Initialize form
  const form = useForm<z.infer<typeof dealFormSchema>>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      dealType: '',
      discount: '',
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 14)), // Default to 2 weeks from now
      terms: '',
      maxRedemptionsPerCustomer: 1,
      redemptionCode: '',
      redemptionInstructions: '',
      imageUrl: '',
      isLimited: false,
      maxRedemptions: undefined,
      isRecurring: false,
      recurringDays: [],
    },
  });
  
  // Watch form values for preview and validation
  const formValues = form.watch();
  
  // Fetch deal data when the component mounts
  useEffect(() => {
    async function fetchDealData() {
      try {
        setLoading(true);
        const data = await apiRequest(`/api/deals/${dealId}`);
        
        if (data) {
          // Store the original data for reference
          setDealData(data);
          setDealStatus(data.status || 'draft');
          
          // Format dates
          const startDate = data.startDate ? new Date(data.startDate) : new Date();
          const endDate = data.endDate ? new Date(data.endDate) : new Date(new Date().setDate(new Date().getDate() + 14));
          
          // Set image preview if available
          if (data.imageUrl) {
            setPreviewImage(data.imageUrl);
          }
          
          // Populate form with existing data
          form.reset({
            title: data.title || '',
            description: data.description || '',
            category: data.category || '',
            dealType: data.dealType || '',
            discount: data.discount || '',
            startDate,
            endDate,
            terms: data.terms || '',
            maxRedemptionsPerCustomer: data.maxRedemptionsPerCustomer || 1,
            redemptionCode: data.redemptionCode || '',
            redemptionInstructions: data.redemptionInstructions || '',
            imageUrl: data.imageUrl || '',
            isLimited: !!data.maxRedemptions,
            maxRedemptions: data.maxRedemptions || undefined,
            isRecurring: !!data.isRecurring,
            recurringDays: data.recurringDays || [],
            status: data.status || 'draft',
          });
          
          // Show approval warning for deals in approval process
          if (['pending', 'approved', 'active'].includes(data.status)) {
            setShowApprovalWarning(true);
          }
        } else {
          toast({
            title: "Deal not found",
            description: "The requested deal could not be loaded.",
            variant: "destructive",
          });
          setLocation('/vendor');
        }
      } catch (error) {
        console.error("Error fetching deal data:", error);
        toast({
          title: "Error",
          description: "There was a problem loading the deal. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchDealData();
  }, [dealId, setLocation, toast, form]);
  
  // Validate recurring days selection
  const validateRecurringDays = () => {
    if (formValues.isRecurring && (!formValues.recurringDays || formValues.recurringDays.length === 0)) {
      return "Please select at least one day for recurring deals";
    }
    return true;
  };
  
  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Create a preview URL
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
      setImageFile(file);
      
      // Update the form with the new image URL (temp for preview)
      form.setValue('imageUrl', 'uploading...');
    }
  };
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof dealFormSchema>) => {
    try {
      setSubmitting(true);
      
      let finalValues = { ...values };
      
      // Handle image upload first if there's a new image
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        // Upload the image
        const uploadResponse = await apiRequest('/api/uploads/deal-image', {
          method: 'POST',
          body: formData,
          headers: {
            // No Content-Type header for multipart/form-data, browser sets it automatically
          },
          // Specify raw response since we're dealing with FormData
          rawResponse: true,
        });
        
        if (uploadResponse && uploadResponse.imageUrl) {
          finalValues.imageUrl = uploadResponse.imageUrl;
        } else {
          throw new Error("Image upload failed");
        }
      }
      
      // Only include maxRedemptions if isLimited is true
      if (!finalValues.isLimited) {
        finalValues.maxRedemptions = undefined;
      }
      
      // Only include recurringDays if isRecurring is true
      if (!finalValues.isRecurring) {
        finalValues.recurringDays = [];
      }
      
      // Prepare the deal update payload
      const updatePayload = {
        title: finalValues.title,
        description: finalValues.description,
        category: finalValues.category,
        dealType: finalValues.dealType,
        discount: finalValues.discount,
        startDate: finalValues.startDate,
        endDate: finalValues.endDate,
        terms: finalValues.terms,
        maxRedemptionsPerCustomer: finalValues.maxRedemptionsPerCustomer,
        redemptionCode: finalValues.redemptionCode,
        redemptionInstructions: finalValues.redemptionInstructions,
        imageUrl: finalValues.imageUrl || previewImage,
        maxRedemptions: finalValues.isLimited ? finalValues.maxRedemptions : null,
        isRecurring: finalValues.isRecurring,
        recurringDays: finalValues.isRecurring ? finalValues.recurringDays : [],
      };
      
      // Preserve status if it's already in a special state
      if (dealStatus !== 'draft') {
        // If deal was rejected or revision requested, update status to pending
        if (dealStatus === 'rejected' || dealStatus === 'pending_revision') {
          // When resubmitting after rejection/revision, set back to pending
          updatePayload.status = 'pending';
        }
      }
      
      // Update the deal
      const updatedDeal = await apiRequest(`/api/deals/${dealId}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload),
      });
      
      if (updatedDeal) {
        // Invalidate any cached deal data to ensure fresh data is fetched
        queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
        queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
        queryClient.invalidateQueries({ queryKey: ['/api/business'] });
        
        toast({
          title: "Deal updated",
          description: "Your deal has been successfully updated.",
        });
        
        // Navigate back to vendor dashboard or stay on edit page depending on status
        if (dealStatus === 'rejected' || dealStatus === 'pending_revision') {
          // If we just resubmitted a rejected/revision deal, go back to dashboard
          setLocation('/vendor');
        } else {
          // Reset the form with the new values to prevent unsaved changes warnings
          form.reset(form.getValues());
          
          // Refresh the deal data
          const refreshedData = await apiRequest(`/api/deals/${dealId}`);
          if (refreshedData) {
            setDealData(refreshedData);
            setDealStatus(refreshedData.status || 'draft');
          }
        }
      }
    } catch (error) {
      console.error("Error updating deal:", error);
      toast({
        title: "Update failed",
        description: "There was a problem updating your deal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle deal deletion
  const handleDeleteDeal = async () => {
    try {
      setSubmitting(true);
      
      await apiRequest(`/api/deals/${dealId}`, {
        method: 'DELETE',
      });
      
      // Invalidate queries to update the UI
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/business'] });
      
      toast({
        title: "Deal deleted",
        description: "Your deal has been successfully deleted.",
      });
      
      // Navigate back to vendor dashboard
      setLocation('/vendor');
    } catch (error) {
      console.error("Error deleting deal:", error);
      toast({
        title: "Delete failed",
        description: "There was a problem deleting your deal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setDeleteDialogOpen(false);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B]"></div>
      </div>
    );
  }
  
  // Get status badge variant
  const getStatusBadge = () => {
    const statusMap: Record<string, string> = {
      'draft': 'bg-gray-100 text-gray-700 border-gray-200',
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'active': 'bg-green-100 text-green-800 border-green-200',
      'approved': 'bg-green-100 text-green-800 border-green-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200',
      'pending_revision': 'bg-orange-100 text-orange-800 border-orange-200',
      'expired': 'bg-gray-100 text-gray-700 border-gray-200'
    };
    
    return statusMap[dealStatus] || 'bg-gray-100 text-gray-700 border-gray-200';
  };
  
  // Format status text
  const getStatusText = () => {
    const statusTextMap: Record<string, string> = {
      'draft': 'Draft',
      'pending': 'Pending Approval',
      'active': 'Active',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'pending_revision': 'Revision Requested',
      'expired': 'Expired'
    };
    
    return statusTextMap[dealStatus] || 'Unknown';
  };
  
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
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Edit Deal</h1>
          <div className="flex items-center mt-2">
            <Badge className={getStatusBadge()}>
              {getStatusText()}
            </Badge>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="ghost" onClick={() => setLocation('/vendor')} disabled={submitting}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={submitting}>
                <Trash className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the deal
                  and remove the data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteDeal} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {/* Status alerts for deals with special statuses */}
      {dealStatus === 'pending' && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <Info className="h-4 w-4 text-yellow-700" />
          <AlertDescription className="text-yellow-700">
            <p>This deal is currently under review by our team. Any changes you make will reset the approval process.</p>
          </AlertDescription>
        </Alert>
      )}
      
      {dealStatus === 'rejected' && dealData?.rejectionReason && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-700" />
          <AlertDescription className="text-red-700">
            <p className="font-medium">Your deal was rejected for the following reason:</p>
            <p className="mt-1">{dealData.rejectionReason}</p>
            <p className="mt-2">Please make the necessary changes and resubmit.</p>
          </AlertDescription>
        </Alert>
      )}
      
      {dealStatus === 'pending_revision' && dealData?.revisionNotes && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <Info className="h-4 w-4 text-orange-700" />
          <AlertDescription className="text-orange-700">
            <p className="font-medium">Our team has requested the following revisions:</p>
            <p className="mt-1">{dealData.revisionNotes}</p>
            <p className="mt-2">Please update your deal and resubmit for approval.</p>
          </AlertDescription>
        </Alert>
      )}
      
      {dealStatus === 'approved' && dealData && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <Info className="h-4 w-4 text-green-700" />
          <AlertDescription className="text-green-700">
            <p>This deal has been approved. Any significant changes will require re-approval.</p>
          </AlertDescription>
        </Alert>
      )}
      
      {showApprovalWarning && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-700" />
          <AlertDescription className="text-blue-700">
            <p>Making changes to this deal will require it to go through the approval process again. Your changes will be saved as a draft until approved.</p>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Deal Information</CardTitle>
              <CardDescription>Update your deal details below</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="redemption">Redemption</TabsTrigger>
                </TabsList>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Info Tab */}
                    <TabsContent value="basic" className="space-y-4 mt-0">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deal Title*</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 20% Off All Pizzas" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description*</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe your deal" 
                                className="min-h-[120px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Provide a clear description of what customers will get.
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
                            <FormLabel>Category*</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="food">Food & Dining</SelectItem>
                                <SelectItem value="retail">Retail</SelectItem>
                                <SelectItem value="beauty">Beauty & Wellness</SelectItem>
                                <SelectItem value="entertainment">Entertainment</SelectItem>
                                <SelectItem value="fitness">Fitness</SelectItem>
                                <SelectItem value="travel">Travel</SelectItem>
                                <SelectItem value="services">Services</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
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
                              <FormLabel>Deal Type*</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select deal type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="percentage_off">Percentage Off</SelectItem>
                                  <SelectItem value="fixed_amount">Fixed Amount Off</SelectItem>
                                  <SelectItem value="buy_one_get_one">Buy One Get One</SelectItem>
                                  <SelectItem value="free_item">Free Item</SelectItem>
                                  <SelectItem value="special_price">Special Price</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="discount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount Details*</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={
                                    formValues.dealType === 'percentage_off' ? 'e.g. 20% off' :
                                    formValues.dealType === 'fixed_amount' ? 'e.g. $10 off' :
                                    formValues.dealType === 'buy_one_get_one' ? 'e.g. Buy 1 Get 1 Free' :
                                    formValues.dealType === 'free_item' ? 'e.g. Free Appetizer' :
                                    formValues.dealType === 'special_price' ? 'e.g. Only $9.99' :
                                    'Discount details'
                                  } 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Start Date*</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                  onChange={(e) => {
                                    const date = e.target.value ? new Date(e.target.value) : new Date();
                                    field.onChange(date);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>End Date*</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                  onChange={(e) => {
                                    const date = e.target.value ? new Date(e.target.value) : new Date();
                                    field.onChange(date);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="border rounded-md p-4">
                        <FormField
                          control={form.control}
                          name="imageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Deal Image</FormLabel>
                              <FormControl>
                                <div className="space-y-4">
                                  {previewImage && (
                                    <div className="relative aspect-video w-full overflow-hidden rounded-md border border-dashed">
                                      <img 
                                        src={previewImage} 
                                        alt="Deal preview" 
                                        className="h-full w-full object-cover" 
                                      />
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-center">
                                    <label htmlFor="deal-image" className="cursor-pointer">
                                      <div className="flex items-center justify-center rounded-md border border-dashed px-3 py-2 text-sm hover:bg-accent">
                                        <UploadCloud className="mr-2 h-4 w-4" />
                                        <span>{previewImage ? 'Change Image' : 'Upload Image'}</span>
                                      </div>
                                      <input
                                        id="deal-image"
                                        type="file"
                                        accept="image/*"
                                        className="sr-only"
                                        onChange={handleImageChange}
                                      />
                                    </label>
                                  </div>
                                </div>
                              </FormControl>
                              <FormDescription>
                                Recommended size: 1200x630 pixels. JPG or PNG format.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={() => setCurrentTab('details')}
                          className="ml-auto"
                        >
                          Next: Details
                        </Button>
                      </div>
                    </TabsContent>
                    
                    {/* Details Tab */}
                    <TabsContent value="details" className="space-y-4 mt-0">
                      <FormField
                        control={form.control}
                        name="terms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Terms & Conditions</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter terms and conditions" 
                                className="min-h-[120px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Specify any limitations, restrictions, or important information about your deal.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="isLimited"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Limited Quantity
                              </FormLabel>
                              <FormDescription>
                                Set a maximum number of times this deal can be redeemed.
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
                      
                      {formValues.isLimited && (
                        <FormField
                          control={form.control}
                          name="maxRedemptions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum Redemptions</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="e.g. 100"
                                  {...field}
                                  value={field.value === undefined ? '' : field.value}
                                  onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormDescription>
                                How many times can this deal be redeemed in total?
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <FormField
                        control={form.control}
                        name="isRecurring"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Recurring Deal
                              </FormLabel>
                              <FormDescription>
                                Is this deal only available on specific days of the week?
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
                      
                      {formValues.isRecurring && (
                        <FormField
                          control={form.control}
                          name="recurringDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Available Days</FormLabel>
                              <FormDescription>
                                Select the days when this deal is available.
                              </FormDescription>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                                  <Toggle
                                    key={day}
                                    pressed={field.value?.includes(index)}
                                    onPressedChange={(pressed) => {
                                      const currentDays = field.value || [];
                                      const newDays = pressed
                                        ? [...currentDays, index]
                                        : currentDays.filter((d) => d !== index);
                                      field.onChange(newDays);
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="data-[state=on]:bg-primary data-[state=on]:text-white"
                                  >
                                    {day.slice(0, 3)}
                                  </Toggle>
                                ))}
                              </div>
                              <FormMessage className="mt-2" />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <div className="flex justify-between">
                        <Button
                          type="button"
                          onClick={() => setCurrentTab('basic')}
                          variant="outline"
                        >
                          Previous: Basic Info
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setCurrentTab('redemption')}
                        >
                          Next: Redemption
                        </Button>
                      </div>
                    </TabsContent>
                    
                    {/* Redemption Tab */}
                    <TabsContent value="redemption" className="space-y-4 mt-0">
                      <FormField
                        control={form.control}
                        name="redemptionCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Redemption Code*</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. SUMMER2023" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Create a code customers can provide when redeeming in-store.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="maxRedemptionsPerCustomer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Redemptions Per Customer*</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                placeholder="e.g. 1"
                                {...field}
                                value={field.value}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              How many times can a single customer redeem this deal?
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
                                placeholder="e.g. Show this code to the cashier when ordering" 
                                className="min-h-[80px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Provide clear instructions on how customers should redeem this deal.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-between">
                        <Button
                          type="button"
                          onClick={() => setCurrentTab('details')}
                          variant="outline"
                        >
                          Previous: Details
                        </Button>
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="ml-auto"
                        >
                          {submitting ? (
                            <>
                              <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" /> 
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                  </form>
                </Form>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Preview Card */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Deal Preview</CardTitle>
              <CardDescription>
                How your deal will appear to customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DealPreview 
                title={formValues.title || "Deal Title"}
                description={formValues.description || "Deal description will appear here."}
                imageUrl={previewImage || undefined}
                discount={formValues.discount || "Discount"}
                business={dealData?.business || { businessName: "Your Business" }}
                startDate={formValues.startDate}
                endDate={formValues.endDate}
                dealType={formValues.dealType || "percentage_off"}
                category={formValues.category || "food"}
                isPreview
              />
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              <p>This is a preview of how your deal will appear in the app.</p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}