import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// A simplified deal creation page
export default function SimpleCreateDealPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessError, setBusinessError] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [dealType, setDealType] = useState('percent_off');
  const [discount, setDiscount] = useState('25%');
  const [redemptionCode, setRedemptionCode] = useState('TEST' + Math.floor(1000 + Math.random() * 9000));
  
  // Fetch business data when component mounts
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (user?.id) {
        setBusinessLoading(true);
        setBusinessError(null);
        try {
          console.log('Fetching business data for user:', user.id);
          const data = await apiRequest(`/api/business/user/${user.id}`);
          
          console.log('Loaded business data:', data);
          if (data && data.id) {
            console.log('Setting business data with ID:', data.id);
            setBusiness(data);
          } else {
            const errorMsg = "No valid business data found. Please ensure your business profile is complete.";
            console.error(errorMsg);
            setBusinessError(errorMsg);
            toast({
              title: "Business data incomplete",
              description: "Please complete your business profile before creating deals",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Error loading business data:', error);
          setBusinessError(error instanceof Error ? error.message : "Unknown error loading business data");
          toast({
            title: "Error loading business data",
            description: "Please try again or contact support",
            variant: "destructive"
          });
        } finally {
          setBusinessLoading(false);
        }
      } else {
        console.error('No user ID available for fetching business data');
      }
    };
    
    fetchBusinessData();
  }, [user, toast]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      if (!business?.id) {
        throw new Error("Business information not available. Please try again or contact support.");
      }
      
      // Create the deal data
      const dealData = {
        title,
        category,
        description,
        dealType,
        discount,
        redemptionCode,
        redemptionInstructions: 'Show this code to the cashier',
        startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        endDate: new Date(Date.now() + 604800000).toISOString(),  // A week from now
        maxRedemptionsPerCustomer: 1,
        terms: '• Cannot be combined with other offers\n• Valid during business hours only',
        businessId: business.id,
        viewCount: 0,
        saveCount: 0,
        redemptionCount: 0
      };
      
      // Submit to API endpoint
      console.log('Submitting deal:', dealData);
      
      const deal = await apiRequest('/api/deals', {
        method: 'POST',
        data: dealData
      });
      
      console.log('Deal created successfully:', deal);
      
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
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => setLocation('/vendor')} className="mr-2">
          Back
        </Button>
        <h1 className="text-2xl font-bold">Simple Deal Creation</h1>
      </div>
      
      {businessLoading ? (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B] mb-4"></div>
              <h3 className="text-lg font-medium mb-2">Loading Business Data</h3>
              <p className="text-sm text-gray-500">Please wait while we fetch your business information...</p>
            </div>
          </CardContent>
        </Card>
      ) : businessError ? (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-lg font-medium mb-2">Business Data Error</h3>
              <p className="text-sm text-gray-500 mb-4">{businessError}</p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setLocation('/vendor/profile');
                }}
              >
                Go to Business Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Create a Simple Deal</CardTitle>
            <CardDescription>
              Quick deal creation form with minimal fields
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Deal Title</Label>
                <Input 
                  id="title" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 25% Off All Smoothies" 
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={category}
                  onValueChange={setCategory}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food_drink">Food & Drink</SelectItem>
                    <SelectItem value="shopping">Shopping</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="health_beauty">Health & Beauty</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your deal in detail..." 
                  rows={4}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dealType">Deal Type</Label>
                <Select 
                  value={dealType}
                  onValueChange={setDealType}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a deal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent_off">Percentage Off</SelectItem>
                    <SelectItem value="bogo">Buy One Get One Free</SelectItem>
                    <SelectItem value="free_item">Free Item with Purchase</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {dealType === 'percent_off' && (
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount Percentage</Label>
                  <Select 
                    value={discount}
                    onValueChange={setDiscount}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select discount percentage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10%">10% off</SelectItem>
                      <SelectItem value="15%">15% off</SelectItem>
                      <SelectItem value="20%">20% off</SelectItem>
                      <SelectItem value="25%">25% off</SelectItem>
                      <SelectItem value="30%">30% off</SelectItem>
                      <SelectItem value="40%">40% off</SelectItem>
                      <SelectItem value="50%">50% off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="redemptionCode">Redemption Code</Label>
                <Input 
                  id="redemptionCode" 
                  value={redemptionCode}
                  onChange={(e) => setRedemptionCode(e.target.value)}
                  placeholder="e.g. OFFER123" 
                  required
                />
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              onClick={handleSubmit}
              disabled={submitting || !title || !category || !description}
              className="w-full"
            >
              {submitting ? "Creating Deal..." : "Create Deal"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}