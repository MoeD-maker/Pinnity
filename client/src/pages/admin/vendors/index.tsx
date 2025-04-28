import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Filter, 
  Store, 
  Building, 
  Trash2, 
  Edit, 
  Plus,
  XCircle,
  CheckCircle,
  Clock,
  ShieldAlert,
  ArrowUpDown,
  ExternalLink,
  Eye,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

// Local interface for display purposes, not tied directly to the DB schema
interface Business {
  id: number;
  businessName: string;
  businessCategory: string;
  appliedDate: string;
  status: "new" | "in_review" | "approved" | "rejected";
  verificationStatus: string;
  email: string;
  phone: string;
  address: string;
  description: string;
}

export default function VendorsPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [sortField, setSortField] = useState<string>("appliedDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null);
  const { toast } = useToast();

  // Business categories
  const categories = [
    "Restaurant",
    "Retail",
    "Beauty",
    "Health",
    "Fitness",
    "Entertainment",
    "Education",
    "Technology",
    "Home & Garden",
    "Automotive",
    "Financial Services",
    "Professional Services",
    "Travel",
    "Other"
  ];

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    setIsLoading(true);
    try {
      // First try fetching all businesses
      let response;
      let pendingResponse;
      
      try {
        console.log("Attempting to fetch all businesses...");
        // Get all businesses for the full listing
        try {
          response = await apiRequest("/api/v1/admin/businesses");
          console.log("Successfully fetched all businesses with versioned route:", response);
        } catch (allBusinessError) {
          console.error("Error fetching all businesses:", allBusinessError);
          throw allBusinessError; // Rethrow to be caught by outer try/catch
        }
        
        console.log("Attempting to fetch pending businesses...");
        // Specifically get pending businesses to ensure we have the latest data
        try {
          pendingResponse = await apiRequest("/api/v1/admin/businesses/pending");
          
          // Apply robust array conversion to handle object with numeric keys
          if (pendingResponse && typeof pendingResponse === 'object' && !Array.isArray(pendingResponse)) {
            console.log("Converting pending businesses object to array:", pendingResponse);
            
            // Direct approach - most reliable way to convert an object with numeric keys to an array
            const result = [];
            let i = 0;
            let hasNumericKeys = false;
            
            // First try numeric access
            while (pendingResponse[i] !== undefined) {
              result.push(pendingResponse[i]);
              hasNumericKeys = true;
              i++;
            }
            
            // If we found numeric keys, use that result
            if (hasNumericKeys && result.length > 0) {
              console.log('Successfully converted object using numeric indexing, found:', result.length, 'pending businesses');
              pendingResponse = result;
            } 
            // Otherwise try Object.values
            else {
              try {
                const businessArray = Object.values(pendingResponse);
                console.log('Converted pending businesses using Object.values():', businessArray.length, 'items');
                pendingResponse = businessArray;
              } catch (error) {
                console.error('Error converting pending businesses to array:', error);
                pendingResponse = [];
              }
            }
          }
          
          console.log("Successfully fetched pending businesses:", pendingResponse?.length || 0);
        } catch (pendingError) {
          console.error("Error fetching pending businesses:", pendingError);
          // Don't throw here, we can continue with just the all businesses response
        }
        
        // If we got pending businesses, merge them with the main list
        // This ensures we have the latest pending vendors
        if (pendingResponse && pendingResponse.length > 0 && response) {
          console.log("Merging pending businesses with main list");
          // Map of existing business IDs to avoid duplicates
          const businessIds = new Set(response.map((b: any) => b.id));
          
          // Add any pending businesses not already in the main list
          pendingResponse.forEach((pendingBusiness: any) => {
            if (!businessIds.has(pendingBusiness.id)) {
              response.push(pendingBusiness);
            }
          });
          console.log("After merge, total businesses:", response.length);
        }
      } catch (error) {
        console.log("Versioned routes failed, falling back to legacy routes");
        try {
          console.log("Attempting legacy all businesses route...");
          response = await apiRequest("/api/admin/businesses");
          console.log("Successfully fetched all businesses with legacy route");
          
          // Apply array conversion to legacy response if needed
          if (response && typeof response === 'object' && !Array.isArray(response)) {
            console.log("Converting legacy businesses response object to array:", response);
            
            // Direct approach - most reliable way to convert an object with numeric keys to an array
            const result = [];
            let i = 0;
            let hasNumericKeys = false;
            
            // First try numeric access
            while (response[i] !== undefined) {
              result.push(response[i]);
              hasNumericKeys = true;
              i++;
            }
            
            // If we found numeric keys, use that result
            if (hasNumericKeys && result.length > 0) {
              console.log('Successfully converted legacy response using numeric indexing, found:', result.length, 'businesses');
              response = result;
            } 
            // Otherwise try Object.values
            else {
              try {
                const businessArray = Object.values(response);
                console.log('Converted legacy businesses using Object.values():', businessArray.length, 'items');
                response = businessArray;
              } catch (error) {
                console.error('Error converting legacy businesses to array:', error);
                response = [];
              }
            }
          }
          
          console.log("Attempting legacy pending businesses route...");
          pendingResponse = await apiRequest("/api/admin/businesses/pending");
          
          // Apply array conversion to legacy pending response if needed
          if (pendingResponse && typeof pendingResponse === 'object' && !Array.isArray(pendingResponse)) {
            console.log("Converting legacy pending businesses object to array:", pendingResponse);
            
            // Direct approach - most reliable way to convert an object with numeric keys to an array
            const result = [];
            let i = 0;
            let hasNumericKeys = false;
            
            // First try numeric access
            while (pendingResponse[i] !== undefined) {
              result.push(pendingResponse[i]);
              hasNumericKeys = true;
              i++;
            }
            
            // If we found numeric keys, use that result
            if (hasNumericKeys && result.length > 0) {
              console.log('Successfully converted legacy pending using numeric indexing, found:', result.length, 'businesses');
              pendingResponse = result;
            } 
            // Otherwise try Object.values
            else {
              try {
                const businessArray = Object.values(pendingResponse);
                console.log('Converted legacy pending using Object.values():', businessArray.length, 'items');
                pendingResponse = businessArray;
              } catch (error) {
                console.error('Error converting legacy pending to array:', error);
                pendingResponse = [];
              }
            }
          }
          
          console.log("Successfully fetched pending businesses with legacy route:", pendingResponse?.length || 0);
        } catch (fallbackError) {
          console.error("Both versioned and legacy routes failed:", fallbackError);
          // Set response to empty array if both approaches fail, to avoid undefined errors
          response = [];
        }
      }
      
      if (response) {
        console.log("Raw response from API:", response);
        
        // Apply robust array conversion to main response if needed
        if (typeof response === 'object' && !Array.isArray(response)) {
          console.log("Converting main response object to array:", response);
          
          // Direct approach - most reliable way to convert an object with numeric keys to an array
          const result = [];
          let i = 0;
          let hasNumericKeys = false;
          
          // First try numeric access
          while (response[i] !== undefined) {
            result.push(response[i]);
            hasNumericKeys = true;
            i++;
          }
          
          // If we found numeric keys, use that result
          if (hasNumericKeys && result.length > 0) {
            console.log('Successfully converted main response using numeric indexing, found:', result.length, 'businesses');
            response = result;
          } 
          // Otherwise try Object.values
          else {
            try {
              const businessArray = Object.values(response);
              console.log('Converted main response using Object.values():', businessArray.length, 'items');
              response = businessArray;
            } catch (error) {
              console.error('Error converting main response to array:', error);
              // Don't set to empty array here, let the existing error handling work
            }
          }
        }
        
        if (Array.isArray(response) && response.length > 0) {
          // Transform the data to match our interface if needed
          const formattedBusinesses = response.map((business: any) => ({
            id: business.id,
            businessName: business.businessName,
            businessCategory: business.businessCategory || "Other",
            appliedDate: business.user?.created_at || new Date().toISOString(),
            status: business.status || "new",
            verificationStatus: business.verificationStatus || "pending",
            email: business.user?.email || "",
            phone: business.phone || "",
            address: business.address || "",
            description: business.description || ""
          }));
          
          console.log(`Loaded ${formattedBusinesses.length} businesses, including ${formattedBusinesses.filter((b: any) => b.verificationStatus === 'pending').length} pending`);
          setBusinesses(formattedBusinesses);
        } else if (Array.isArray(response) && response.length === 0) {
          console.log("API returned empty array - no businesses found");
          setBusinesses([]);
          // Show message but don't treat as error
          toast({
            title: "No vendors found",
            description: "There are currently no businesses in the system",
            variant: "default"
          });
        } else {
          console.error("API returned invalid response format:", response);
          toast({
            title: "Error",
            description: "Failed to fetch businesses: Invalid response format",
            variant: "destructive"
          });
        }
      } else {
        console.error("No response from API");
        toast({
          title: "Error",
          description: "Failed to fetch businesses: No response from server",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
      toast({
        title: "Error",
        description: "Failed to fetch businesses",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Filter businesses
    let filtered = [...businesses];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(business => 
        business.businessName.toLowerCase().includes(query) ||
        business.email.toLowerCase().includes(query) ||
        business.businessCategory.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      if (statusFilter === "approved") {
        // When "approved" filter is selected, include both "approved" and "verified" statuses
        filtered = filtered.filter(business => 
          business.verificationStatus === "approved" || 
          business.verificationStatus === "verified"
        );
      } else {
        filtered = filtered.filter(business => business.verificationStatus === statusFilter);
      }
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(business => business.businessCategory === categoryFilter);
    }

    // Sort businesses
    filtered.sort((a, b) => {
      if (sortField === "businessName") {
        return sortDirection === "asc" 
          ? a.businessName.localeCompare(b.businessName)
          : b.businessName.localeCompare(a.businessName);
      } else if (sortField === "businessCategory") {
        return sortDirection === "asc"
          ? a.businessCategory.localeCompare(b.businessCategory)
          : b.businessCategory.localeCompare(a.businessCategory);
      } else if (sortField === "appliedDate") {
        return sortDirection === "asc"
          ? new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime()
          : new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
      } else if (sortField === "verificationStatus") {
        return sortDirection === "asc"
          ? a.verificationStatus.localeCompare(b.verificationStatus)
          : b.verificationStatus.localeCompare(a.verificationStatus);
      }
      return 0;
    });

    setFilteredBusinesses(filtered);

    // Count by status
    setPendingCount(businesses.filter((b: Business) => b.verificationStatus === "pending").length);
    setApprovedCount(
      businesses.filter(
        (b: Business) => b.verificationStatus === "approved" || b.verificationStatus === "verified"
      ).length
    );
    setRejectedCount(businesses.filter((b: Business) => b.verificationStatus === "rejected").length);
  }, [businesses, searchQuery, statusFilter, categoryFilter, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-yellow-600 border-yellow-300 bg-yellow-50"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "approved":
      case "verified":  // Treat "verified" same as "approved"
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-green-600 border-green-300 bg-green-50"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-red-600 border-red-300 bg-red-50"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      case "review":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-blue-600 border-blue-300 bg-blue-50"><ShieldAlert className="h-3 w-3" /> In Review</Badge>;
      default:
        return <Badge variant="outline" className="font-normal">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vendor Management</h1>
        <Button 
          className="bg-[#00796B] hover:bg-[#00695C]"
          onClick={() => navigate("/admin/vendors/add")}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Vendor
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-muted-foreground text-sm">Loading...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{pendingCount || 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting verification</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-muted-foreground text-sm">Loading...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{approvedCount || 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">Active vendors (approved & verified)</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-muted-foreground text-sm">Loading...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{rejectedCount || 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">Declined applications</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant={statusFilter === "all" ? "default" : "outline"} 
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          <Button 
            variant={statusFilter === "pending" ? "default" : "outline"} 
            size="sm"
            onClick={() => setStatusFilter("pending")}
            className={statusFilter === "pending" ? "" : "text-yellow-600 border-yellow-300 hover:bg-yellow-50"}
          >
            <Clock className="mr-2 h-3 w-3" /> Pending
          </Button>
          <Button 
            variant={statusFilter === "approved" ? "default" : "outline"} 
            size="sm"
            onClick={() => setStatusFilter("approved")}
            className={statusFilter === "approved" ? "" : "text-green-600 border-green-300 hover:bg-green-50"}
          >
            <CheckCircle className="mr-2 h-3 w-3" /> Approved
          </Button>
          <Button 
            variant={statusFilter === "rejected" ? "default" : "outline"} 
            size="sm"
            onClick={() => setStatusFilter("rejected")}
            className={statusFilter === "rejected" ? "" : "text-red-600 border-red-300 hover:bg-red-50"}
          >
            <XCircle className="mr-2 h-3 w-3" /> Rejected
          </Button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search vendors..."
              className="pl-8 w-full sm:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Filter</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs">Category</DropdownMenuLabel>
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => setCategoryFilter(value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-1 p-0 hover:bg-transparent"
                    onClick={() => handleSort("businessName")}
                  >
                    Business Name
                    {sortField === "businessName" ? (
                      sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-1 p-0 hover:bg-transparent"
                    onClick={() => handleSort("businessCategory")}
                  >
                    Category
                    {sortField === "businessCategory" ? (
                      sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-1 p-0 hover:bg-transparent"
                    onClick={() => handleSort("appliedDate")}
                  >
                    Applied
                    {sortField === "appliedDate" ? (
                      sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-1 p-0 hover:bg-transparent"
                    onClick={() => handleSort("verificationStatus")}
                  >
                    Status
                    {sortField === "verificationStatus" ? (
                      sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredBusinesses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center">
                      <Building className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No vendors found</p>
                      {searchQuery && (
                        <Button 
                          variant="link" 
                          onClick={() => setSearchQuery("")} 
                          className="mt-2"
                        >
                          Clear search
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBusinesses.map((business) => (
                  <TableRow key={business.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{business.businessName}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {business.address}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{business.businessCategory}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="flex items-center text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 mr-1" /> {business.email}
                        </span>
                        <span className="flex items-center text-xs text-muted-foreground mt-1">
                          <Phone className="h-3 w-3 mr-1" /> {business.phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(business.appliedDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>{getStatusBadge(business.verificationStatus)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/admin/vendors/${business.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/admin/vendors/${business.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Featured Vendors Section */}
      <h2 className="text-xl font-semibold mt-10 mb-4">Recently Added Vendors</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredBusinesses.slice(0, 3).map((business) => (
          <Card key={business.id} className="overflow-hidden">
            <div className="h-32 bg-gray-100 flex items-center justify-center">
              <Store className="h-12 w-12 text-gray-400" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{business.businessName}</CardTitle>
              <CardDescription>{business.businessCategory}</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex flex-col space-y-2 text-sm">
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">{business.address || "No address provided"}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{business.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{business.phone || "No phone provided"}</span>
                </div>
                <div className="mt-2">
                  {getStatusBadge(business.verificationStatus)}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-0">
              <Button variant="outline" size="sm" onClick={() => navigate(`/admin/vendors/${business.id}`)}>
                View Details
              </Button>
              {business.verificationStatus === "pending" && (
                <Button size="sm" onClick={() => navigate(`/admin/vendors/${business.id}`)}>
                  Review
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}