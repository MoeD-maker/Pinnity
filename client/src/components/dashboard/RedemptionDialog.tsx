import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface RedemptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: number;
  dealTitle: string;
  businessName: string;
  onRedeemSuccess: () => void;
}

export default function RedemptionDialog({
  isOpen,
  onClose,
  dealId,
  dealTitle,
  businessName,
  onRedeemSuccess
}: RedemptionDialogProps) {
  const [redemptionCode, setRedemptionCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();

  const handleVerifyCode = async () => {
    if (!redemptionCode.trim()) {
      setErrorMessage('Please enter a redemption code');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setErrorMessage('');

    try {
      console.log(`Verifying deal code for dealId ${dealId}:`, redemptionCode.trim());
      
      const response = await apiRequest(`/api/v1/deals/${dealId}/verify-code`, {
        method: 'POST',
        data: { code: redemptionCode.trim() }
      });

      console.log('Verification response:', response);

      if (response && response.valid) {
        setVerificationResult('success');
        
        // If verify-code endpoint already created the redemption, we don't need to create another one
        if (!response.redemption) {
          // After successful verification, create the redemption manually
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const userId = user?.id || user?.userId;
          
          if (userId) {
            await apiRequest(`/api/v1/user/${userId}/redemptions`, {
              method: 'POST',
              data: { dealId }
            });
          }
        }
        
        setTimeout(() => {
          onRedeemSuccess();
          toast({
            title: "Deal Redeemed!",
            description: "You have successfully redeemed this deal.",
          });
          onClose();
        }, 1500);
      } else {
        setVerificationResult('error');
        setErrorMessage('Invalid redemption code. Please check and try again.');
      }
    } catch (error) {
      console.error('Error verifying redemption code:', error);
      setVerificationResult('error');
      setErrorMessage('Failed to verify the redemption code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setRedemptionCode('');
    setVerificationResult(null);
    setErrorMessage('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Redeem Deal</DialogTitle>
          <DialogDescription>
            Enter the redemption code provided by {businessName} to validate your deal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-1">{dealTitle}</h3>
            <p className="text-sm text-muted-foreground">{businessName}</p>
          </div>

          {verificationResult === 'success' ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium text-lg">Redemption Successful!</h3>
              <p className="text-sm text-center text-muted-foreground">
                Your deal has been successfully redeemed.
              </p>
            </div>
          ) : verificationResult === 'error' ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="font-medium text-lg">Verification Failed</h3>
              <p className="text-sm text-center text-red-600">
                {errorMessage}
              </p>
              <Button variant="outline" onClick={handleReset}>
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="redemptionCode">Redemption Code</Label>
                <div className="flex space-x-2">
                  <Input
                    id="redemptionCode"
                    placeholder="Enter code provided by vendor"
                    value={redemptionCode}
                    onChange={(e) => setRedemptionCode(e.target.value)}
                    className="text-center font-mono text-lg"
                    maxLength={8}
                    disabled={isVerifying}
                  />
                </div>
                {errorMessage && (
                  <p className="text-sm text-red-600">{errorMessage}</p>
                )}
              </div>

              <div className="text-sm space-y-2 text-muted-foreground">
                <h4 className="font-medium">How to redeem:</h4>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Show the deal to the business staff</li>
                  <li>Ask for their unique redemption code</li>
                  <li>Enter the code above to validate</li>
                </ol>
              </div>
            </>
          )}
        </div>

        {!verificationResult && (
          <DialogFooter className="flex-col sm:flex-row sm:justify-between">
            <Button 
              variant="secondary" 
              onClick={onClose} 
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleVerifyCode}
              disabled={!redemptionCode.trim() || isVerifying || verificationResult === 'success'}
              className="bg-[#00796B] hover:bg-[#00695C]"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Redeem'
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}