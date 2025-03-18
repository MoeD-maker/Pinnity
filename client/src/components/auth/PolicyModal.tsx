import { X } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PolicyModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  type: "terms" | "privacy";
}

export function PolicyModal({ title, isOpen, onClose, type }: PolicyModalProps) {
  const [content, setContent] = useState<JSX.Element | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only load the content when the modal is opened to improve performance
    if (isOpen) {
      setLoading(true);
      
      // Dynamically import the content based on the type
      const loadContent = async () => {
        try {
          if (type === "terms") {
            const TermsContent = (await import("@/pages/terms")).default;
            setContent(<TermsContent />);
          } else if (type === "privacy") {
            const PrivacyContent = (await import("@/pages/privacy")).default;
            setContent(<PrivacyContent />);
          }
        } catch (error) {
          console.error("Failed to load policy content:", error);
          setContent(
            <div className="p-4 text-red-500">
              Failed to load content. Please try again later.
            </div>
          );
        } finally {
          setLoading(false);
        }
      };

      loadContent();
    }
  }, [isOpen, type]);

  // Extract just the content part without the back button and header
  const extractContentOnly = () => {
    if (!content) return null;
    
    // Clone the content element and find the prose div
    const contentEl = document.createElement("div");
    contentEl.innerHTML = (content as any).props.children.props?.children || "";
    
    // Return just the prose content
    return (
      <div className="prose prose-green max-w-none">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00796B]"></div>
          </div>
        ) : (
          // Simplified version - we would normally use the extracted content
          type === "terms" ? (
            <div className="prose prose-green max-w-none">
              <h2>1. Introduction</h2>
              <p>
                Welcome to Pinnity. These Terms of Service govern your use of the Pinnity website, mobile application, and services.
              </p>
              
              <h2>2. Accounts</h2>
              <p>
                When you create an account with us, you must provide information that is accurate, complete, and current at all times.
              </p>
              
              <h2>3. Content</h2>
              <p>
                Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material.
              </p>
              
              <h2>4. Deal Redemption</h2>
              <p>
                Pinnity offers a platform for businesses to provide special offers and deals to users. The redemption of these Deals is subject to the terms specified by the offering business.
              </p>
              
              {/* More sections would be here */}
              <p className="text-sm text-blue-600 mt-4">
                <a href="/terms" target="_blank" rel="noopener noreferrer">
                  View full Terms of Service
                </a>
              </p>
            </div>
          ) : (
            <div className="prose prose-green max-w-none">
              <h2>1. Introduction</h2>
              <p>
                Pinnity is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.
              </p>
              
              <h2>2. Information We Collect</h2>
              <p>
                We collect several different types of information for various purposes to provide and improve our Service to you.
              </p>
              
              <h2>3. How We Use Your Information</h2>
              <p>
                We use the collected data for various purposes including providing and maintaining our Service, and notifying you about changes.
              </p>
              
              <h2>4. Security of Data</h2>
              <p>
                The security of your data is important to us. All personal data is encrypted both in transit and at rest.
              </p>
              
              {/* More sections would be here */}
              <p className="text-sm text-blue-600 mt-4">
                <a href="/privacy" target="_blank" rel="noopener noreferrer">
                  View full Privacy Policy
                </a>
              </p>
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between pr-0">
          <DialogTitle>{title}</DialogTitle>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>
        <ScrollArea className="h-[60vh] overflow-y-auto pr-3">
          {extractContentOnly()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}