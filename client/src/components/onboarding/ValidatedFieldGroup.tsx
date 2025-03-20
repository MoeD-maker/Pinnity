import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useValidatedOnboarding } from "./ValidatedOnboardingProvider";

interface ValidatedFieldGroupProps {
  id?: string;
  className?: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
  fieldNames: string[];
  showValidationStatus?: boolean;
  cardFooter?: React.ReactNode;
}

export function ValidatedFieldGroup({
  id,
  className,
  title,
  description,
  children,
  fieldNames,
  showValidationStatus = true,
  cardFooter
}: ValidatedFieldGroupProps) {
  const { form, validation } = useValidatedOnboarding();
  
  // Check if all fields in this group are valid
  const hasErrors = fieldNames.some(field => {
    const error = form.formState.errors[field];
    return !!error;
  });
  
  // Get only fields that have been touched or changed
  const touchedFields = fieldNames.filter(field => 
    form.formState.touchedFields[field] || form.formState.dirtyFields[field]
  );
  
  // Only show validation status if fields have been interacted with
  const showStatus = showValidationStatus && touchedFields.length > 0;
  
  // Get all error messages for fields in this group
  const errorMessages = fieldNames
    .map(field => validation.getFieldError(field))
    .filter(Boolean);
  
  return (
    <Card id={id} className={cn("w-full", className)}>
      {(title || description) && (
        <CardHeader className="pb-4">
          {title && <CardTitle className="text-xl font-semibold">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      
      <CardContent className="space-y-4">
        {children}
        
        {showStatus && (
          <>
            {hasErrors ? (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Validation Issues</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {errorMessages.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : touchedFields.length === fieldNames.length && (
              <Alert variant="default" className="mt-4 bg-green-50 border-green-200 text-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">All fields valid</AlertTitle>
                <AlertDescription className="text-green-700">
                  All required information has been correctly provided.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
      
      {cardFooter && <CardFooter>{cardFooter}</CardFooter>}
    </Card>
  );
}