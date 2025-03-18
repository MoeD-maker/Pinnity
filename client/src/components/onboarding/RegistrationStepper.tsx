import { Check } from "lucide-react";

interface RegistrationStepperProps {
  steps: string[];
  currentStep: number;
}

export function RegistrationStepper({ steps, currentStep }: RegistrationStepperProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center relative w-full">
            {/* Line connector */}
            {index < steps.length - 1 && (
              <div
                className={`absolute top-5 w-full h-1 right-1/2 ${
                  index < currentStep ? "bg-[#00796B]" : "bg-gray-200"
                }`}
              />
            )}
            
            {/* Circle with number or checkmark */}
            <div
              className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                index < currentStep
                  ? "border-[#00796B] bg-[#00796B] text-white"
                  : index === currentStep
                  ? "border-[#00796B] text-[#00796B]"
                  : "border-gray-300 text-gray-400"
              }`}
            >
              {index < currentStep ? (
                <Check className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>
            
            {/* Step label */}
            <span
              className={`mt-2 text-xs font-medium ${
                index <= currentStep ? "text-[#00796B]" : "text-gray-500"
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

export default RegistrationStepper;