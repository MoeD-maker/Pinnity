import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import ViewDetailsLink from "@/components/admin/ViewDetailsLink";
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Filter, 
  Store, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  ArrowUpDown,
  FileCheck,
  FileX,
  FileClock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const AdminVendorsPage = () => {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [sortField, setSortField] = useState<string>("appliedDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [inReviewCount, setInReviewCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  useEffect(() => {
    // In a real app, we would fetch this data from the API
    const mockBusinesses: Business[] = [
      {
        id: 1,
        businessName: "Coffee Corner",
        businessCategory: "Food & Drink",
        appliedDate: "2023-06-01T14:30:00",
        status: "new",
        verificationStatus: "pending",
        email: "contact@coffeecorner.com",
        phone: "555-123-4567",
        address: "123 Brew St, Coffee Town, CT 10001",
        description: "A cozy café serving fresh coffee and pastries."
      },
      {
        id: 2,
        businessName: "Urban Threads",
        businessCategory: "Retail",
        appliedDate: "2023-06-02T10:15:00",
        status: "in_review",
        verificationStatus: "in_progress",
        email: "support@urbanthreads.com",
        phone: "555-234-5678",
        address: "456 Fashion Ave, Style City, SC 20002",
        description: "Modern clothing store with the latest fashion trends."
      },
      {
        id: 3,
        businessName: "Bistro Delight",
        businessCategory: "Food & Drink",
        appliedDate: "2023-06-03T09:45:00",
        status: "approved",
        verificationStatus: "verified",
        email: "reservations@bistrodelight.com",
        phone: "555-345-6789",
        address: "789 Gourmet Blvd, Taste City, TC 30003",
        description: "Fine dining with a modern twist on classic dishes."
      },
      {
        id: 4,
        businessName: "Tech Haven",
        businessCategory: "Electronics",
        appliedDate: "2023-06-03T16:20:00",
        status: "rejected",
        verificationStatus: "rejected",
        email: "info@techhaven.com",
        phone: "555-456-7890",
        address: "101 Circuit Dr, Digital City, DC 40004",
        description: "Your one-stop shop for all your tech needs."
      },
      {
        id: 5,
        businessName: "Fitness First",
        businessCategory: "Health & Fitness",
        appliedDate: "2023-06-04T08:00:00",
        status: "new",
        verificationStatus: "pending",
        email: "member@fitnessfirst.com",
        phone: "555-567-8901",
        address: "202 Muscle Rd, Fit Town, FT 50005",
        description: "State-of-the-art gym with personal trainers and classes."
      },
      {
        id: 6,
        businessName: "Pet Paradise",
        businessCategory: "Pets",
        appliedDate: "2023-06-05T11:30:00",
        status: "in_review",
        verificationStatus: "in_progress",
        email: "care@petparadise.com",
        phone: "555-678-9012",
        address: "303 Paw Path, Animal City, AC 60006",
        description: "Premium pet supplies and grooming services."
      },
      {
        id: 7,
        businessName: "Bookworm's Haven",
        businessCategory: "Books & Media",
        appliedDate: "2023-06-05T14:45:00",
        status: "approved",
        verificationStatus: "verified",
        email: "books@bookworm.com",
        phone: "555-789-0123",
        address: "404 Reader Ln, Story City, SC 70007",
        description: "Cozy bookstore with a vast collection of books."
      },
      {
        id: 8,
        businessName: "Green Thumb Nursery",
        businessCategory: "Home & Garden",
        appliedDate: "2023-06-06T09:15:00",
        status: "new",
        verificationStatus: "pending",
        email: "plants@greenthumb.com",
        phone: "555-890-1234",
        address: "505 Garden Way, Plant City, PC 80008",
        description: "Plants, seeds, and gardening supplies for green thumbs."
      }
    ];

    setBusinesses(mockBusinesses);
  }, []);

  useEffect(() => {
    // Filter businesses
    let filtered = [...businesses];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(business => 
        business.businessName.toLowerCase().includes(query) ||
        business.businessCategory.toLowerCase().includes(query) ||
        business.email.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(business => business.status === statusFilter);
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
      } else if (sortField === "status") {
        return sortDirection === "asc"
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      }
      return 0;
    });

    setFilteredBusinesses(filtered);

    // Count by status
    setPendingCount(businesses.filter(b => b.status === "new").length);
    setInReviewCount(businesses.filter(b => b.status === "in_review").length);
    setApprovedCount(businesses.filter(b => b.status === "approved").length);
    setRejectedCount(businesses.filter(b => b.status === "rejected").length);
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
      case "new":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-yellow-600 border-yellow-300 bg-yellow-50"><Clock className="h-3 w-3" /> New</Badge>;
      case "in_review":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-blue-600 border-blue-300 bg-blue-50"><FileClock className="h-3 w-3" /> In Review</Badge>;
      case "approved":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-green-600 border-green-300 bg-green-50"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-red-600 border-red-300 bg-red-50"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline" className="font-normal">{status}</Badge>;
    }
  };

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-green-600 border-green-300 bg-green-50"><FileCheck className="h-3 w-3" /> Verified</Badge>;
      case "rejected":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-red-600 border-red-300 bg-red-50"><FileX className="h-3 w-3" /> Rejected</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-blue-600 border-blue-300 bg-blue-50"><FileClock className="h-3 w-3" /> In Progress</Badge>;
      case "pending":
      default:
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-yellow-600 border-yellow-300 bg-yellow-50"><FileClock className="h-3 w-3" /> Pending</Badge>;
    }
  };

  // Unique categories for filter
  const uniqueCategories = businesses.map(b => b.businessCategory).filter((value, index, self) => self.indexOf(value) === index);
  const categories = ["all", ...uniqueCategories];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vendor Management</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className={pendingCount > 0 ? "border-yellow-300" : ""}>
          <CardHeader className="py-4">
            <CardTitle className="text-base text-muted-foreground">New Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting initial review</p>
          </CardContent>
        </Card>
        <Card className={inReviewCount > 0 ? "border-blue-300" : ""}>
          <CardHeader className="py-4">
            <CardTitle className="text-base text-muted-foreground">In Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inReviewCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Documents being verified</p>
          </CardContent>
        </Card>
        <Card className={approvedCount > 0 ? "border-green-300" : ""}>
          <CardHeader className="py-4">
            <CardTitle className="text-base text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Active vendors</p>
          </CardContent>
        </Card>
        <Card className={rejectedCount > 0 ? "border-red-300" : ""}>
          <CardHeader className="py-4">
            <CardTitle className="text-base text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Rejected applications</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="all">All Vendors</TabsTrigger>
            <TabsTrigger value="new">New</TabsTrigger>
            <TabsTrigger value="in_review">In Review</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
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
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category === "all" ? "All Categories" : category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <TabsContent value="all" className="m-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">
                      <Button 
                        variant="ghost" 
                        className="p-0 font-medium flex items-center gap-1"
                        onClick={() => handleSort("businessName")}
                      >
                        Business
                        {sortField === "businessName" ? (
                          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        className="p-0 font-medium flex items-center gap-1"
                        onClick={() => handleSort("businessCategory")}
                      >
                        Category
                        {sortField === "businessCategory" ? (
                          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        className="p-0 font-medium flex items-center gap-1"
                        onClick={() => handleSort("appliedDate")}
                      >
                        Applied
                        {sortField === "appliedDate" ? (
                          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        className="p-0 font-medium flex items-center gap-1"
                        onClick={() => handleSort("status")}
                      >
                        Status
                        {sortField === "status" ? (
                          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[180px]">Documents</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBusinesses.map((business) => (
                    <TableRow key={business.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <Store className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <ViewDetailsLink href={`/admin/vendors/${business.id}`}>
                              <div className="font-medium hover:underline">
                                {business.businessName}
                              </div>
                            </ViewDetailsLink>
                            <div className="text-xs text-muted-foreground">{business.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{business.businessCategory}</TableCell>
                      <TableCell>
                        {new Date(business.appliedDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>{getStatusBadge(business.status)}</TableCell>
                      <TableCell>{getDocumentStatusBadge(business.verificationStatus)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/vendors/${business.id}`)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredBusinesses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center">
                          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-3 opacity-20" />
                          <p className="text-muted-foreground">No vendors found</p>
                          <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="new" className="m-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Business</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBusinesses
                    .filter(b => b.status === "new")
                    .map((business) => (
                      <TableRow key={business.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <Store className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                              <ViewDetailsLink href={`/admin/vendors/${business.id}`}>
                                <div className="font-medium hover:underline">
                                  {business.businessName}
                                </div>
                              </ViewDetailsLink>
                              <div className="text-xs text-muted-foreground">{business.address}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(business.appliedDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>{business.businessCategory}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{business.email}</div>
                            <div className="text-sm text-muted-foreground">{business.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // In a real app, would update the business status
                              navigate(`/admin/vendors/${business.id}`);
                            }}
                          >
                            Start Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {filteredBusinesses.filter(b => b.status === "new").length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center">
                          <CheckCircle className="h-12 w-12 text-muted-foreground mb-3 opacity-20" />
                          <p className="text-muted-foreground">No new applications</p>
                          <p className="text-xs text-muted-foreground mt-1">All caught up!</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Repeat similar table structure for in_review, approved, and rejected tabs */}
        <TabsContent value="in_review" className="m-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Business</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBusinesses
                    .filter(b => b.status === "in_review")
                    .map((business) => (
                      <TableRow key={business.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <Store className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                              <ViewDetailsLink href={`/admin/vendors/${business.id}`}>
                                <div className="font-medium hover:underline">
                                  {business.businessName}
                                </div>
                              </ViewDetailsLink>
                              <div className="text-xs text-muted-foreground">{business.businessCategory}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(business.appliedDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>{getDocumentStatusBadge(business.verificationStatus)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // In a real app, would update the business status to rejected
                              navigate(`/admin/vendors/${business.id}`);
                            }}
                          >
                            Reject
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => {
                              // In a real app, would update the business status to approved
                              navigate(`/admin/vendors/${business.id}`);
                            }}
                          >
                            Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {filteredBusinesses.filter(b => b.status === "in_review").length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center">
                          <CheckCircle className="h-12 w-12 text-muted-foreground mb-3 opacity-20" />
                          <p className="text-muted-foreground">No vendors in review</p>
                          <p className="text-xs text-muted-foreground mt-1">All caught up!</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="approved" className="m-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Business</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Approved Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBusinesses
                    .filter(b => b.status === "approved")
                    .map((business) => (
                      <TableRow key={business.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <Store className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                              <ViewDetailsLink href={`/admin/vendors/${business.id}`}>
                                <div className="font-medium hover:underline">
                                  {business.businessName}
                                </div>
                              </ViewDetailsLink>
                              <div className="text-xs text-muted-foreground">{business.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{business.businessCategory}</TableCell>
                        <TableCell>
                          {new Date(business.appliedDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/vendors/${business.id}`)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {filteredBusinesses.filter(b => b.status === "approved").length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center">
                          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-3 opacity-20" />
                          <p className="text-muted-foreground">No approved vendors</p>
                          <p className="text-xs text-muted-foreground mt-1">Approve vendors from the In Review tab</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="rejected" className="m-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Business</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Rejected Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBusinesses
                    .filter(b => b.status === "rejected")
                    .map((business) => (
                      <TableRow key={business.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <Store className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                              <ViewDetailsLink href={`/admin/vendors/${business.id}`}>
                                <div className="font-medium hover:underline">
                                  {business.businessName}
                                </div>
                              </ViewDetailsLink>
                              <div className="text-xs text-muted-foreground">{business.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{business.businessCategory}</TableCell>
                        <TableCell>
                          {new Date(business.appliedDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/vendors/${business.id}`)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {filteredBusinesses.filter(b => b.status === "rejected").length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center">
                          <CheckCircle className="h-12 w-12 text-muted-foreground mb-3 opacity-20" />
                          <p className="text-muted-foreground">No rejected vendors</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminVendorsPage;