import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  ChevronDown, 
  Check, 
  Calendar, 
  BarChart3, 
  Percent, 
  Clock, 
  X,
  RefreshCcw,
  Save,
  Trash2
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface FilterOptions {
  // Status filters
  status: {
    active: boolean;
    upcoming: boolean;
    expired: boolean;
    pending: boolean;
    rejected: boolean;
  };
  // Time filters
  timeFrame: 'all' | 'ending-soon' | 'recent' | 'custom';
  customDateRange?: {
    startDate: Date | null;
    endDate: Date | null;
  };
  // Sort options
  sortBy: 'newest' | 'oldest' | 'alphabetical' | 'end-date' | 'popularity';
  // Deal type filters
  dealTypes: {
    percent_off: boolean;
    fixed_amount: boolean;
    bogo: boolean;
    free_item: boolean;
    special_offer: boolean;
  };
  // Performance filters
  performance: 'all' | 'most-viewed' | 'most-redeemed' | 'most-saved' | 'least-performing';
}

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterOptions;
}

interface DealFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: FilterOptions) => void;
  initialFilters?: Partial<FilterOptions>;
}

const DEFAULT_FILTERS: FilterOptions = {
  status: {
    active: true,
    upcoming: false,
    expired: false,
    pending: false,
    rejected: false
  },
  timeFrame: 'all',
  customDateRange: {
    startDate: null,
    endDate: null
  },
  sortBy: 'newest',
  dealTypes: {
    percent_off: false,
    fixed_amount: false,
    bogo: false,
    free_item: false,
    special_offer: false
  },
  performance: 'all'
};

// For static demo counts
const STATUS_COUNTS = {
  active: 12,
  upcoming: 3,
  expired: 5,
  pending: 2,
  rejected: 1
};

const DEAL_TYPE_COUNTS = {
  percent_off: 8,
  fixed_amount: 4,
  bogo: 3,
  free_item: 2,
  special_offer: 3
};

// Local storage key for saved filters
const SAVED_FILTERS_KEY = 'pinnity_saved_filters';

