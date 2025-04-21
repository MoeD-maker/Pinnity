import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Info, 
  Calendar, 
  Clock, 
  Sparkles, 
  Heart, 
  MapPin, 
  ThumbsUp, 
  Smartphone, 
  Tablet, 
  Sun, 
  Moon,
  Share2,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "../../lib/utils";
import { DealFormValues } from "../../pages/vendor/deals/create";
import { DealAvailability } from '../shared/DealAvailabilityBadge';

// Import actual components from the customer app to ensure consistency
import EnhancedDealCard from '../shared/EnhancedDealCard';

interface CustomerDealPreviewProps {
  formValues: DealFormValues;
  businessName: string;
  businessLogo: string;
  categories: { id: string; name: string }[];
  dealTypes: { id: string; name: string; icon: React.ReactNode }[];
}

const CustomerDealPreview: React.FC<CustomerDealPreviewProps> = ({
  formValues,
  businessName,
  businessLogo,
  categories,
  dealTypes
}) => {
  // UI state management
  const [device, setDevice] = useState<'mobile' | 'tablet'>('mobile');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [viewType, setViewType] = useState<'browse' | 'detail'>('browse');
  
  // Get category and deal type display names
  const categoryName = categories.find(c => c.id === formValues.category)?.name || '';
  const dealTypeName = dealTypes.find(d => d.id === formValues.dealType)?.name || '';
  
  // Calculate display values for various elements
  const startDateFormatted = formValues.startDate ? format(formValues.startDate, "MMM d, yyyy") : '';
  const endDateFormatted = formValues.endDate ? format(formValues.endDate, "MMM d, yyyy") : '';
  const dateRange = startDateFormatted && endDateFormatted ? `${startDateFormatted} - ${endDateFormatted}` : '';
  
  // Get recurring availability information
  const mockAvailability: DealAvailability | undefined = formValues.isRecurring && formValues.recurringDays?.length ? {
    isAvailableToday: formValues.recurringDays.includes(new Date().getDay()),
    nextAvailableDay: formValues.recurringDays.sort()[0],
    nextAvailableDayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
      formValues.recurringDays.sort()[0]
    ],
    availableDays: formValues.recurringDays,
    availableDayNames: formValues.recurringDays.map(day => 
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]
    )
  } : undefined;
  
  // Format for EnhancedDealCard
  const dealForPreview = {
    id: 0, // Placeholder ID
    title: formValues.title || 'Deal Title',
    description: formValues.description || 'Deal description will appear here...',
    category: categoryName,
    imageUrl: formValues.imageUrl || undefined,
    startDate: formValues.startDate || new Date(),
    endDate: formValues.endDate || new Date(),
    discount: formValues.discount || undefined,
    featured: formValues.featured || false,
    isRecurring: formValues.isRecurring || false,
    business: {
      id: 0, // Placeholder ID
      businessName: businessName,
      logoUrl: businessLogo,
      address: '123 Main St', // Placeholder
      phone: '(555) 123-4567', // Placeholder
      website: 'www.example.com' // Placeholder
    },
    availability: mockAvailability,
    redemptionCount: 25, // Sample data to show how popular deals appear
    viewCount: 120 // Sample data
  };
  
  // Title and description truncation indicators
  const isTitleTruncated = formValues.title?.length > 40;
  const isDescriptionTruncatedInBrowse = formValues.description?.length > 100;
  
  // Device-specific styling
  const deviceStyle = device === 'mobile' 
    ? { maxWidth: '380px', width: '100%' } 
    : { maxWidth: '580px', width: '100%' };
    
  const phoneFrameStyle = device === 'mobile'
    ? { width: '380px', height: '680px' }
    : { width: '580px', height: '820px' };
    
  const themeClasses = theme === 'dark' 
    ? 'bg-gray-900 text-white border-gray-700' 
    : 'bg-white text-gray-900 border-gray-200';

  // Metrics and help texts for the best practices guidance
  const helpTexts = {
    title: {
      text: 'Deals with clear, concise titles under 40 characters perform best',
      warning: isTitleTruncated ? 'Your title will be truncated on smaller screens' : null
    },
    description: {
      text: 'Descriptions should be clear and highlight the key value for customers',
      warning: isDescriptionTruncatedInBrowse ? 'Your description will be truncated in browse view' : null
    },
    image: {
      text: 'Deals with high-quality images get 60% more views',
      warning: !formValues.imageUrl ? 'Adding a deal image is highly recommended' : null
    },
    recurring: {
      text: formValues.isRecurring 
        ? 'Recurring deals perform better when they're available at least 2 days per week' 
        : 'Recurring deals get 40% more engagement than one-time deals',
      warning: null
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Preview as Customer</h2>
        <div className="flex items-center space-x-4">
          {/* Device toggle */}
          <div className="flex items-center space-x-2">
            <Button 
              variant={device === 'mobile' ? "default" : "outline"} 
              size="sm"
              onClick={() => setDevice('mobile')}
              className="w-9 p-0"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
            <Button 
              variant={device === 'tablet' ? "default" : "outline"} 
              size="sm"
              onClick={() => setDevice('tablet')}
              className="w-9 p-0"
            >
              <Tablet className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Theme toggle */}
          <div className="flex items-center space-x-2">
            <Button 
              variant={theme === 'light' ? "default" : "outline"} 
              size="sm"
              onClick={() => setTheme('light')}
              className="w-9 p-0"
            >
              <Sun className="h-4 w-4" />
            </Button>
            <Button 
              variant={theme === 'dark' ? "default" : "outline"} 
              size="sm"
              onClick={() => setTheme('dark')}
              className="w-9 p-0"
            >
              <Moon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Phone frame mockup */}
      <div 
        className={`relative mx-auto border-[10px] rounded-[36px] overflow-hidden ${
          theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
        }`}
        style={phoneFrameStyle}
      >
        {/* Status bar */}
        <div className={`h-6 flex items-center justify-between px-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <div className="text-xs">{format(new Date(), "h:mm a")}</div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
          </div>
        </div>
        
        {/* App header */}
        <div className={`h-12 flex items-center justify-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className="font-semibold">Pinnity</h3>
        </div>
        
        {/* View toggle */}
        <div className={`px-4 py-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <Tabs 
            value={viewType}
            onValueChange={(value) => setViewType(value as 'browse' | 'detail')}
            className="w-full"
          >
            <TabsList className="w-full">
              <TabsTrigger value="browse" className="flex-1">Browse View</TabsTrigger>
              <TabsTrigger value="detail" className="flex-1">Detail View</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Content area with preview */}
        <div className={`overflow-auto h-[calc(100%-74px)] ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} p-4`}>
          {viewType === 'browse' && (
            <div>
              {/* Using the actual EnhancedDealCard component for consistency */}
              <EnhancedDealCard 
                deal={dealForPreview}
                onSelect={() => setViewType('detail')}
                distanceText="1.2 miles"
                isLarge={false}
              />
              
              {/* Best practices guidance */}
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-medium">Optimization Tips:</h3>
                {Object.entries(helpTexts).map(([key, data]) => (
                  <div key={key} className="bg-blue-50 p-3 rounded-md">
                    <div className="flex gap-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-blue-700">{data.text}</p>
                        {data.warning && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {data.warning}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {viewType === 'detail' && (
            <div className="space-y-4">
              {/* Deal detail view */}
              <Card className={`overflow-hidden w-full mx-auto shadow-lg ${themeClasses}`}>
                <div className="relative aspect-video overflow-hidden">
                  {formValues.imageUrl ? (
                    <img 
                      src={formValues.imageUrl} 
                      alt={formValues.title || 'Deal preview'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <p className="text-gray-500">No image uploaded</p>
                    </div>
                  )}
                  
                  {/* Business logo overlay */}
                  {businessLogo && (
                    <div className="absolute top-4 right-4 w-16 h-16 bg-white/90 rounded-md flex items-center justify-center p-2">
                      <img 
                        src={businessLogo} 
                        alt={businessName} 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          console.error('Error loading business logo in detail view');
                          e.currentTarget.src = 'https://placehold.co/400x400/teal/white?text=B';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Availability badge (if recurring) */}
                  {formValues.isRecurring && mockAvailability && (
                    <div className="absolute top-4 left-4">
                      <Badge 
                        className={`flex items-center gap-1 ${
                          mockAvailability.isAvailableToday 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                        variant="outline"
                      >
                        {mockAvailability.isAvailableToday 
                          ? <Calendar className="h-3 w-3" /> 
                          : <Clock className="h-3 w-3" />
                        }
                        <span>
                          {mockAvailability.isAvailableToday 
                            ? 'Available Today' 
                            : `Next Available: ${mockAvailability.nextAvailableDayName}`
                          }
                        </span>
                      </Badge>
                    </div>
                  )}
                </div>
                
                <CardHeader className={`pb-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold">
                        {formValues.title || 'Deal Title'}
                      </h2>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {businessName}
                      </p>
                    </div>
                    
                    {formValues.discount && formValues.dealType === 'percent_off' && (
                      <Badge className="bg-[#00796B] text-white text-lg px-3 py-1">
                        {formValues.discount}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">{categoryName}</Badge>
                    <Badge variant="outline">{dealTypeName}</Badge>
                  </div>
                </CardHeader>
                
                <CardContent className={`space-y-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                  {/* Dates info */}
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>
                      {dateRange || 'Date range will appear here'}
                    </span>
                  </div>
                  
                  {/* Recurring days (if applicable) */}
                  {formValues.isRecurring && formValues.recurringDays?.length > 0 && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>
                        Available every {formValues.recurringDays
                          .map(day => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day])
                          .join(', ')}
                      </span>
                    </div>
                  )}
                  
                  {/* Description */}
                  <div>
                    <h3 className="text-base font-medium mb-1">About this deal</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {formValues.description || 'Deal description will appear here...'}
                    </p>
                  </div>
                  
                  {/* Terms & Conditions (if any) */}
                  {formValues.terms && (
                    <div>
                      <h3 className="text-base font-medium mb-1">Terms & Conditions</h3>
                      <div className={`text-xs p-3 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                        {formValues.terms.split('\n').map((term, i) => (
                          <p key={i} className="mb-1">{term}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className={`flex justify-center py-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                  <Button size="lg" className="w-full bg-[#00796B] hover:bg-[#00796B]/90 text-white">
                    Redeem Deal
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Best practices guidance */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Optimization Tips:</h3>
                {Object.entries(helpTexts).map(([key, data]) => (
                  <div key={key} className="bg-blue-50 p-3 rounded-md">
                    <div className="flex gap-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-blue-700">{data.text}</p>
                        {data.warning && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {data.warning}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDealPreview;