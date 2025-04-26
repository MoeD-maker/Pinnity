import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { FileCheck, FileX, Clock, Download, CheckCircle, XCircle, AlertTriangle, FileText } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Add CSS for the fallback-icon class
const documentPreviewStyles = `
  .fallback-icon {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .fallback-icon::after {
    content: "";
    display: inline-flex;
    width: 20px;
    height: 20px;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z'%3E%3C/path%3E%3Cpolyline points='14 2 14 8 20 8'%3E%3C/polyline%3E%3Cpath d='M16 13H8'%3E%3C/path%3E%3Cpath d='M16 17H8'%3E%3C/path%3E%3Cpath d='M10 9H8'%3E%3C/path%3E%3C/svg%3E");
  }
`;

// Document type
interface Document {
  id: number;
  name: string;
  type: string;
  status: "pending" | "verified" | "rejected";
  uploadDate: string;
  filePath?: string;
  thumbUrl?: string;
  notes?: string;
}

// Props for the DocumentVerification component
interface DocumentVerificationProps {
  businessId: number;
  documents: Document[];
  onDocumentStatusChange?: (documentId: number, status: string, notes?: string) => void;
}

export default function DocumentVerification({ businessId, documents, onDocumentStatusChange }: DocumentVerificationProps) {
  const queryClient = useQueryClient();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentViewOpen, setDocumentViewOpen] = useState(false);
  const [documentFeedback, setDocumentFeedback] = useState("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<"verified" | "rejected">("verified");
  
  // Add the CSS styles to the document
  useEffect(() => {
    // Create a style element for document previews
    const styleEl = document.createElement('style');
    styleEl.innerHTML = documentPreviewStyles;
    document.head.appendChild(styleEl);
    
    // Clean up the style when component unmounts
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Mutation for updating document status
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ documentId, status, notes }: { documentId: number, status: string, notes?: string }) => {
      // In a real app, this would be an API call
      console.log(`Updating document ${documentId} status to ${status} with notes: ${notes}`);
      
      // Mock API response
      return { success: true };
    },
    onSuccess: () => {
      // Update local state through parent callback
      if (selectedDocument && onDocumentStatusChange) {
        onDocumentStatusChange(selectedDocument.id, reviewStatus, documentFeedback);
      }
      
      // Reset UI state
      setReviewDialogOpen(false);
      setDocumentFeedback("");
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['admin', 'vendor', businessId] });
    }
  });

  // Handle document verification
  const handleDocumentReview = () => {
    if (selectedDocument) {
      updateDocumentMutation.mutate({
        documentId: selectedDocument.id,
        status: reviewStatus,
        notes: documentFeedback
      });
    }
  };

  // Get document status badge
  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200"><FileCheck className="h-3 w-3" /> Verified</Badge>;
      case "rejected":
        return <Badge variant="outline" className="flex items-center gap-1 bg-red-50 text-red-700 border-red-200"><FileX className="h-3 w-3" /> Rejected</Badge>;
      case "pending":
      default:
        return <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3" /> Pending</Badge>;
    }
  };

  // Get document type icon
  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case "license":
        return <Badge variant="outline" className="flex items-center gap-1"><FileText className="h-3 w-3" /> License</Badge>;
      case "identification":
        return <Badge variant="outline" className="flex items-center gap-1"><FileText className="h-3 w-3" /> ID</Badge>;
      case "certificate":
        return <Badge variant="outline" className="flex items-center gap-1"><FileText className="h-3 w-3" /> Certificate</Badge>;
      case "tax":
        return <Badge variant="outline" className="flex items-center gap-1"><FileText className="h-3 w-3" /> Tax</Badge>;
      default:
        return <Badge variant="outline" className="flex items-center gap-1"><FileText className="h-3 w-3" /> Document</Badge>;
    }
  };

  // Calculate document statistics
  const pendingCount = documents.filter(doc => doc.status === "pending").length;
  const verifiedCount = documents.filter(doc => doc.status === "verified").length;
  const rejectedCount = documents.filter(doc => doc.status === "rejected").length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Document Verification</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                {pendingCount} Pending
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {verifiedCount} Verified
              </Badge>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                {rejectedCount} Rejected
              </Badge>
            </div>
          </div>
          <CardDescription>
            Verify business documentation for compliance and authenticity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="h-12 w-12 text-muted-foreground opacity-20 mx-auto mb-4" />
              <p className="text-muted-foreground">No documents have been submitted yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 bg-muted rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200">
                      {document.filePath ? (
                        <img 
                          src={document.filePath} 
                          alt={document.name}
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('fallback-icon');
                          }}
                        />
                      ) : document.thumbUrl ? (
                        <img 
                          src={document.thumbUrl} 
                          alt={document.name}
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('fallback-icon');
                          }}
                        />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{document.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {getDocumentTypeIcon(document.type)}
                        {getDocumentStatusBadge(document.status)}
                        <span className="text-xs text-muted-foreground">
                          Uploaded {new Date(document.uploadDate).toLocaleDateString()}
                        </span>
                      </div>
                      {document.notes && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {document.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center flex-shrink-0 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDocument(document);
                        setDocumentViewOpen(true);
                      }}
                    >
                      View
                    </Button>
                    
                    {document.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => {
                            setSelectedDocument(document);
                            setReviewStatus("rejected");
                            setDocumentFeedback("");
                            setReviewDialogOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600"
                          onClick={() => {
                            setSelectedDocument(document);
                            setReviewStatus("verified");
                            setDocumentFeedback("");
                            setReviewDialogOpen(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Verify
                        </Button>
                      </div>
                    )}
                    
                    {document.status !== "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDocument(document);
                          // Reset to verified as default for the form
                          setReviewStatus("verified");
                          setDocumentFeedback("");
                          setReviewDialogOpen(true);
                        }}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Review Again
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {documents.length > 0 && (
          <CardFooter className="flex justify-between border-t pt-6">
            <p className="text-sm text-muted-foreground">
              {verifiedCount === documents.length 
                ? "All documents have been verified" 
                : `${pendingCount} of ${documents.length} documents need review`}
            </p>
          </CardFooter>
        )}
      </Card>

      {/* Document Viewer Dialog */}
      <Dialog open={documentViewOpen} onOpenChange={setDocumentViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.name}</DialogTitle>
            <div className="flex gap-2 mt-2">
              {selectedDocument && getDocumentTypeIcon(selectedDocument.type)}
              {selectedDocument && getDocumentStatusBadge(selectedDocument.status)}
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <div className="border rounded-lg overflow-hidden bg-muted">
              {selectedDocument?.filePath ? (
                // Check if it's an image or PDF 
                selectedDocument.filePath.match(/\.(jpe?g|png|gif|webp)$/i) ? (
                  // For images, display an img tag
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                    <img 
                      src={selectedDocument.filePath} 
                      alt={selectedDocument.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : selectedDocument.filePath.match(/\.pdf$/i) ? (
                  // For PDFs, use an iframe with PDF viewer
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                    <iframe 
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedDocument.filePath)}&embedded=true`}
                      className="w-full h-full"
                      title={selectedDocument.name}
                    />
                  </div>
                ) : (
                  // For other document types, try direct iframe
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                    <iframe 
                      src={selectedDocument.filePath} 
                      className="w-full h-full"
                      title={selectedDocument.name}
                    />
                  </div>
                )
              ) : selectedDocument?.thumbUrl ? (
                // If no filePath but has thumbnail
                <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                  <img 
                    src={selectedDocument.thumbUrl} 
                    alt={selectedDocument.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="aspect-[4/3] bg-muted flex items-center justify-center flex-col gap-4">
                  <FileText className="h-16 w-16 text-muted-foreground opacity-20" />
                  <p className="text-sm text-muted-foreground">Document preview not available</p>
                </div>
              )}
            </div>
            
            {selectedDocument?.notes && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-1">Notes:</h3>
                <p className="text-sm text-muted-foreground">{selectedDocument.notes}</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between items-center gap-4">
            <Button variant="outline" className="mr-auto">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            
            {selectedDocument?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600"
                  onClick={() => {
                    setDocumentViewOpen(false);
                    setReviewStatus("rejected");
                    setReviewDialogOpen(true);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="text-green-600"
                  variant="outline"
                  onClick={() => {
                    setDocumentViewOpen(false);
                    setReviewStatus("verified");
                    setReviewDialogOpen(true);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verify
                </Button>
              </>
            )}
            
            <Button onClick={() => setDocumentViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewStatus === "verified" 
                ? "Verify Document" 
                : reviewStatus === "rejected" 
                  ? "Reject Document" 
                  : "Review Document Again"}
            </DialogTitle>
            <DialogDescription>
              {reviewStatus === "verified" 
                ? "Confirm that this document meets verification requirements" 
                : reviewStatus === "rejected" 
                  ? "Provide a reason for rejecting this document" 
                  : "Set this document for review again"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedDocument && (
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {selectedDocument.filePath ? (
                    <img 
                      src={selectedDocument.filePath} 
                      alt={selectedDocument.name}
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.classList.add('fallback-icon');
                      }}
                    />
                  ) : selectedDocument.thumbUrl ? (
                    <img 
                      src={selectedDocument.thumbUrl} 
                      alt={selectedDocument.name}
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.classList.add('fallback-icon');
                      }}
                    />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-sm">{selectedDocument.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {getDocumentTypeIcon(selectedDocument.type)}
                    <span className="text-xs text-muted-foreground">
                      Uploaded {new Date(selectedDocument.uploadDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="document-feedback">
                {reviewStatus === "verified" 
                  ? "Verification Notes (Optional)" 
                  : reviewStatus === "rejected" 
                    ? "Rejection Reason" 
                    : "Notes"}
              </Label>
              <Textarea
                id="document-feedback"
                placeholder={reviewStatus === "verified" 
                  ? "Add any notes about the verification..." 
                  : reviewStatus === "rejected" 
                    ? "Explain why this document is being rejected..." 
                    : "Add notes about why this document needs review again..."}
                value={documentFeedback}
                onChange={(e) => setDocumentFeedback(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDocumentReview}
              disabled={reviewStatus === "rejected" && !documentFeedback.trim()}
              variant={reviewStatus === "verified" ? "default" : reviewStatus === "rejected" ? "destructive" : "outline"}
            >
              {reviewStatus === "verified" 
                ? "Verify Document" 
                : reviewStatus === "rejected" 
                  ? "Reject Document" 
                  : "Set for Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}