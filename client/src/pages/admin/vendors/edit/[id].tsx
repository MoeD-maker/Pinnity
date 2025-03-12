import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form schema
const businessFormSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  businessCategory: z.string().min(2, "Please select a category"),
  description: z.string().optional(),
  address: z.string().min(5, "Address must be at least 5 characters"),
  phone: z.string().min(5, "Phone number must be at least 5 characters"),
  email: z.string().email("Please enter a valid email"),
  websiteUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  socialLinks: z.object({
    instagram: z.string().optional().or(z.literal("")),
    facebook: z.string().optional().or(z.literal("")),
    twitter: z.string().optional().or(z.literal(""))
  }).optional()
});

type BusinessFormValues = z.infer<typeof businessFormSchema>;

// Business categories
const BUSINESS_CATEGORIES = [
  "Food & Drink",
  "Retail",
  "Entertainment",
  "Services",
  "Health & Beauty",
  "Travel",
  "Technology",
  "Education",
  "Other"
];

export default function VendorEditPage() {
  const [, params] = useRoute("/admin/vendors/edit/:id");
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Initialize form with default values
  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      businessName: "",
      businessCategory: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      websiteUrl: "",
      socialLinks: {
        instagram: "",
        facebook: "",
        twitter: ""
      }
    }
  });
  
  useEffect(() => {
    if (!params?.id) return;
    fetchBusinessData();
  }, []);
  
  const fetchBusinessData = async () => {
    if (!params?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch business data from API
      const response = await apiRequest(`/api/business/${params.id}`);
      
      if (response) {
        // Transform API response to match form structure
        const formData: BusinessFormValues = {
          businessName: response.businessName || "",
          businessCategory: response.businessCategory || "",
          description: response.description || "",
          address: response.address || "",
          phone: response.phone || "",
          email: response.user?.email || response.email || "",
          websiteUrl: response.websiteUrl || "",
          socialLinks: response.socialLinks || {
            instagram: "",
            facebook: "",
            twitter: ""
          }
        };
        
        // Reset form with fetched data
        form.reset(formData);
      } else {
        setError("Failed to load vendor data. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching business data:", error);
      setError("An error occurred while loading the vendor. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const onSubmit = async (data: BusinessFormValues) => {
    if (!params?.id) return;
    
    try {
      // Submit updated data to API
      await apiRequest(`/api/business/${params.id}`, {
        method: "PUT",
        data
      });
      
      toast({
        title: "Success",
        description: "Vendor information updated successfully"
      });
      
      // Navigate back to vendor details page
      navigate(`/admin/vendors/${params.id}`);
    } catch (error) {
      console.error("Error updating business:", error);
      toast({
        title: "Error",
        description: "Failed to update vendor information",
        variant: "destructive"
      });
    }
  };
  
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }
  
  if (error) {
    return (
      <AdminLayout>
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate(`/admin/vendors/${params?.id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Vendor
          </Button>
        </div>
        
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <Button onClick={() => fetchBusinessData()}>
          Try Again
        </Button>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="outline" onClick={() => navigate(`/admin/vendors/${params?.id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="ml-4 text-2xl font-bold">Edit Vendor</h1>
        </div>
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={form.formState.isSubmitting}
        >
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Edit the vendor's business details</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter business name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="businessCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Category</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BUSINESS_CATEGORIES.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Describe the business..." 
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a brief description of the business and what they offer.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Separator />
              
              <h3 className="text-lg font-semibold">Contact Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(555) 123-4567" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Business Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 Main St, Anytown, USA" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Separator />
              
              <h3 className="text-lg font-semibold">Online Presence</h3>
              
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com" />
                    </FormControl>
                    <FormDescription>
                      The business's website address (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="socialLinks.instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="@username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="socialLinks.facebook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="username or page name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="socialLinks.twitter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="@username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Hidden submit button for form validation */}
              <button type="submit" className="hidden" />
            </form>
          </Form>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}