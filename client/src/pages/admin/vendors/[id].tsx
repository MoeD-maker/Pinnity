import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { 
  Store, 
  Briefcase,
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  ClipboardCheck, 
  FileText, 
  Tag,
  Clock,
  ArrowLeft,
  Edit,
  AlertTriangle,
  FileImage,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  // Document URLs from Cloudinary
  governmentId?: string;
  proofOfAddress?: string;
  proofOfBusiness?: string;
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
  const [, params] = useRoute("/admin/vendors/:id");
  const [, navigate] = useLocation();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<string>("pending");
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBusinessData();
  }, []);

  const fetchBusinessData = async () => {
    if (!params?.id) return;
    
    setIsLoading(true);
    try {
      // In a real implementation, fetch the vendor data from the API
      // For now, use mock data for demonstration purposes
      
      // Attempt to fetch from API first
      const response = await apiRequest(`/api/business/${params.id}`);
      
      if (response) {
        // Transform the data to include any additional fields we need for UI
        const businessData = {
          ...response,
          id: parseInt(params.id),
          appliedDate: response.user?.created_at || new Date().toISOString(),
          status: response.status || "new",
          email: response.user?.email || "",
          documents: [
            {
              id: 1,
              name: "Business License",
              type: "license",
              status: "pending",
              uploadDate: new Date().toISOString()
            },
            {
              id: 2,
              name: "Government ID",
              type: "id",
              status: "pending",
              uploadDate: new Date().toISOString()
            },
            {
              id: 3,
              name: "Proof of Address",
              type: "address",
              status: "pending",
              uploadDate: new Date().toISOString()
            }
          ]
        };
        
        setBusiness(businessData);
        setApprovalStatus(businessData.verificationStatus || "pending");
      } else {
        // Fall back to mock data if API fails
        const mockBusiness: Business = {
          id: parseInt(params.id),
          businessName: "Pinnity Coffee",
          businessCategory: "Restaurant",
          appliedDate: new Date().toISOString(),
          status: "new",
          verificationStatus: "pending",
          email: "vendor@test.com",
          phone: "(555) 123-4567",
          address: "123 Main St, Anytown USA",
          description: "Local specialty coffee shop offering artisanal coffee and pastries.",
          websiteUrl: "https://pinnity-coffee.com",
          socialLinks: {
            instagram: "@pinnitycoffee",
            facebook: "pinnitycoffee",
            twitter: "@pinnitycoffee"
          },
          documents: [
            {
              id: 1,
              name: "Business License",
              type: "license",
              status: "pending",
              uploadDate: new Date().toISOString()
            },
            {
              id: 2,
              name: "Government ID",
              type: "id",
              status: "pending",
              uploadDate: new Date().toISOString()
            },
            {
              id: 3,
              name: "Proof of Address",
              type: "address",
              status: "pending",
              uploadDate: new Date().toISOString()
            }
          ]
        };
        
        setBusiness(mockBusiness);
        setApprovalStatus(mockBusiness.verificationStatus);
      }
    } catch (error) {
      console.error("Error fetching business data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch vendor details",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateVerificationStatus = async (status: string) => {
    if (!business) return;
    
    try {
      await apiRequest(`/api/business/${business.id}/verification`, {
        method: "PUT",
        data: {
          status,
          feedback: feedbackText
        }
      });
      
      toast({
        title: "Success",
        description: `Vendor ${status === "approved" ? "approved" : "rejected"} successfully`
      });
      
      // Update local state
      setBusiness({
        ...business,
        verificationStatus: status
      });
      setApprovalStatus(status);
      
      // Close dialogs
      setIsApprovalDialogOpen(false);
      setIsRejectionDialogOpen(false);
      
      // Clear feedback text
      setFeedbackText("");
    } catch (error) {
      console.error("Error updating verification status:", error);
      toast({
        title: "Error",
        description: "Failed to update vendor status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "approved":
        return "text-green-600 bg-green-50 border-green-200";
      case "verified":
        return "text-green-600 bg-green-50 border-green-200";
      case "rejected":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 mr-1" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 mr-1" />;
      case "verified":
        return <ShieldCheck className="h-4 w-4 mr-1" />;
      case "rejected":
        return <XCircle className="h-4 w-4 mr-1" />;
      default:
        return <AlertTriangle className="h-4 w-4 mr-1" />;
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

  if (!business) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Vendor Not Found</h1>
          <p className="text-muted-foreground mb-4">The vendor you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/admin/vendors")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Vendors
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/vendors")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold">{business.businessName}</h1>
          <Badge 
            variant="outline" 
            className={`flex items-center ${getStatusColor(business.verificationStatus)}`}
          >
            {getStatusIcon(business.verificationStatus)}
            {business.verificationStatus.charAt(0).toUpperCase() + business.verificationStatus.slice(1)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate(`/admin/vendors/${business.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          {business.verificationStatus === "pending" || business.verificationStatus === "rejected" ? (
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setIsApprovalDialogOpen(true)}
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Approve
            </Button>
          ) : null}
          {business.verificationStatus === "pending" || business.verificationStatus === "approved" ? (
            <Button 
              variant="destructive"
              onClick={() => setIsRejectionDialogOpen(true)}
            >
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
            <CardDescription>Information about the vendor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Business Name</span>
              <span className="font-medium flex items-center">
                <Store className="h-4 w-4 mr-2 text-muted-foreground" />
                {business.businessName}
              </span>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Category</span>
              <span className="font-medium flex items-center">
                <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                {business.businessCategory}
              </span>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Description</span>
              <p className="text-sm">{business.description || "No description provided"}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Email</span>
                <span className="font-medium flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  {business.email}
                </span>
              </div>
              <div className="flex flex-col space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Phone</span>
                <span className="font-medium flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  {business.phone || "Not provided"}
                </span>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Address</span>
              <span className="font-medium flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                {business.address || "Not provided"}
              </span>
            </div>
            {business.websiteUrl && (
              <div className="flex flex-col space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Website</span>
                <span className="font-medium flex items-center">
                  <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                  <a 
                    href={business.websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {business.websiteUrl}
                  </a>
                </span>
              </div>
            )}
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Application Date</span>
              <span className="font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                {format(new Date(business.appliedDate), "MMMM d, yyyy")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification Status</CardTitle>
            <CardDescription>Current approval status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center py-4">
              {business.verificationStatus === "approved" ? (
                <div className="p-4 bg-green-50 rounded-full mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              ) : business.verificationStatus === "rejected" ? (
                <div className="p-4 bg-red-50 rounded-full mb-4">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 rounded-full mb-4">
                  <Clock className="h-10 w-10 text-yellow-600" />
                </div>
              )}
              <h3 className="text-lg font-semibold mb-1">
                {business.verificationStatus === "approved" 
                  ? "Approved" 
                  : business.verificationStatus === "rejected"
                  ? "Rejected"
                  : "Pending Approval"}
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                {business.verificationStatus === "approved" 
                  ? "This vendor has been verified and can create deals." 
                  : business.verificationStatus === "rejected"
                  ? "This vendor has been rejected and cannot create deals."
                  : "This vendor is waiting for verification."}
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Actions</h4>
              <div className="flex flex-col gap-2">
                {business.verificationStatus === "pending" || business.verificationStatus === "rejected" ? (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                    onClick={() => setIsApprovalDialogOpen(true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Approve Vendor
                  </Button>
                ) : null}
                {business.verificationStatus === "pending" || business.verificationStatus === "approved" ? (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => setIsRejectionDialogOpen(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Reject Vendor
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="documents" className="mb-6">
        <TabsList>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" /> Documents
          </TabsTrigger>
          <TabsTrigger value="deals">
            <Tag className="h-4 w-4 mr-2" /> Deals
          </TabsTrigger>
        </TabsList>
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Verification Documents</CardTitle>
              <CardDescription>
                Documents submitted for business verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {business.documents && business.documents.length > 0 ? (
                  business.documents.map((doc) => (
                    <Card key={doc.id} className="overflow-hidden">
                      <div className="flex flex-col sm:flex-row">
                        <div className="bg-gray-100 p-4 flex items-center justify-center sm:w-1/4 relative overflow-hidden">
                          {/* Get document URL based on document type */}
                          {(() => {
                            // Determine which document URL to use
                            let docUrl;
                            if (doc.name === "Business License" && business.governmentId) {
                              docUrl = business.governmentId;
                            } else if (doc.name === "Government ID" && business.proofOfBusiness) {
                              docUrl = business.proofOfBusiness;
                            } else if (doc.name === "Proof of Address" && business.proofOfAddress) {
                              docUrl = business.proofOfAddress;
                            }
                            
                            if (docUrl) {
                              return (
                                <div className="w-full h-full min-h-[120px] cursor-pointer" 
                                     onClick={() => window.open(docUrl, '_blank')}>
                                  <img 
                                    src={docUrl} 
                                    alt={doc.name} 
                                    className="w-full h-full object-contain hover:opacity-90 transition-opacity"
                                    onError={(e) => {
                                      // Fallback to document icon if image fails to load
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                    }}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity">
                                    <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">Click to view</span>
                                  </div>
                                </div>
                              );
                            } else if (doc.name === "Business License") {
                              return (
                                <div className="flex flex-col items-center">
                                  <FileText className="h-12 w-12 text-gray-400" />
                                  <span className="text-xs text-gray-500 mt-1">License</span>
                                </div>
                              );
                            } else if (doc.name === "Government ID") {
                              return (
                                <div className="flex flex-col items-center">
                                  <FileText className="h-12 w-12 text-gray-400" />
                                  <span className="text-xs text-gray-500 mt-1">ID Document</span>
                                </div>
                              );
                            } else {
                              return (
                                <div className="flex flex-col items-center">
                                  <FileText className="h-12 w-12 text-gray-400" />
                                  <span className="text-xs text-gray-500 mt-1">Address Proof</span>
                                </div>
                              );
                            }
                          })()}
                        </div>
                        <div className="flex flex-col p-4 sm:w-3/4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{doc.name}</h3>
                            <Badge 
                              variant="outline" 
                              className={`flex items-center ${getStatusColor(doc.status)}`}
                            >
                              {getStatusIcon(doc.status)}
                              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Uploaded on {format(new Date(doc.uploadDate), "MMMM d, yyyy")}
                          </p>
                          {doc.notes && (
                            <p className="text-sm italic border-l-2 border-primary pl-2 mt-2">
                              {doc.notes}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-4">
                            {/* View document button */}
                            <Button variant="outline" size="sm"
                              onClick={() => {
                                // Get the appropriate document URL based on document type
                                let docUrl;
                                if (doc.name === "Business License" && business.governmentId) {
                                  docUrl = business.governmentId;
                                } else if (doc.name === "Government ID" && business.proofOfBusiness) {
                                  docUrl = business.proofOfBusiness;
                                } else if (doc.name === "Proof of Address" && business.proofOfAddress) {
                                  docUrl = business.proofOfAddress;
                                }
                                
                                // Open the document in a new tab if URL is available
                                if (docUrl) {
                                  window.open(docUrl, '_blank');
                                } else {
                                  toast({
                                    title: "Document Not Found",
                                    description: "The document file could not be found.",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            >
                              <FileText className="h-3 w-3 mr-1" /> View Full Document
                            </Button>
                            <Button 
                              variant={doc.status === "verified" ? "outline" : "default"}
                              size="sm"
                              className={doc.status === "verified" ? "bg-green-50 text-green-600 hover:bg-green-100 border-green-200" : ""}
                              onClick={() => {
                                // Here we'd handle verification of a specific document
                                // In a real app, we would probably have a separate API for this
                                if (doc.status !== "verified") {
                                  const updatedDocs = business.documents?.map(d => 
                                    d.id === doc.id ? {...d, status: "verified"} : d
                                  );
                                  
                                  setBusiness({
                                    ...business,
                                    documents: updatedDocs
                                  });
                                  
                                  toast({
                                    title: "Document Verified",
                                    description: `${doc.name} has been verified.`
                                  });
                                }
                              }}
                            >
                              {doc.status === "verified" ? 
                                <><CheckCircle className="h-3 w-3 mr-1" /> Verified</> : 
                                <><ShieldCheck className="h-3 w-3 mr-1" /> Verify</>
                              }
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No documents have been submitted</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="deals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Deals</CardTitle>
              <CardDescription>
                Deals created by this vendor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-10">
                <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No deals have been created yet</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Approve Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this vendor? They will be able to create and publish deals.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-6">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Approval Feedback (Optional)</label>
              <Textarea 
                placeholder="Enter any feedback for the vendor..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700" 
              onClick={() => handleUpdateVerificationStatus("approved")}
            >
              Approve Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reject Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this vendor? They will not be able to create and publish deals.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-6">
            <div className="p-3 bg-red-100 rounded-full">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Reason (Required)</label>
              <Textarea 
                placeholder="Explain why this vendor is being rejected..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                required
              />
              {feedbackText.length === 0 && (
                <p className="text-sm text-red-500">Please provide a reason for rejection</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectionDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => handleUpdateVerificationStatus("rejected")}
              disabled={feedbackText.length === 0}
            >
              Reject Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}