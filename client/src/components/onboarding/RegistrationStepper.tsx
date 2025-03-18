import { CheckCircle, Circle } from "lucide-react";

interface RegistrationStepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export default function RegistrationStepper({ 
  steps, 
  currentStep, 
  className = "" 
}: RegistrationStepperProps) {
  return (
    <div className={`w-full mb-8 ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="flex items-center">
              {index < currentStep ? (
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#00796B] text-white">
                  <CheckCircle className="w-5 h-5" />
                </div>
              ) : index === currentStep ? (
                <div className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-[#00796B] text-[#00796B]">
                  <span className="text-sm font-medium">{index + 1}</span>
                </div>
              ) : (
                <div className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-gray-300 text-gray-400">
                  <span className="text-sm font-medium">{index + 1}</span>
                </div>
              )}
              
              {/* Connect with line if not last step */}
              {index < steps.length - 1 && (
                <div
                  className={`h-1 w-10 md:w-20 ${
                    index < currentStep ? "bg-[#00796B]" : "bg-gray-300"
                  }`}
                ></div>
              )}
            </div>
            
            <span 
              className={`mt-2 text-xs md:text-sm ${
                index === currentStep 
                  ? "font-medium text-[#00796B]" 
                  : index < currentStep 
                    ? "font-medium text-gray-600" 
                    : "text-gray-400"
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}