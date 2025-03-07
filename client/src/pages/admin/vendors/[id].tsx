import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { 
  ArrowLeft, 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Edit, 
  Check, 
  X, 
  AlertTriangle,
  FileText,
  Clock,
  FileCheck,
  FileX,
  GlobeIcon,
  Instagram,
  Facebook,
  Twitter
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>("pending");
  const [verificationFeedback, setVerificationFeedback] = useState<string>("");
  const [editedBusiness, setEditedBusiness] = useState<Partial<Business>>({});
  
  useEffect(() => {
    // In a real app, we would fetch business data from the API
    // For this demo, we'll use mock data
    if (businessId) {
      setIsLoading(true);
      
      // Simulate API call
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
        
        setBusiness(mockBusiness);
        setVerificationStatus(mockBusiness.verificationStatus);
        setEditedBusiness(mockBusiness);
        setIsLoading(false);
      }, 500);
    }
  }, [businessId]);
  
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
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-yellow-600 border-yellow-300 bg-yellow-50"><Clock className="h-3 w-3" /> New</Badge>;
      case "in_review":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-blue-600 border-blue-300 bg-blue-50"><Clock className="h-3 w-3" /> In Review</Badge>;
      case "approved":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-green-600 border-green-300 bg-green-50"><Check className="h-3 w-3" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-red-600 border-red-300 bg-red-50"><X className="h-3 w-3" /> Rejected</Badge>;
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
      case "pending":
      default:
        return <Badge variant="outline" className="flex items-center gap-1 font-normal text-yellow-600 border-yellow-300 bg-yellow-50"><Clock className="h-3 w-3" /> Pending</Badge>;
    }
  };
  
  const documentReviewNeeded = business.documents?.some(doc => doc.status === "pending") ?? false;
  const allDocumentsVerified = business.documents?.every(doc => doc.status === "verified") ?? false;
  const hasRejectedDocuments = business.documents?.some(doc => doc.status === "rejected") ?? false;
  
  const handleBusinessUpdate = () => {
    // In a real app, we would send a request to update the business
    // For this demo, we'll just update the state
    setBusiness({
      ...business,
      ...editedBusiness
    });
    setIsEditingInfo(false);
  };
  
  const handleVerificationStatusUpdate = () => {
    // In a real app, we would send a request to update the verification status
    // For this demo, we'll just update the state
    setBusiness({
      ...business,
      verificationStatus,
      status: verificationStatus === "verified" ? "approved" : 
        verificationStatus === "rejected" ? "rejected" : "in_review"
    });
    setVerificationDialogOpen(false);
  };
  
  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/vendors")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{business.businessName}</h1>
          {getStatusBadge(business.status)}
        </div>
        
        <div className="flex items-center space-x-2">
          <Dialog open={verificationDialogOpen} onOpenChange={setVerificationDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Change Status</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update vendor status</DialogTitle>
                <DialogDescription>
                  Change the verification status and provide feedback to the vendor.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="verification-status">Verification Status</Label>
                  <Select value={verificationStatus} onValueChange={setVerificationStatus}>
                    <SelectTrigger id="verification-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="verification-feedback">Feedback (optional)</Label>
                  <Textarea
                    id="verification-feedback"
                    placeholder="Provide feedback to the vendor about their verification status"
                    value={verificationFeedback}
                    onChange={(e) => setVerificationFeedback(e.target.value)}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setVerificationDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleVerificationStatusUpdate}>Update Status</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {business.status === "in_review" && (
            <>
              <Button 
                variant="destructive" 
                onClick={() => {
                  setVerificationStatus("rejected");
                  setVerificationDialogOpen(true);
                }}
              >
                Reject
              </Button>
              <Button 
                variant="default" 
                disabled={!allDocumentsVerified}
                onClick={() => {
                  setVerificationStatus("verified");
                  setVerificationDialogOpen(true);
                }}
              >
                Approve
              </Button>
            </>
          )}
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
          <Check className="h-4 w-4" />
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
              <CardDescription>
                {getDocumentStatusBadge(business.verificationStatus)}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              {!isEditingInfo ? (
                <div className="space-y-4">
                  <p className="text-sm">{business.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Address</div>
                        <div className="text-sm text-muted-foreground">{business.address}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <Store className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Category</div>
                        <div className="text-sm text-muted-foreground">{business.businessCategory}</div>
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
                    
                    {business.websiteUrl && (
                      <div className="flex items-start space-x-2">
                        <GlobeIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium text-sm">Website</div>
                          <a 
                            href={business.websiteUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {business.websiteUrl}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="business-name">Business Name</Label>
                    <Input 
                      id="business-name" 
                      value={editedBusiness.businessName || ''} 
                      onChange={(e) => setEditedBusiness({...editedBusiness, businessName: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="business-description">Description</Label>
                    <Textarea 
                      id="business-description" 
                      value={editedBusiness.description || ''} 
                      onChange={(e) => setEditedBusiness({...editedBusiness, description: e.target.value})}
                      rows={4}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business-category">Category</Label>
                      <Input 
                        id="business-category" 
                        value={editedBusiness.businessCategory || ''} 
                        onChange={(e) => setEditedBusiness({...editedBusiness, businessCategory: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="business-address">Address</Label>
                      <Input 
                        id="business-address" 
                        value={editedBusiness.address || ''} 
                        onChange={(e) => setEditedBusiness({...editedBusiness, address: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="business-email">Email</Label>
                      <Input 
                        id="business-email" 
                        value={editedBusiness.email || ''} 
                        onChange={(e) => setEditedBusiness({...editedBusiness, email: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="business-phone">Phone</Label>
                      <Input 
                        id="business-phone" 
                        value={editedBusiness.phone || ''} 
                        onChange={(e) => setEditedBusiness({...editedBusiness, phone: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="business-website">Website</Label>
                      <Input 
                        id="business-website" 
                        value={editedBusiness.websiteUrl || ''} 
                        onChange={(e) => setEditedBusiness({...editedBusiness, websiteUrl: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Verification documents submitted by the vendor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {business.documents && business.documents.length > 0 ? (
                  business.documents.map((document) => (
                    <Card key={document.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex justify-between items-center p-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <div className="font-medium">{document.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Uploaded {new Date(document.uploadDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getDocumentStatusBadge(document.status)}
                            {document.status === "pending" && (
                              <div className="flex space-x-1">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    // In a real app, we would update the document status
                                    const updatedDocuments = business.documents?.map(d => {
                                      if (d.id === document.id) {
                                        return { ...d, status: "rejected" };
                                      }
                                      return d;
                                    });
                                    
                                    setBusiness({
                                      ...business,
                                      documents: updatedDocuments
                                    });
                                  }}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => {
                                    // In a real app, we would update the document status
                                    const updatedDocuments = business.documents?.map(d => {
                                      if (d.id === document.id) {
                                        return { ...d, status: "verified" };
                                      }
                                      return d;
                                    });
                                    
                                    setBusiness({
                                      ...business,
                                      documents: updatedDocuments
                                    });
                                  }}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Verify
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        {document.notes && (
                          <div className="px-4 py-2 bg-gray-50 border-t text-sm">
                            <span className="font-medium">Notes:</span> {document.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground">No documents have been submitted</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Verification Status</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-xl font-semibold mb-2">
                {getDocumentStatusBadge(business.verificationStatus)}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {business.verificationStatus === "pending" && "This vendor is waiting for initial review."}
                {business.verificationStatus === "in_progress" && "This vendor's documents are being reviewed."}
                {business.verificationStatus === "verified" && "This vendor has been verified and approved."}
                {business.verificationStatus === "rejected" && "This vendor has been rejected."}
              </p>
              
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Applied on</div>
                  <div className="text-sm">
                    {new Date(business.appliedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium">Documents Verified</div>
                  <div className="text-sm">
                    {business.documents?.filter(d => d.status === "verified").length || 0} of {business.documents?.length || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Social Media</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {business.socialLinks ? (
                <div className="space-y-3">
                  {business.socialLinks.instagram && (
                    <div className="flex items-center space-x-2">
                      <Instagram className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`https://instagram.com/${business.socialLinks.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        @{business.socialLinks.instagram}
                      </a>
                    </div>
                  )}
                  
                  {business.socialLinks.facebook && (
                    <div className="flex items-center space-x-2">
                      <Facebook className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`https://facebook.com/${business.socialLinks.facebook}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        @{business.socialLinks.facebook}
                      </a>
                    </div>
                  )}
                  
                  {business.socialLinks.twitter && (
                    <div className="flex items-center space-x-2">
                      <Twitter className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`https://twitter.com/${business.socialLinks.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        @{business.socialLinks.twitter}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No social media links provided.</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
              <Button className="w-full justify-start" variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              
              <Button className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                View Deals
              </Button>
              
              {business.status === "approved" && (
                <Button className="w-full justify-start" variant="outline">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Flag Account
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}