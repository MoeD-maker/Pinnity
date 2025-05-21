import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function TestTermsPage() {
  const [formData, setFormData] = useState({
    termsAccepted: false
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Using different submission methods to test
  const submitWithFetch = async () => {
    setLoading(true);
    try {
      console.log("Submitting with fetch:", formData);
      const response = await fetch("/api/test/terms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      console.log("Response:", data);
      setResult(data);
      
      toast({
        title: "Response received",
        description: `Terms status: ${data.summary}`
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to submit form",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle checkbox change
  const handleCheckboxChange = (checked: boolean | "indeterminate") => {
    console.log("Checkbox state changed:", checked);
    setFormData(prev => ({
      ...prev,
      termsAccepted: checked === true
    }));
  };

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Terms of Service Test Page</h1>
      
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">State Debugging</h2>
        <div className="space-y-2 mb-4">
          <div>
            <strong>Current formData:</strong>{" "}
            {JSON.stringify(formData, null, 2)}
          </div>
          <div>
            <strong>termsAccepted type:</strong>{" "}
            {typeof formData.termsAccepted}
          </div>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Form</h2>
        
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="test-terms" 
              checked={formData.termsAccepted}
              onCheckedChange={handleCheckboxChange}
            />
            <label htmlFor="test-terms" className="text-sm font-medium">
              I accept the Terms of Service
            </label>
          </div>
          
          <Button 
            onClick={submitWithFetch}
            disabled={loading}
            className="mr-2"
          >
            {loading ? "Submitting..." : "Submit with Fetch"}
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Result</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}