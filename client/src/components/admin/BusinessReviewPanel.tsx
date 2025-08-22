import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  MessageSquare, 
  ClipboardList, 
  Calendar, 
  Clock,
  ArrowUpRight,
  Globe,
  MapPin,
  Mail,
  Phone,
  Store,
  Instagram,
  Facebook,
  Twitter
} from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";

// Interfaces
interface Business {
  id: number;
  businessName: string;
  businessCategory: string;
  appliedDate: string;
  status: "new" | "in_review" | "approved" | "rejected";
  verificationStatus: string;
  verificationFeedback?: string;
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
}

interface BusinessReviewPanelProps {
  business: Business;
  onStatusChange?: (status: string, feedback?: string) => void;
}

export default function BusinessReviewPanel({ business, onStatusChange }: BusinessReviewPanelProps) {
  const queryClient = useQueryClient();
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [requestInfoDialogOpen, setRequestInfoDialogOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // Mutations for updating business status
  const approveMutation = useMutation({
    mutationFn: async ({ businessId, feedback }: { businessId: number, feedback?: string }) => {
      // In a real app, this would be an API call
      console.log(`Approving business ${businessId} with feedback: ${feedback}`);
      return { success: true };
    },
    onSuccess: () => {
      // Call the parent callback
      if (onStatusChange) {
        onStatusChange("approved", feedbackMessage);
      }
      
      // Close dialog and reset form
      setApproveDialogOpen(false);
      setFeedbackMessage("");
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendor', business.id] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ businessId, feedback }: { businessId: number, feedback: string }) => {
      // In a real app, this would be an API call
      console.log(`Rejecting business ${businessId} with feedback: ${feedback}`);
      return { success: true };
    },
    onSuccess: () => {
      // Call the parent callback
      if (onStatusChange) {
        onStatusChange("rejected", feedbackMessage);
      }
      
      // Close dialog and reset form
      setRejectDialogOpen(false);
      setFeedbackMessage("");
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendor', business.id] });
    }
  });

  const requestInfoMutation = useMutation({
    mutationFn: async ({ businessId, message }: { businessId: number, message: string }) => {
      // In a real app, this would be an API call
      console.log(`Requesting more info from business ${businessId}: ${message}`);
      return { success: true };
    },
    onSuccess: () => {
      // Call the parent callback
      if (onStatusChange) {
        onStatusChange("in_review", feedbackMessage);
      }
      
      // Close dialog and reset form
      setRequestInfoDialogOpen(false);
      setFeedbackMessage("");
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendor', business.id] });
    }
  });

  // Handle approve business
  const handleApprove = () => {
    approveMutation.mutate({ 
      businessId: business.id,
      feedback: feedbackMessage
    });
  };

  // Handle reject business
  const handleReject = () => {
    if (feedbackMessage.trim()) {
      rejectMutation.mutate({ 
        businessId: business.id,
        feedback: feedbackMessage
      });
    }
  };

  // Handle request info
  const handleRequestInfo = () => {
    if (feedbackMessage.trim()) {
      requestInfoMutation.mutate({ 
        businessId: business.id,
        message: feedbackMessage
      });
    }
  };

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

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Business Review</CardTitle>
          <CardDescription>
            Review business information and update status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col space-y-1">
              <div className="text-sm font-medium">Status</div>
              <div>
                {getStatusBadge(business.status)}
              </div>
            </div>
            
            <div className="flex flex-col space-y-1">
              <div className="text-sm font-medium">Applied Date</div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                {formatDate(business.appliedDate)}
              </div>
            </div>

            {business.verificationFeedback && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Verification Feedback</AlertTitle>
                <AlertDescription>{business.verificationFeedback}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="text-sm font-medium">Contact Information</div>
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{business.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{business.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{business.address}</span>
                </div>
                {business.websiteUrl && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={business.websiteUrl.startsWith('http') ? business.websiteUrl : `https://${business.websiteUrl}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center"
                    >
                      {business.websiteUrl}
                      <ArrowUpRight className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            {business.socialLinks && Object.values(business.socialLinks).some(Boolean) && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Social Media</div>
                <div className="flex flex-wrap gap-3">
                  {business.socialLinks.instagram && (
                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href={`https://instagram.com/${business.socialLinks.instagram}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        <Instagram className="h-4 w-4 mr-2" />
                        {business.socialLinks.instagram}
                      </a>
                    </Button>
                  )}
                  {business.socialLinks.facebook && (
                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href={`https://facebook.com/${business.socialLinks.facebook}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        <Facebook className="h-4 w-4 mr-2" />
                        {business.socialLinks.facebook}
                      </a>
                    </Button>
                  )}
                  {business.socialLinks.twitter && (
                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href={`https://twitter.com/${business.socialLinks.twitter}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        <Twitter className="h-4 w-4 mr-2" />
                        {business.socialLinks.twitter}
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Action History</div>
              <div className="rounded-md border p-3">
                {/* In a real app, this would be populated with actual action history */}
                <div className="flex items-center gap-2 py-2 border-b">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm">Application submitted</div>
                    <div className="text-xs text-muted-foreground">{formatDate(business.appliedDate)}</div>
                  </div>
                </div>
                {business.status === "in_review" && (
                  <div className="flex items-center gap-2 py-2">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm">Initial review started</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(new Date(new Date(business.appliedDate).getTime() + 86400000).toISOString())}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        {(business.status === "new" || business.status === "in_review") && (
          <CardFooter className="flex flex-col sm:flex-row gap-3 border-t pt-6">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => setRequestInfoDialogOpen(true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Request Info
            </Button>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto text-red-600"
              onClick={() => setRejectDialogOpen(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button 
              className="w-full sm:w-auto text-green-600"
              variant="outline"
              onClick={() => setApproveDialogOpen(true)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Business</DialogTitle>
            <DialogDescription>
              This will approve {business.businessName} and allow them to start posting deals.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div className="rounded-md bg-green-50 text-green-700 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium">Approval Confirmation</h3>
                  <p className="text-sm">
                    Please ensure all verification documents have been reviewed and approved 
                    before approving this business.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Approval Message (Optional)</h3>
                <Textarea
                  placeholder="Enter a message to send to the business..."
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This message will be included in the approval notification.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove}>
              Approve Business
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Business</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {business.businessName}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div className="rounded-md bg-red-50 text-red-700 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium">Rejection Confirmation</h3>
                  <p className="text-sm">
                    This action will prevent the business from posting deals on the platform.
                    The business will be notified of this rejection.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Rejection Reason</h3>
                <Textarea
                  placeholder="Explain why this business is being rejected..."
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be sent to the business.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!feedbackMessage.trim()}
            >
              Reject Business
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Info Dialog */}
      <Dialog open={requestInfoDialogOpen} onOpenChange={setRequestInfoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Additional Information</DialogTitle>
            <DialogDescription>
              Request more information from {business.businessName}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Message to Business</h3>
              <Textarea
                placeholder="Specify what additional information you need from the business..."
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Be specific about what information or documentation you need.
              </p>
            </div>
            
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium">Common Requests</h3>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFeedbackMessage(prev => 
                    prev + (prev ? '\n\n' : '') + 'Please provide additional identification documents.'
                  )}
                >
                  ID Documents
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFeedbackMessage(prev => 
                    prev + (prev ? '\n\n' : '') + 'We need more details about your business operations.'
                  )}
                >
                  Business Details
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFeedbackMessage(prev => 
                    prev + (prev ? '\n\n' : '') + 'Please provide your current business license or permit.'
                  )}
                >
                  Business License
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestInfoDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRequestInfo}
              disabled={!feedbackMessage.trim()}
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}