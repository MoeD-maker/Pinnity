import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import IndividualSignupForm from "./IndividualSignupForm";
import FocusedIndividualSignupForm from "./FocusedIndividualSignupForm";
import BusinessSignupForm from "./BusinessSignupForm";
import { Building, User } from "lucide-react";

export default function SignupForm() {
  const [userType, setUserType] = useState<"individual" | "business">("individual");

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <p className="mb-3 text-sm font-medium text-gray-500">I am signing up as a:</p>
        <RadioGroup 
          defaultValue="individual"
          value={userType} 
          onValueChange={(value) => setUserType(value as "individual" | "business")}
          className="flex space-x-4"
        >
          <div className="flex-1">
            <div className={`p-4 border rounded-md text-center hover:border-[#00796B] transition-colors duration-200 cursor-pointer ${
              userType === "individual" ? "border-[#00796B] bg-[#F5F9F9]" : "border-gray-200"
            }`}>
              <Label htmlFor="individual" className="flex flex-col items-center cursor-pointer w-full">
                <User className={`h-6 w-6 mb-2 ${userType === "individual" ? "text-[#00796B]" : "text-gray-400"}`} />
                <RadioGroupItem 
                  value="individual" 
                  id="individual" 
                  className="sr-only" 
                />
                <span className="text-sm font-medium text-gray-700">Individual</span>
              </Label>
            </div>
          </div>
          
          <div className="flex-1">
            <div className={`p-4 border rounded-md text-center hover:border-[#00796B] transition-colors duration-200 cursor-pointer ${
              userType === "business" ? "border-[#00796B] bg-[#F5F9F9]" : "border-gray-200"
            }`}>
              <Label htmlFor="business" className="flex flex-col items-center cursor-pointer w-full">
                <Building className={`h-6 w-6 mb-2 ${userType === "business" ? "text-[#00796B]" : "text-gray-400"}`} />
                <RadioGroupItem 
                  value="business" 
                  id="business" 
                  className="sr-only" 
                />
                <span className="text-sm font-medium text-gray-700">Business</span>
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {userType === "individual" ? (
        // Use our new focused form for testing
        <FocusedIndividualSignupForm />
      ) : (
        <BusinessSignupForm setUserType={setUserType} />
      )}
    </div>
  );
}