export default function DealFilterDialog({ 
  open, 
  onOpenChange, 
  onApplyFilters,
  initialFilters = {} 
}: DealFilterDialogProps) {
  // Merge initial filters with defaults
  const mergedInitialFilters = {
    ...DEFAULT_FILTERS,
    ...initialFilters,
    status: { ...DEFAULT_FILTERS.status, ...initialFilters.status },
    dealTypes: { ...DEFAULT_FILTERS.dealTypes, ...initialFilters.dealTypes },
    customDateRange: initialFilters.customDateRange || DEFAULT_FILTERS.customDateRange
  };

  const [filters, setFilters] = useState<FilterOptions>(mergedInitialFilters);
  const [activeTab, setActiveTab] = useState('status');
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  // Load saved filters from localStorage
  useEffect(() => {
    const savedFiltersString = localStorage.getItem(SAVED_FILTERS_KEY);
    if (savedFiltersString) {
      try {
        const parsedFilters = JSON.parse(savedFiltersString);
        setSavedFilters(parsedFilters);
      } catch (e) {
        console.error('Error loading saved filters:', e);
      }
    }
  }, []);
  
  // Function to save current filter settings
  const saveCurrentFilter = () => {
    if (!filterName.trim()) return;
    
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      filters: { ...filters }
    };
    
    const updatedFilters = [...savedFilters, newFilter];
    setSavedFilters(updatedFilters);
    
    // Save to localStorage
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updatedFilters));
    
    // Reset form
    setFilterName('');
    setShowSaveDialog(false);
  };
  
  // Function to apply a saved filter
  const applySavedFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
  };
  
  // Function to delete a saved filter
  const deleteSavedFilter = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const updatedFilters = savedFilters.filter(filter => filter.id !== id);
    setSavedFilters(updatedFilters);
    
    // Update localStorage
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updatedFilters));
  };
  
  // Count active filters for badge display
  const countActiveFilters = (): number => {
    let count = 0;
    
    // Status filters
    Object.values(filters.status).forEach(value => {
      if (value) count++;
    });
    
    // Don't count active status if it's the only one selected (default state)
    if (count === 1 && filters.status.active && 
        !filters.status.upcoming && 
        !filters.status.expired && 
        !filters.status.pending && 
        !filters.status.rejected) {
      count = 0;
    }
    
    // Time filters
    if (filters.timeFrame !== 'all') count++;
    
    // Deal type filters
    Object.values(filters.dealTypes).forEach(value => {
      if (value) count++;
    });
    
    // Performance filters
    if (filters.performance !== 'all') count++;
    
    return count;
  };
  
  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };
  
  const handleApplyFilters = () => {
    onApplyFilters(filters);
    onOpenChange(false);
  };
  
  const updateStatusFilter = (key: keyof FilterOptions['status'], value: boolean) => {
    setFilters(prev => ({
      ...prev,
      status: {
        ...prev.status,
        [key]: value
      }
    }));
  };
  
  const updateDealTypeFilter = (key: keyof FilterOptions['dealTypes'], value: boolean) => {
    setFilters(prev => ({
      ...prev,
      dealTypes: {
        ...prev.dealTypes,
        [key]: value
      }
    }));
  };
  
  // Mobile-optimized filter layout
  const filterTabs = [
    { id: 'status', label: 'Status', icon: <Check className="h-4 w-4" /> },
    { id: 'time', label: 'Time', icon: <Clock className="h-4 w-4" /> },
    { id: 'performance', label: 'Performance', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'type', label: 'Deal Type', icon: <Percent className="h-4 w-4" /> },
    { id: 'sort', label: 'Sort', icon: <ChevronDown className="h-4 w-4" /> },
  ];
  
  const activeFilterCount = countActiveFilters();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Filter Deals</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount} active
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Customize which deals are displayed on your dashboard.
          </DialogDescription>
        </DialogHeader>
        
        {/* Mobile tabs for filter categories */}
        <div className="block sm:hidden mt-4">
          <Tabs defaultValue="status" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5 mb-4">
              {filterTabs.map(tab => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="text-xs flex flex-col items-center px-1 py-2 gap-1"
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value="status" className="space-y-4 mt-2">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Deal Status</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="filter-active"
                      checked={filters.status.active}
                      onCheckedChange={(checked) => updateStatusFilter('active', checked as boolean)}
                    />
                    <Label htmlFor="filter-active" className="text-sm">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="filter-upcoming"
                      checked={filters.status.upcoming}
                      onCheckedChange={(checked) => updateStatusFilter('upcoming', checked as boolean)}
                    />
                    <Label htmlFor="filter-upcoming" className="text-sm">Upcoming</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="filter-expired"
                      checked={filters.status.expired}
                      onCheckedChange={(checked) => updateStatusFilter('expired', checked as boolean)}
                    />
                    <Label htmlFor="filter-expired" className="text-sm">Expired</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="filter-pending"
                      checked={filters.status.pending}
                      onCheckedChange={(checked) => updateStatusFilter('pending', checked as boolean)}
                    />
                    <Label htmlFor="filter-pending" className="text-sm">Pending</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="filter-rejected"
                      checked={filters.status.rejected}
                      onCheckedChange={(checked) => updateStatusFilter('rejected', checked as boolean)}
                    />
                    <Label htmlFor="filter-rejected" className="text-sm">Rejected</Label>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="time" className="space-y-4 mt-2">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Time Frame</h3>
                <RadioGroup 
                  value={filters.timeFrame}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, timeFrame: value as any }))}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="time-all" />
                    <Label htmlFor="time-all" className="text-sm">All deals</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ending-soon" id="time-ending-soon" />
                    <Label htmlFor="time-ending-soon" className="text-sm">Ending soon (next 7 days)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recent" id="time-recent" />
                    <Label htmlFor="time-recent" className="text-sm">Recently created (last 30 days)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="time-custom" />
                    <Label htmlFor="time-custom" className="text-sm">Custom date range</Label>
                  </div>
                </RadioGroup>
              </div>
            </TabsContent>
            
            <TabsContent value="performance" className="space-y-4 mt-2">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Performance</h3>
                <RadioGroup 
                  value={filters.performance}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, performance: value as any }))}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="perf-all" />
                    <Label htmlFor="perf-all" className="text-sm">All deals</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="most-viewed" id="perf-most-viewed" />
                    <Label htmlFor="perf-most-viewed" className="text-sm">Most viewed</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="most-redeemed" id="perf-most-redeemed" />
                    <Label htmlFor="perf-most-redeemed" className="text-sm">Most redeemed</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="most-saved" id="perf-most-saved" />
                    <Label htmlFor="perf-most-saved" className="text-sm">Most saved</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="least-performing" id="perf-least-performing" />
                    <Label htmlFor="perf-least-performing" className="text-sm">Least performing</Label>
                  </div>
                </RadioGroup>
              </div>
            </TabsContent>
            
            <TabsContent value="type" className="space-y-4 mt-2">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Deal Type</h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="type-percent"
                      checked={filters.dealTypes.percent_off}
                      onCheckedChange={(checked) => updateDealTypeFilter('percent_off', checked as boolean)}
                    />
                    <Label htmlFor="type-percent" className="text-sm">Percentage discount</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="type-fixed"
                      checked={filters.dealTypes.fixed_amount}
                      onCheckedChange={(checked) => updateDealTypeFilter('fixed_amount', checked as boolean)}
                    />
                    <Label htmlFor="type-fixed" className="text-sm">Fixed amount discount</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="type-bogo"
                      checked={filters.dealTypes.bogo}
                      onCheckedChange={(checked) => updateDealTypeFilter('bogo', checked as boolean)}
                    />
                    <Label htmlFor="type-bogo" className="text-sm">Buy one get one</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="type-free"
                      checked={filters.dealTypes.free_item}
                      onCheckedChange={(checked) => updateDealTypeFilter('free_item', checked as boolean)}
                    />
                    <Label htmlFor="type-free" className="text-sm">Free item/service</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="type-special"
                      checked={filters.dealTypes.special_offer}
                      onCheckedChange={(checked) => updateDealTypeFilter('special_offer', checked as boolean)}
                    />
                    <Label htmlFor="type-special" className="text-sm">Special offer</Label>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="sort" className="space-y-4 mt-2">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Sort By</h3>
                <RadioGroup 
                  value={filters.sortBy}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value as any }))}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="newest" id="sort-newest" />
                    <Label htmlFor="sort-newest" className="text-sm">Newest first</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="oldest" id="sort-oldest" />
                    <Label htmlFor="sort-oldest" className="text-sm">Oldest first</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="alphabetical" id="sort-alphabetical" />
                    <Label htmlFor="sort-alphabetical" className="text-sm">Alphabetical (A-Z)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="end-date" id="sort-end-date" />
                    <Label htmlFor="sort-end-date" className="text-sm">End date (soonest first)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="popularity" id="sort-popularity" />
                    <Label htmlFor="sort-popularity" className="text-sm">Most popular (views)</Label>
                  </div>
                </RadioGroup>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        {/* Saved Filters section - appears when there are saved filters */}
        {savedFilters.length > 0 && (
          <div className="mb-6 border rounded-md p-4">
            <h3 className="text-sm font-medium mb-3">Saved Filters</h3>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map((filter) => (
                <Badge 
                  key={filter.id} 
                  variant="outline" 
                  className="py-1.5 pl-3 pr-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => applySavedFilter(filter)}
                >
                  {filter.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1.5"
                    onClick={(e) => deleteSavedFilter(filter.id, e)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Desktop layout with all filters visible */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Deal Status</h3>
                <span className="text-xs text-gray-500">(Select multiple)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="desktop-filter-active"
                    checked={filters.status.active}
                    onCheckedChange={(checked) => updateStatusFilter('active', checked as boolean)}
                  />
                  <Label htmlFor="desktop-filter-active" className="text-sm">
                    Active
                    <span className="text-xs text-gray-400 ml-1">({STATUS_COUNTS.active})</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="desktop-filter-upcoming"
                    checked={filters.status.upcoming}
                    onCheckedChange={(checked) => updateStatusFilter('upcoming', checked as boolean)}
                  />
                  <Label htmlFor="desktop-filter-upcoming" className="text-sm">
                    Upcoming
                    <span className="text-xs text-gray-400 ml-1">({STATUS_COUNTS.upcoming})</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="desktop-filter-expired"
                    checked={filters.status.expired}
                    onCheckedChange={(checked) => updateStatusFilter('expired', checked as boolean)}
                  />
                  <Label htmlFor="desktop-filter-expired" className="text-sm">
                    Expired
                    <span className="text-xs text-gray-400 ml-1">({STATUS_COUNTS.expired})</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="desktop-filter-pending"
                    checked={filters.status.pending}
                    onCheckedChange={(checked) => updateStatusFilter('pending', checked as boolean)}
                  />
                  <Label htmlFor="desktop-filter-pending" className="text-sm">
                    Pending
                    <span className="text-xs text-gray-400 ml-1">({STATUS_COUNTS.pending})</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="desktop-filter-rejected"
                    checked={filters.status.rejected}
                    onCheckedChange={(checked) => updateStatusFilter('rejected', checked as boolean)}
                  />
                  <Label htmlFor="desktop-filter-rejected" className="text-sm">
                    Rejected
                    <span className="text-xs text-gray-400 ml-1">({STATUS_COUNTS.rejected})</span>
                  </Label>
                </div>
              </div>
            </div>
            
            {/* Time frame filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Time Frame</h3>
                <span className="text-xs text-gray-500">(Select one)</span>
              </div>
              <RadioGroup 
                value={filters.timeFrame}
                onValueChange={(value) => setFilters(prev => ({ ...prev, timeFrame: value as any }))}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="desktop-time-all" />
                  <Label htmlFor="desktop-time-all" className="text-sm">All deals</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ending-soon" id="desktop-time-ending-soon" />
                  <Label htmlFor="desktop-time-ending-soon" className="text-sm">Ending soon (next 7 days)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recent" id="desktop-time-recent" />
                  <Label htmlFor="desktop-time-recent" className="text-sm">Recently created (last 30 days)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="desktop-time-custom" />
                  <Label htmlFor="desktop-time-custom" className="text-sm">Custom date range</Label>
                </div>
              </RadioGroup>
              
              {/* Date picker for custom range */}
              {filters.timeFrame === 'custom' && (
                <div className="mt-4 border p-3 rounded-md bg-gray-50 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="start-date" className="text-xs">Start date</Label>
                    <DatePicker
                      selected={filters.customDateRange?.startDate}
                      onChange={(date) => setFilters(prev => ({
                        ...prev,
                        customDateRange: {
                          ...prev.customDateRange,
                          startDate: date
                        }
                      }))}
                      selectsStart
                      startDate={filters.customDateRange?.startDate}
                      endDate={filters.customDateRange?.endDate}
                      placeholderText="Select start date"
                      className="w-full border border-gray-300 rounded-md p-2 text-sm"
                      dateFormat="MM/dd/yyyy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date" className="text-xs">End date</Label>
                    <DatePicker
                      selected={filters.customDateRange?.endDate}
                      onChange={(date) => setFilters(prev => ({
                        ...prev,
                        customDateRange: {
                          ...prev.customDateRange,
                          endDate: date
                        }
                      }))}
                      selectsEnd
                      startDate={filters.customDateRange?.startDate}
                      endDate={filters.customDateRange?.endDate}
                      minDate={filters.customDateRange?.startDate}
                      placeholderText="Select end date"
                      className="w-full border border-gray-300 rounded-md p-2 text-sm"
                      dateFormat="MM/dd/yyyy"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Performance filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Performance</h3>
                <span className="text-xs text-gray-500">(Select one)</span>
              </div>
              <RadioGroup 
                value={filters.performance}
                onValueChange={(value) => setFilters(prev => ({ ...prev, performance: value as any }))}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="desktop-perf-all" />
                  <Label htmlFor="desktop-perf-all" className="text-sm">All deals</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="most-viewed" id="desktop-perf-most-viewed" />
                  <Label htmlFor="desktop-perf-most-viewed" className="text-sm">
                    Most viewed
                    <span className="text-xs text-gray-400 ml-1">({PERFORMANCE_COUNTS['most-viewed']})</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="most-redeemed" id="desktop-perf-most-redeemed" />
                  <Label htmlFor="desktop-perf-most-redeemed" className="text-sm">
                    Most redeemed
                    <span className="text-xs text-gray-400 ml-1">({PERFORMANCE_COUNTS['most-redeemed']})</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="most-saved" id="desktop-perf-most-saved" />
                  <Label htmlFor="desktop-perf-most-saved" className="text-sm">
                    Most saved
                    <span className="text-xs text-gray-400 ml-1">({PERFORMANCE_COUNTS['most-saved']})</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="least-performing" id="desktop-perf-least-performing" />
                  <Label htmlFor="desktop-perf-least-performing" className="text-sm">
                    Least performing
                    <span className="text-xs text-gray-400 ml-1">({PERFORMANCE_COUNTS['least-performing']})</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Deal type filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Deal Type</h3>
                <span className="text-xs text-gray-500">(Select multiple)</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="desktop-type-percent"
                    checked={filters.dealTypes.percent_off}
                    onCheckedChange={(checked) => updateDealTypeFilter('percent_off', checked as boolean)}
                  />
                  <Label htmlFor="desktop-type-percent" className="text-sm">
                    Percentage discount
                    <span className="text-xs text-gray-400 ml-1">({DEAL_TYPE_COUNTS.percent_off})</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="desktop-type-fixed"
                    checked={filters.dealTypes.fixed_amount}
                    onCheckedChange={(checked) => updateDealTypeFilter('fixed_amount', checked as boolean)}
                  />
                  <Label htmlFor="desktop-type-fixed" className="text-sm">
                    Fixed amount discount
                    <span className="text-xs text-gray-400 ml-1">({DEAL_TYPE_COUNTS.fixed_amount})</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="desktop-type-bogo"
                    checked={filters.dealTypes.bogo}
                    onCheckedChange={(checked) => updateDealTypeFilter('bogo', checked as boolean)}
                  />
                  <Label htmlFor="desktop-type-bogo" className="text-sm">
                    Buy one get one
                    <span className="text-xs text-gray-400 ml-1">({DEAL_TYPE_COUNTS.bogo})</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="desktop-type-free"
                    checked={filters.dealTypes.free_item}
                    onCheckedChange={(checked) => updateDealTypeFilter('free_item', checked as boolean)}
                  />
                  <Label htmlFor="desktop-type-free" className="text-sm">
                    Free item/service
                    <span className="text-xs text-gray-400 ml-1">({DEAL_TYPE_COUNTS.free_item})</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="desktop-type-special"
                    checked={filters.dealTypes.special_offer}
                    onCheckedChange={(checked) => updateDealTypeFilter('special_offer', checked as boolean)}
                  />
                  <Label htmlFor="desktop-type-special" className="text-sm">
                    Special offer
                    <span className="text-xs text-gray-400 ml-1">({DEAL_TYPE_COUNTS.special_offer})</span>
                  </Label>
                </div>
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          {/* Sort options */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Sort By</h3>
            <RadioGroup 
              value={filters.sortBy}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value as any }))}
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="newest" id="desktop-sort-newest" />
                <Label htmlFor="desktop-sort-newest" className="text-sm">Newest first</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="oldest" id="desktop-sort-oldest" />
                <Label htmlFor="desktop-sort-oldest" className="text-sm">Oldest first</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="alphabetical" id="desktop-sort-alphabetical" />
                <Label htmlFor="desktop-sort-alphabetical" className="text-sm">Alphabetical (A-Z)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="end-date" id="desktop-sort-end-date" />
                <Label htmlFor="desktop-sort-end-date" className="text-sm">End date (soonest first)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="popularity" id="desktop-sort-popularity" />
                <Label htmlFor="desktop-sort-popularity" className="text-sm">Most popular (views)</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-6">
          <Button 
            variant="outline" 
            onClick={handleResetFilters}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Reset Filters
          </Button>
          <Button 
            onClick={handleApplyFilters}
            className="w-full sm:w-auto order-1 sm:order-2 bg-[#00796B] hover:bg-[#004D40]"
          >
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}