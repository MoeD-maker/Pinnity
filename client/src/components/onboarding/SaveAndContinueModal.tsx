import { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, BookmarkIcon, Copy, Calendar, ArrowRightCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FormPersistenceMetadata } from '@/hooks/useFormPersistence';
import { useLocation } from 'wouter';

interface SaveAndContinueModalProps {
  onSave: () => Promise<boolean>;
  metadata: FormPersistenceMetadata;
  userEmail?: string;
  className?: string;
}

export function SaveAndContinueModal({
  onSave,
  metadata,
  userEmail,
  className = ''
}: SaveAndContinueModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [saveCompleted, setSaveCompleted] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Reset state when dialog is opened
  useEffect(() => {
    if (open) {
      setSaveCompleted(false);
      setIsCopied(false);
    }
  }, [open]);
  
  const handleSave = async () => {
    setLoading(true);
    
    try {
      const success = await onSave();
      
      if (success) {
        // Send email notification if selected
        if (sendEmail && userEmail) {
          // In a real implementation, we would call an API to send an email
          console.log('Would send email to:', userEmail);
        }
        
        setSaveCompleted(true);
        
        toast({
          title: "Progress saved successfully",
          description: "You can continue where you left off later",
        });
      } else {
        throw new Error('Failed to save progress');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      toast({
        title: "Failed to save progress",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const copyLinkToClipboard = () => {
    // Create a resumable link (in a real app, this could include a special token)
    const resumeLink = `${window.location.origin}/onboarding?resume=true`;
    
    navigator.clipboard.writeText(resumeLink)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        
        toast({
          title: "Link copied to clipboard",
          description: "Share or save this link to continue later",
        });
      })
      .catch((error) => {
        console.error('Error copying to clipboard:', error);
        toast({
          title: "Failed to copy link",
          description: "Please try again or manually save the URL",
          variant: "destructive"
        });
      });
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <BookmarkIcon className="h-4 w-4 mr-2" />
          Save & Continue Later
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {saveCompleted 
              ? "Your progress has been saved" 
              : "Save your progress"
            }
          </DialogTitle>
          <DialogDescription>
            {saveCompleted 
              ? "You can return and continue completing this form later." 
              : "Don't have time to finish now? Save your progress and continue later."
            }
          </DialogDescription>
        </DialogHeader>
        
        {!saveCompleted ? (
          <>
            <div className="grid gap-4 py-4">
              {userEmail && (
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="send-email" 
                    checked={sendEmail} 
                    onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                  />
                  <div className="grid gap-1.5">
                    <Label htmlFor="send-email" className="font-normal">
                      Send me an email with a link to continue
                    </Label>
                    <p className="text-sm text-gray-500">
                      We'll send a reminder to {userEmail}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col space-y-2">
                <p className="text-sm text-gray-500">
                  Your progress will be saved automatically. You can return to continue this form using the same device and browser.
                </p>
              </div>
            </div>
            
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={loading || metadata.saveStatus === 'saving'}
              >
                {loading || metadata.saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save progress
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="grid gap-6 py-4">
              <div className="bg-green-50 border border-green-100 rounded-md p-3 flex items-center gap-3">
                <div className="bg-green-100 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Progress saved successfully
                  </p>
                  <p className="text-xs text-green-600">
                    {metadata.lastSaved 
                      ? `Last saved: ${new Date(metadata.lastSaved).toLocaleString()}` 
                      : 'Saved just now'
                    }
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Return link</Label>
                  <div className="mt-1.5 flex gap-2">
                    <Input 
                      readOnly 
                      value={`${window.location.origin}/onboarding?resume=true`}
                      className="text-sm"
                    />
                    <Button 
                      type="button" 
                      size="icon"
                      variant="outline"
                      onClick={copyLinkToClipboard}
                      className="flex-shrink-0"
                    >
                      {isCopied ? (
                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>Your progress will be saved for 24 hours</span>
                </div>
              </div>
            </div>
            
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/')}
              >
                Exit to home
              </Button>
              <Button
                type="button"
                onClick={() => setOpen(false)}
              >
                <ArrowRightCircle className="mr-2 h-4 w-4" />
                Continue form
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}