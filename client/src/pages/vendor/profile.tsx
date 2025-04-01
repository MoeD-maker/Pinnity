import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Check, 
  FileText, 
  Image, 
  Instagram, 
  MapPin, 
  Phone, 
  Save, 
  Upload,
  Facebook,
  Twitter,
  Globe,
  Info,
  Clock
} from 'lucide-react';
import PasswordChangeForm from '@/components/profile/PasswordChangeForm';
import ImageUploadWithCropper from '@/components/shared/ImageUploadWithCropper';

// Form schema for business profile
const businessProfileSchema = z.object({
  businessName: z.string().min(2, { message: 'Business name is required' }),
  businessCategory: z.string(),
  description: z.string().min(10, { message: 'Description must be at least 10 characters' }).max(500),
  address: z.string().min(5, { message: 'Address is required' }),
  phone: z.string().min(5, { message: 'Phone number is required' }),
  website: z.string().optional(),
  instagramUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  twitterUrl: z.string().optional()
});

type BusinessProfileFormValues = z.infer<typeof businessProfileSchema>;

// Days for business hours
const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export default function VendorProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Business hours state
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  
  // Form for business profile
  const form = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      businessName: '',
      businessCategory: '',
      description: '',
      address: '',
      phone: '',
      website: '',
      instagramUrl: '',
      facebookUrl: '',
      twitterUrl: ''
    }
  });
  
  // Fetch business data on component mount
  useEffect(() => {
    async function fetchBusinessData() {
      if (user?.id) {
        try {
          const businessResponse = await apiRequest(`/api/business/user/${user.id}`);
          
          if (businessResponse) {
            setBusiness(businessResponse);
            
            // Set form values
            form.reset({
              businessName: businessResponse.businessName || '',
              businessCategory: businessResponse.businessCategory || '',
              description: businessResponse.description || '',
              address: businessResponse.address || '',
              phone: businessResponse.phone || '',
              website: businessResponse.website || '',
              instagramUrl: businessResponse.socialLinks?.instagram || '',
              facebookUrl: businessResponse.socialLinks?.facebook || '',
              twitterUrl: businessResponse.socialLinks?.twitter || ''
            });
            
            // Set preview image if exists
            if (businessResponse.imageUrl) {
              setPreviewUrl(businessResponse.imageUrl);
            }
            
            // Fetch business hours if needed
            // This would be implemented if we had the API ready
            const mockBusinessHours = [
              { id: 1, dayOfWeek: 0, openTime: '09:00', closeTime: '17:00', isClosed: false },
              { id: 2, dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: false },
              { id: 3, dayOfWeek: 2, openTime: '09:00', closeTime: '17:00', isClosed: false },
              { id: 4, dayOfWeek: 3, openTime: '09:00', closeTime: '17:00', isClosed: false },
              { id: 5, dayOfWeek: 4, openTime: '09:00', closeTime: '17:00', isClosed: false },
              { id: 6, dayOfWeek: 5, openTime: '10:00', closeTime: '15:00', isClosed: false },
              { id: 7, dayOfWeek: 6, openTime: '00:00', closeTime: '00:00', isClosed: true },
            ];
            setBusinessHours(mockBusinessHours);
          }
        } catch (error) {
          console.error('Error fetching business data:', error);
          toast({
            title: 'Error',
            description: 'Failed to load business profile',
            variant: 'destructive'
          });
        } finally {
          setLoading(false);
        }
      }
    }
    
    fetchBusinessData();
  }, [user, form, toast]);
  
  // Handle processed image after cropping with enhanced error handling and compression
  const handleProcessedImage = (croppedImageData: string | null) => {
    if (croppedImageData) {
      try {
        // Validate the image data format
        if (!croppedImageData.startsWith('data:image/')) {
          throw new Error('Invalid image data format');
        }
        
        // Set the preview immediately for better UX
        setPreviewUrl(croppedImageData);
        
        // Compress the image to solve "payload too large" issues
        const compressImage = async (imageData: string) => {
          try {
            // Create a new image for compression
            const img = new Image();
            img.onload = () => {
              // Create a canvas to draw and compress the image
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              // Set canvas size to the image dimensions
              canvas.width = img.width;
              canvas.height = img.height;
              
              if (ctx) {
                // Draw the image onto the canvas
                ctx.drawImage(img, 0, 0, img.width, img.height);
                
                // Compress the image to JPEG with moderate quality
                const compressedImage = canvas.toDataURL('image/jpeg', 0.7);
                
                // Convert compressed base64 to a File object
                const base64Response = compressedImage.split(',')[1];
                if (!base64Response) {
                  throw new Error('Invalid compressed base64 data');
                }
                
                const binaryString = window.atob(base64Response);
                const bytes = new Uint8Array(binaryString.length);
                
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                
                const blob = new Blob([bytes], { type: 'image/jpeg' });
                const file = new File([blob], "logo.jpg", { type: "image/jpeg" });
                setSelectedFile(file);
                
                console.log("Successfully processed and compressed image, size:", file.size, "bytes");
              }
            };
            img.src = imageData;
          } catch (err) {
            console.error("Error compressing image:", err);
            // Fall back to the original method if compression fails
            fallbackProcessing(imageData);
          }
        };
        
        // Fallback method if compression fails
        const fallbackProcessing = (imageData: string) => {
          const base64Response = imageData.split(',')[1];
          if (!base64Response) {
            throw new Error('Invalid base64 data');
          }
          
          const binaryString = window.atob(base64Response);
          const bytes = new Uint8Array(binaryString.length);
          
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const blob = new Blob([bytes], { type: 'image/jpeg' });
          const file = new File([blob], "logo.jpg", { type: "image/jpeg" });
          setSelectedFile(file);
        };
        
        // Start the compression process
        compressImage(croppedImageData);
      } catch (err) {
        console.error("Error processing cropped image:", err);
        toast({
          title: 'Image Processing Error',
          description: 'Failed to process the image. Please try again with a different image.',
          variant: 'destructive'
        });
        
        // Clear the preview if processing failed
        setPreviewUrl(null);
        setSelectedFile(null);
      }
    } else {
      // User removed the image
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  };
  
  // Handle form submission
  const onSubmit = async (data: BusinessProfileFormValues) => {
    if (!business) return;
    
    setSaving(true);
    try {
      // First, prepare the business update data
      const updateData = {
        businessName: data.businessName,
        businessCategory: data.businessCategory,
        description: data.description,
        address: data.address,
        phone: data.phone,
        website: data.website,
        socialLinks: {
          instagram: data.instagramUrl,
          facebook: data.facebookUrl,
          twitter: data.twitterUrl
        },
        // Preserve the existing image URL if we're not uploading a new one
        imageUrl: business.imageUrl || null
      };
      
      let imageUrl = business.imageUrl;
      
      // Handle image upload if there's a new file selected
      if (selectedFile) {
        try {
          console.log('Uploading image:', selectedFile.name);
          
          // Create FormData for the image upload
          const formData = new FormData();
          formData.append('logo', selectedFile);
          
          // Simulate uploading the image - this would normally go to a dedicated upload endpoint
          // For testing, we'll use a base64 encoded string to simulate an uploaded image
          const reader = new FileReader();
          
          // Use a promise to handle the async FileReader
          const imageBase64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(selectedFile);
          });
          
          // For now, we can include the base64 image directly in our update data
          // This is not ideal for production as it can make the request large,
          // but for demo purposes it's a way to make the image upload work
          updateData.imageUrl = imageBase64;
          
          // In a proper implementation, we would first upload the image to a server/storage
          // and then get back the URL to include in our update data
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          toast({
            title: 'Image Upload Failed',
            description: 'Could not upload your image. Please try again.',
            variant: 'destructive'
          });
          // Continue with the update without the image
        }
      }
      
      console.log('Updating business with data:', {
        ...updateData,
        imageUrl: updateData.imageUrl ? 'base64 image data (truncated)' : 'No image update'
      });
      
      // Update business profile
      await apiRequest(`/api/business/${business.id}`, {
        method: 'PUT',
        data: updateData
      });
      
      toast({
        title: 'Success',
        description: 'Business profile updated successfully',
        variant: 'default'
      });
      
      // Refresh business data
      const updatedBusiness = await apiRequest(`/api/business/user/${user?.id}`);
      setBusiness(updatedBusiness);
      
      // Clear selected file after successful update
      setSelectedFile(null);
      
      // Update preview URL with new image URL if it was updated
      if (updatedBusiness.imageUrl) {
        setPreviewUrl(updatedBusiness.imageUrl);
      }
      
    } catch (error) {
      console.error('Error updating business profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update business profile',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
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
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Business Profile</h1>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General Information</TabsTrigger>
          <TabsTrigger value="hours">Business Hours</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="documents">Verification Documents</TabsTrigger>
          <TabsTrigger value="security">Account Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                  Update your business details visible to customers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name <span className="text-red-500">*</span></Label>
                    <Input 
                      id="businessName" 
                      {...form.register('businessName')}
                    />
                    {form.formState.errors.businessName && (
                      <p className="text-sm text-red-500">{form.formState.errors.businessName.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessCategory">Business Category <span className="text-red-500">*</span></Label>
                    <Input 
                      id="businessCategory" 
                      {...form.register('businessCategory')}
                    />
                    {form.formState.errors.businessCategory && (
                      <p className="text-sm text-red-500">{form.formState.errors.businessCategory.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                    <Input 
                      id="phone" 
                      {...form.register('phone')}
                    />
                    {form.formState.errors.phone && (
                      <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input 
                      id="website" 
                      placeholder="https://..." 
                      {...form.register('website')}
                    />
                    {form.formState.errors.website && (
                      <p className="text-sm text-red-500">{form.formState.errors.website.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
                  <Input 
                    id="address" 
                    {...form.register('address')}
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-red-500">{form.formState.errors.address.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Business Description <span className="text-red-500">*</span></Label>
                  <Textarea 
                    id="description" 
                    rows={4}
                    {...form.register('description')}
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
                  )}
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Describe your business to customers</span>
                    <span>{form.watch('description')?.length || 0}/500</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <Label>Business Logo/Image</Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ImageUploadWithCropper
                      onImageChange={handleProcessedImage}
                      currentImage={previewUrl}
                      aspectRatio={1}
                      buttonText="Upload Business Logo"
                      className="w-full"
                      imageClassName="w-full h-40 object-cover rounded-md"
                      maxSizeKB={5000}
                      minWidth={300}
                      minHeight={300}
                      recommendedWidth={500}
                      recommendedHeight={500}
                      imageType="logo"
                      cropShape="rect"
                    />
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Logo Guidelines</h3>
                      <ul className="text-xs text-gray-500 space-y-1 list-disc pl-4">
                        <li>Upload a clear, high-quality image of your business logo</li>
                        <li>Square format works best (1:1 aspect ratio)</li>
                        <li>Minimum recommended size: 500×500 pixels</li>
                        <li>Maximum file size: 5MB</li>
                        <li>Supported formats: JPG, PNG, GIF</li>
                      </ul>
                      <p className="text-xs text-gray-500 mt-2">
                        Your logo will be displayed in various sizes throughout the app,
                        so make sure it looks good when scaled down.
                      </p>
                    </div>
                  </div>
                </div>
                
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-blue-700">
                    Your business profile will be visible to customers in the Pinnity app. Make sure your information is accurate.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="border-t pt-6 flex justify-between">
                <div>
                  {business?.verificationStatus && (
                    <Badge className={`${business.verificationStatus === 'verified' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                      {business.verificationStatus === 'verified' ? 'Verified Business' : 'Pending Verification'}
                    </Badge>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="bg-[#00796B] hover:bg-[#004D40]"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                  {!saving && <Save className="w-4 h-4 ml-2" />}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>
        
        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
              <CardDescription>
                Set your regular business hours to help customers know when they can visit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DAYS_OF_WEEK.map((day, index) => (
                  <div key={day} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="w-1/3">
                      <Label>{day}</Label>
                    </div>
                    
                    {businessHours.find(h => h.dayOfWeek === index)?.isClosed ? (
                      <div className="flex-1 text-center">
                        <Badge variant="outline" className="bg-gray-50 text-gray-700">Closed</Badge>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center space-x-2">
                        <Input 
                          type="time"
                          value={businessHours.find(h => h.dayOfWeek === index)?.openTime || ''}
                          onChange={() => {}}
                          className="w-32"
                        />
                        <span>to</span>
                        <Input 
                          type="time"
                          value={businessHours.find(h => h.dayOfWeek === index)?.closeTime || ''}
                          onChange={() => {}}
                          className="w-32"
                        />
                      </div>
                    )}
                    
                    <div className="ml-4">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <div className="flex justify-end w-full">
                <Button className="bg-[#00796B] hover:bg-[#004D40]">
                  Save Hours
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>
                Connect your social media profiles to your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center">
                  <Globe className="w-4 h-4 mr-2 text-[#00796B]" />
                  Website
                </Label>
                <Input 
                  id="website" 
                  placeholder="https://..." 
                  {...form.register('website')}
                />
                <p className="text-xs text-gray-500">
                  Your main business website
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instagramUrl" className="flex items-center">
                  <Instagram className="w-4 h-4 mr-2 text-[#E1306C]" />
                  Instagram
                </Label>
                <Input 
                  id="instagramUrl" 
                  placeholder="https://instagram.com/yourbusiness" 
                  {...form.register('instagramUrl')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="facebookUrl" className="flex items-center">
                  <Facebook className="w-4 h-4 mr-2 text-[#1877F2]" />
                  Facebook
                </Label>
                <Input 
                  id="facebookUrl" 
                  placeholder="https://facebook.com/yourbusiness" 
                  {...form.register('facebookUrl')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="twitterUrl" className="flex items-center">
                  <Twitter className="w-4 h-4 mr-2 text-[#1DA1F2]" />
                  Twitter
                </Label>
                <Input 
                  id="twitterUrl" 
                  placeholder="https://twitter.com/yourbusiness" 
                  {...form.register('twitterUrl')}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button 
                className="ml-auto bg-[#00796B] hover:bg-[#004D40]"
                onClick={form.handleSubmit(onSubmit)}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Social Links'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Verification Documents</CardTitle>
              <CardDescription>
                {business?.verificationStatus === 'verified' 
                  ? 'Your business has been verified' 
                  : 'Upload documents to verify your business'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className={business?.verificationStatus === 'verified' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
              }>
                <Info className={`h-4 w-4 ${business?.verificationStatus === 'verified' ? 'text-green-500' : 'text-yellow-500'}`} />
                <AlertDescription className={business?.verificationStatus === 'verified' ? 'text-green-700' : 'text-yellow-700'}>
                  {business?.verificationStatus === 'verified'
                    ? 'Your business is verified. You can now create and publish deals.'
                    : 'Your verification is pending. We will review your documents soon.'}
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border overflow-hidden">
                  <CardHeader className="p-4">
                    <CardTitle className="text-base">Business License</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="aspect-square rounded-md bg-gray-100 flex items-center justify-center mb-3">
                      <FileText className="h-10 w-10 text-gray-400" />
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <Check className="w-3 h-3 mr-1" /> Submitted
                    </Badge>
                  </CardContent>
                </Card>
                
                <Card className="border overflow-hidden">
                  <CardHeader className="p-4">
                    <CardTitle className="text-base">ID Verification</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="aspect-square rounded-md bg-gray-100 flex items-center justify-center mb-3">
                      <FileText className="h-10 w-10 text-gray-400" />
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <Check className="w-3 h-3 mr-1" /> Submitted
                    </Badge>
                  </CardContent>
                </Card>
                
                <Card className="border overflow-hidden">
                  <CardHeader className="p-4">
                    <CardTitle className="text-base">Proof of Address</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="aspect-square rounded-md bg-gray-100 flex items-center justify-center mb-3">
                      <FileText className="h-10 w-10 text-gray-400" />
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <Check className="w-3 h-3 mr-1" /> Submitted
                    </Badge>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-sm text-gray-500">
                    Documents submitted on <time>{new Date().toLocaleDateString()}</time>
                  </span>
                </div>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>
                Update your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordChangeForm userId={user?.id || 0} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}