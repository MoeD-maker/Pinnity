import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Calendar, Clock, Sparkles, Heart, MapPin, ThumbsUp, Smartphone, Tablet, Sun, Moon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../../lib/utils";
import { DealFormValues } from "../../pages/vendor/deals/create";
import { DealAvailability } from '../shared/DealAvailabilityBadge';

interface DealPreviewProps {
  formValues: DealFormValues;
  businessName: string;
  businessLogo?: string;
  logoPosition?: 'top-right' | 'bottom-right';
  categories: { id: string; name: string }[];
  dealTypes: { id: string; name: string; icon: React.ReactNode }[];
}

const DealPreview: React.FC<DealPreviewProps> = ({
  formValues,
  businessName,
  businessLogo,
  logoPosition = 'top-right',
  categories,
  dealTypes
}) => {
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
  
  // Title and description truncation indicators
  const isTitleTruncated = formValues.title?.length > 40;
  const isDescriptionTruncatedInBrowse = formValues.description?.length > 100;
  
  // Device-specific styling
  const deviceStyle = device === 'mobile' 
    ? { maxWidth: '320px' } 
    : { maxWidth: '500px' };
    
  const themeClasses = theme === 'dark' 
    ? 'bg-gray-900 text-white border-gray-700' 
    : 'bg-white text-gray-900 border-gray-200';
  
  const renderBrowseView = () => (
    <Card className={`overflow-hidden w-full mx-auto shadow-lg ${themeClasses}`} style={deviceStyle}>
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
        
        {/* Category badge */}
        <div className="absolute top-2 left-2">
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            {categoryName}
          </Badge>
        </div>
        
        {/* Featured badge (if applicable) */}
        {formValues.featured && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-[#00796B] text-white flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Featured</span>
            </Badge>
          </div>
        )}
        
        {/* Discount badge (if applicable) */}
        {formValues.discount && formValues.dealType === 'percent_off' && (
          <div className="absolute bottom-2 left-2">
            <Badge className="bg-[#00796B] text-white">
              {formValues.discount}
            </Badge>
          </div>
        )}
        
        {/* Availability badge (if recurring) */}
        {formValues.isRecurring && mockAvailability && (
          <div className="absolute bottom-2 right-2">
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
              <span className="text-xs">
                {mockAvailability.isAvailableToday 
                  ? 'Available Today' 
                  : `Next: ${mockAvailability.nextAvailableDayName}`
                }
              </span>
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className={`p-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-start space-x-2">
          {businessLogo ? (
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
              <img 
                src={businessLogo} 
                alt={businessName} 
                className="w-full h-full object-contain" 
                onError={(e) => {
                  console.error('Error loading business logo in browse view');
                  e.currentTarget.src = 'https://placehold.co/400x400/teal/white?text=B';
                }}
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-200 bg-gray-100 flex items-center justify-center">
              <span className="text-xs text-gray-500">Logo</span>
            </div>
          )}
          
          <div className="flex-1">
            <h3 className="font-semibold text-base line-clamp-1">
              {formValues.title || 'Deal Title'}
              {isTitleTruncated && <span className="ml-1 text-amber-500 text-xs">...</span>}
            </h3>
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
              {businessName}
            </p>
            <p className={`text-sm line-clamp-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {formValues.description || 'Deal description will appear here...'}
              {isDescriptionTruncatedInBrowse && viewType === 'browse' && (
                <span className="ml-1 text-amber-500 text-xs">...</span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center text-xs text-gray-500">
            <MapPin className="h-3 w-3 mr-1" />
            <span>1.2 miles</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Heart className="h-4 w-4 text-gray-400 cursor-pointer hover:text-red-500" />
            <ThumbsUp className="h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-500" />
          </div>
        </div>
      </CardContent>

      <CardFooter className={`p-3 pt-0 flex justify-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <Button className="w-full bg-[#00796B] hover:bg-[#00796B]/90 text-white">
          View Deal
        </Button>
      </CardFooter>
    </Card>
  );
  
  const renderDetailView = () => (
    <Card className={`overflow-hidden w-full mx-auto shadow-lg ${themeClasses}`} style={deviceStyle}>
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
          <div className={cn(
            "absolute w-16 h-16 bg-white/90 rounded-md flex items-center justify-center p-2",
            logoPosition === 'top-right' && "top-4 right-4",
            logoPosition === 'bottom-right' && "bottom-4 right-4"
          )}>
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
          <div className={cn(
            "absolute",
            businessLogo && logoPosition === 'top-right' ? "top-4 right-24" : "top-4 right-4",
          )}>
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
              <span className="text-xs">
                {mockAvailability.isAvailableToday 
                  ? 'Available Today' 
                  : `Next Available: ${mockAvailability.nextAvailableDayName}`
                }
              </span>
            </Badge>
          </div>
        )}
        
        {/* Featured badge (if applicable) */}
        {formValues.featured && (
          <div className="absolute top-4 left-4">
            <Badge className="bg-[#00796B] text-white flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Featured</span>
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
  );
  
  // Debug logs
  console.log('DealPreview received - businessLogo:', businessLogo);
  console.log('DealPreview received - businessName:', businessName);
  console.log('DealPreview received - logoPosition:', logoPosition);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Preview Your Deal</h2>
        
        <div className="flex items-center space-x-3">
          {/* Device selector */}
          <div className="flex items-center space-x-2">
            <Button 
              variant={device === 'mobile' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setDevice('mobile')}
              className="px-3"
            >
              <Smartphone className="h-4 w-4 mr-1" />
              <span>Mobile</span>
            </Button>
            <Button 
              variant={device === 'tablet' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setDevice('tablet')}
              className="px-3"
            >
              <Tablet className="h-4 w-4 mr-1" />
              <span>Tablet</span>
            </Button>
          </div>
          
          {/* Theme selector */}
          <div className="flex items-center space-x-2">
            <Button 
              variant={theme === 'light' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setTheme('light')}
              className="px-3"
            >
              <Sun className="h-4 w-4 mr-1" />
              <span>Light</span>
            </Button>
            <Button 
              variant={theme === 'dark' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setTheme('dark')}
              className="px-3"
            >
              <Moon className="h-4 w-4 mr-1" />
              <span>Dark</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* View type selector */}
      <Tabs defaultValue="browse" className="w-full" onValueChange={(value) => setViewType(value as 'browse' | 'detail')}>
        <div className="flex justify-center mb-4">
          <TabsList>
            <TabsTrigger value="browse">Browse View</TabsTrigger>
            <TabsTrigger value="detail">Detail View</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="browse" className="flex justify-center">
          <div className="relative">
            {renderBrowseView()}
            <div className="absolute -top-10 -left-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center cursor-help">
                      <Info className="h-4 w-4 text-amber-800" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="font-medium">Browse View Optimization</p>
                    <ul className="text-sm list-disc pl-4 mt-1">
                      <li>This is how your deal appears in the deal feed</li>
                      <li>Titles are limited to 40 characters in this view</li>
                      <li>Descriptions are truncated after 100 characters</li>
                      <li>Clear, high-quality images get more engagement</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="detail" className="flex justify-center">
          <div className="relative">
            {renderDetailView()}
            <div className="absolute -top-10 -left-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center cursor-help">
                      <Info className="h-4 w-4 text-blue-800" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="font-medium">Detail View Best Practices</p>
                    <ul className="text-sm list-disc pl-4 mt-1">
                      <li>This is what customers see after tapping your deal</li>
                      <li>Complete, detailed descriptions boost redemptions</li>
                      <li>Clear terms and conditions build customer trust</li>
                      <li>For recurring deals, day availability is highlighted</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Optimization tips */}
      <div className={`p-3 rounded-md mt-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'}`}>
        <h3 className={`text-sm font-medium flex items-center ${theme === 'dark' ? 'text-blue-300' : 'text-blue-800'}`}>
          <Info className="h-4 w-4 mr-1" />
          Optimization Tips
        </h3>
        <ul className={`mt-2 text-xs space-y-1 ${theme === 'dark' ? 'text-gray-300' : 'text-blue-700'}`}>
          <li>• Deals with images get 60% more views than those without</li>
          <li>• Clear, concise titles under 40 characters perform best</li>
          <li>• Featured deals receive up to 3x more visibility</li>
          <li>• Including specific discount values increases engagement</li>
          <li>• Recurring deals generate 40% more repeat customers</li>
        </ul>
      </div>
      
      {/* Content truncation warnings */}
      {(isTitleTruncated || isDescriptionTruncatedInBrowse) && viewType === 'browse' && (
        <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
          <h3 className="text-sm font-medium text-amber-800 flex items-center">
            <Info className="h-4 w-4 mr-1" />
            Content Truncation Warning
          </h3>
          <ul className="mt-2 text-xs text-amber-700 space-y-1">
            {isTitleTruncated && (
              <li>• Your title exceeds 40 characters and will be truncated in browse view</li>
            )}
            {isDescriptionTruncatedInBrowse && (
              <li>• Your description exceeds 100 characters and will be truncated in browse view</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DealPreview;