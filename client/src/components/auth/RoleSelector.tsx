import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { User, Building } from "lucide-react";

interface RoleSelectorProps {
  role: "individual" | "vendor";
  onRoleChange: (role: "individual" | "vendor") => void;
  className?: string;
}

export function RoleSelector({ role, onRoleChange, className = "" }: RoleSelectorProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-3">I want to sign up as:</p>
        <RadioGroup 
          value={role} 
          onValueChange={onRoleChange}
          className="flex space-x-4"
        >
          <div className="flex-1">
            <div className={`p-4 border rounded-md text-center hover:border-[#00796B] transition-colors duration-200 cursor-pointer ${
              role === "individual" ? "border-[#00796B] bg-[#F5F9F9]" : "border-gray-200"
            }`}>
              <Label htmlFor="individual" className="flex flex-col items-center cursor-pointer w-full">
                <User className={`h-6 w-6 mb-2 ${role === "individual" ? "text-[#00796B]" : "text-gray-400"}`} />
                <RadioGroupItem 
                  value="individual" 
                  id="individual" 
                  className="sr-only" 
                />
                <span className="text-sm font-medium text-gray-700">Individual User</span>
                <span className="text-xs text-gray-500 mt-1">Browse and save deals</span>
              </Label>
            </div>
          </div>
          
          <div className="flex-1">
            <div className={`p-4 border rounded-md text-center hover:border-[#00796B] transition-colors duration-200 cursor-pointer ${
              role === "vendor" ? "border-[#00796B] bg-[#F5F9F9]" : "border-gray-200"
            }`}>
              <Label htmlFor="vendor" className="flex flex-col items-center cursor-pointer w-full">
                <Building className={`h-6 w-6 mb-2 ${role === "vendor" ? "text-[#00796B]" : "text-gray-400"}`} />
                <RadioGroupItem 
                  value="vendor" 
                  id="vendor" 
                  className="sr-only" 
                />
                <span className="text-sm font-medium text-gray-700">Business Vendor</span>
                <span className="text-xs text-gray-500 mt-1">Create and manage deals</span>
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>
      
      {role === "individual" && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-xs text-blue-800">
            <strong>Coming Soon:</strong> Individual user access is currently limited. 
            We'll email you when we're live for everyone!
          </p>
        </div>
      )}
      
      {role === "vendor" && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-xs text-green-800">
            <strong>Active:</strong> Business vendors can sign up and start creating deals immediately.
          </p>
        </div>
      )}
    </div>
  );
}