import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import DocumentVerification from "@/components/admin/DocumentVerification";
import BusinessReviewPanel from "@/components/admin/BusinessReviewPanel";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Edit, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  websiteUrl?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  documents?: {
    id: number;
    name: string;
    type: string;
    status: "pending" | "verified" | "rejected";
    uploadDate: string;
    notes?: string;
  }[];
}

export default function VendorDetailPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/admin/vendors/:id");
  const businessId = params?.id ? parseInt(params.id) : null;
  const queryClient = useQueryClient();
  
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editedBusiness, setEditedBusiness] = useState<Partial<Business>>({});

  // Fetch business data
  const { data: business, isLoading } = useQuery({
    queryKey: ['admin', 'vendor', businessId],
    queryFn: async () => {
      // In a real app, this would be an API call
      // For this demo, we'll use mock data
      if (!businessId) throw new Error("No business ID provided");
      
      return new Promise<Business>((resolve) => {
        setTimeout(() => {
          const mockBusiness: Business = {
            id: businessId,
            businessName: "Coffee Corner",
            businessCategory: "Food & Drink",
            appliedDate: "2023-06-01T14:30:00",
            status: "in_review",
            verificationStatus: "in_progress",
            email: "contact@coffeecorner.com",
            phone: "555-123-4567",
            address: "123 Brew St, Coffee Town, CT 10001",
            description: "A cozy café serving fresh coffee and pastries in the heart of Coffee Town. We source our beans ethically and roast them in-house for the freshest flavor. Our pastries are baked daily and we offer vegan and gluten-free options.",
            websiteUrl: "https://coffeecorner.com",
            socialLinks: {
              instagram: "coffee_corner",
              facebook: "coffeecorner",
              twitter: "coffee_corner"
            },
            documents: [
              {
                id: 1,
                name: "Business License",
                type: "license",
                status: "verified",
                uploadDate: "2023-06-01T14:35:00",
                notes: "License valid until 2024-06-01"
              },
              {
                id: 2,
                name: "Proof of Identification",
                type: "identification",
                status: "verified",
                uploadDate: "2023-06-01T14:36:00"
              },
              {
                id: 3,
                name: "Health Inspection Certificate",
                type: "certificate",
                status: "pending",
                uploadDate: "2023-06-01T14:37:00"
              },
              {
                id: 4,
                name: "Tax Registration",
                type: "tax",
                status: "rejected",
                uploadDate: "2023-06-01T14:38:00",
                notes: "Document expired, please upload current registration"
              }
            ]
          };
          resolve(mockBusiness);
        }, 500);
      });
    },
    enabled: !!businessId
  });

  // Mutation for updating business information
  const updateBusinessMutation = useMutation({
    mutationFn: async (data: Partial<Business>) => {
      // In a real app, this would be an API call
      console.log("Updating business:", data);
      return { success: true };
    },
    onSuccess: () => {
      // Reset UI state
      setIsEditingInfo(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendor', businessId] });
    }
  });

  // Handle document status change
  const handleDocumentStatusChange = (documentId: number, status: string, notes?: string) => {
    // In a real app, this would be an API call
    console.log(`Document ${documentId} status changed to ${status} with notes: ${notes}`);
    
    // Update local state through React Query
    queryClient.setQueryData(['admin', 'vendor', businessId], (oldData: Business | undefined) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        documents: oldData.documents?.map(doc => 
          doc.id === documentId 
            ? { ...doc, status: status as "pending" | "verified" | "rejected", notes: notes || doc.notes }
            : doc
        )
      };
    });
  };

  // Handle business status change
  const handleBusinessStatusChange = (status: string, feedback?: string) => {
    // In a real app, this would be an API call
    console.log(`Business status changed to ${status} with feedback: ${feedback}`);
    
    // Update local state through React Query
    queryClient.setQueryData(['admin', 'vendor', businessId], (oldData: Business | undefined) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        status: status as "new" | "in_review" | "approved" | "rejected",
        verificationStatus: 
          status === "approved" ? "verified" : 
          status === "rejected" ? "rejected" : 
          "in_progress"
      };
    });
  };

  // Handle business info update
  const handleBusinessUpdate = () => {
    updateBusinessMutation.mutate(editedBusiness);
  };

  // Alert conditions
  const documentReviewNeeded = business?.documents?.some(doc => doc.status === "pending") ?? false;
  const allDocumentsVerified = business?.documents?.every(doc => doc.status === "verified") ?? false;
  const hasRejectedDocuments = business?.documents?.some(doc => doc.status === "rejected") ?? false;

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3" /> New</Badge>;
      case "in_review":
        return <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200"><Clock className="h-3 w-3" /> In Review</Badge>;
      case "approved":
        return <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="flex items-center gap-1 bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Loading skeleton
  if (isLoading || !business) {
    return (
      <AdminLayout>
        <div className="flex items-center space-x-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/vendors")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-7 w-64 rounded bg-gray-200 animate-pulse"></div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardHeader className="p-6">
                <div className="h-7 w-48 rounded bg-gray-200 animate-pulse mb-2"></div>
                <div className="h-4 w-32 rounded bg-gray-200 animate-pulse"></div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-4 w-full rounded bg-gray-200 animate-pulse mb-3"></div>
                <div className="h-4 w-full rounded bg-gray-200 animate-pulse mb-3"></div>
                <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse"></div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="p-6">
              <div className="h-6 w-32 rounded bg-gray-200 animate-pulse"></div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-4 w-full rounded bg-gray-200 animate-pulse"></div>
                <div className="h-4 w-full rounded bg-gray-200 animate-pulse"></div>
                <div className="h-4 w-full rounded bg-gray-200 animate-pulse"></div>
                <div className="h-4 w-full rounded bg-gray-200 animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/vendors")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-2xl font-bold">{business.businessName}</h1>
            {getStatusBadge(business.status)}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/vendors")}>
            Back to List
          </Button>
        </div>
      </div>
      
      {business.status === "in_review" && documentReviewNeeded && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Document review needed</AlertTitle>
          <AlertDescription>
            This vendor has documents that need verification before their application can be processed.
          </AlertDescription>
        </Alert>
      )}
      
      {business.status === "in_review" && allDocumentsVerified && (
        <Alert className="mb-6 border-green-300 text-green-700 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>All documents verified</AlertTitle>
          <AlertDescription>
            This vendor's documents have been verified. You can now approve their application.
          </AlertDescription>
        </Alert>
      )}
      
      {business.status === "in_review" && hasRejectedDocuments && (
        <Alert className="mb-6 border-red-300 text-red-700 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Document issues</AlertTitle>
          <AlertDescription>
            This vendor has documents that have been rejected. They will need to upload new versions.
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="deals">
            Deals
            <Badge className="ml-2 bg-primary/20 text-primary">0</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>Business Information</CardTitle>
                    {!isEditingInfo ? (
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingInfo(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingInfo(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleBusinessUpdate}>
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pb-6">
                  {!isEditingInfo ? (
                    <div className="space-y-4">
                      <div className="flex gap-4 items-center">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {business.businessName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-lg font-semibold">{business.businessName}</h2>
                          <p className="text-sm text-muted-foreground">{business.businessCategory}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="text-sm font-medium mb-2">Description</h3>
                        <p className="text-sm">{business.description}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <div className="font-medium text-sm">Address</div>
                            <div className="text-sm text-muted-foreground">{business.address}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <div className="font-medium text-sm">Phone</div>
                            <div className="text-sm text-muted-foreground">{business.phone}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <div className="font-medium text-sm">Email</div>
                            <div className="text-sm text-muted-foreground">{business.email}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <div className="font-medium text-sm">Application Date</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(business.appliedDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {(business.websiteUrl || business.socialLinks) && (
                        <div className="mt-4">
                          <h3 className="text-sm font-medium mb-2">Online Presence</h3>
                          <div className="space-y-2">
                            {business.websiteUrl && (
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <a 
                                  href={business.websiteUrl.startsWith('http') ? business.websiteUrl : `https://${business.websiteUrl}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {business.websiteUrl}
                                </a>
                              </div>
                            )}
                            
                            {business.socialLinks?.instagram && (
                              <div className="flex items-center gap-2">
                                <Instagram className="h-4 w-4 text-muted-foreground" />
                                <a 
                                  href={`https://instagram.com/${business.socialLinks.instagram}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  @{business.socialLinks.instagram}
                                </a>
                              </div>
                            )}
                            
                            {business.socialLinks?.facebook && (
                              <div className="flex items-center gap-2">
                                <Facebook className="h-4 w-4 text-muted-foreground" />
                                <a 
                                  href={`https://facebook.com/${business.socialLinks.facebook}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {business.socialLinks.facebook}
                                </a>
                              </div>
                            )}
                            
                            {business.socialLinks?.twitter && (
                              <div className="flex items-center gap-2">
                                <Twitter className="h-4 w-4 text-muted-foreground" />
                                <a 
                                  href={`https://twitter.com/${business.socialLinks.twitter}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  @{business.socialLinks.twitter}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="businessName">Business Name</Label>
                          <Input 
                            id="businessName" 
                            defaultValue={business.businessName}
                            onChange={(e) => setEditedBusiness({...editedBusiness, businessName: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="businessCategory">Business Category</Label>
                          <Input 
                            id="businessCategory" 
                            defaultValue={business.businessCategory}
                            onChange={(e) => setEditedBusiness({...editedBusiness, businessCategory: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea 
                            id="description" 
                            defaultValue={business.description}
                            rows={4}
                            onChange={(e) => setEditedBusiness({...editedBusiness, description: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input 
                            id="email" 
                            type="email"
                            defaultValue={business.email}
                            onChange={(e) => setEditedBusiness({...editedBusiness, email: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input 
                            id="phone" 
                            defaultValue={business.phone}
                            onChange={(e) => setEditedBusiness({...editedBusiness, phone: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="address">Address</Label>
                          <Input 
                            id="address" 
                            defaultValue={business.address}
                            onChange={(e) => setEditedBusiness({...editedBusiness, address: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="websiteUrl">Website URL</Label>
                          <Input 
                            id="websiteUrl" 
                            defaultValue={business.websiteUrl || ''}
                            onChange={(e) => setEditedBusiness({...editedBusiness, websiteUrl: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <DocumentVerification 
                businessId={business.id} 
                documents={business.documents || []}
                onDocumentStatusChange={handleDocumentStatusChange}
              />
            </div>
            
            <div className="space-y-6">
              <BusinessReviewPanel 
                business={business}
                onStatusChange={handleBusinessStatusChange}
              />
              
              <Card>
                <CardHeader>
                  <CardTitle>Communication History</CardTitle>
                  <CardDescription>
                    Recent messages with this vendor
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
                    <p>No messages yet</p>
                    <Button variant="outline" size="sm" className="mt-4">
                      Send Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="documents">
          <DocumentVerification 
            businessId={business.id} 
            documents={business.documents || []}
            onDocumentStatusChange={handleDocumentStatusChange}
          />
        </TabsContent>
        
        <TabsContent value="deals">
          <Card>
            <CardHeader>
              <CardTitle>Deals</CardTitle>
              <CardDescription>
                Deals submitted by this vendor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                <Store className="h-12 w-12 mb-3 opacity-30" />
                <p>No deals have been submitted yet</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}