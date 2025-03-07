import React from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Bug, Home } from "lucide-react";

export default function NotFound() {
  const [location] = useLocation();
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <div className="mt-4 space-y-4">
            <p className="text-gray-600">
              The page you're looking for doesn't exist or was moved.
            </p>
            
            <div className="bg-gray-100 p-4 rounded-md">
              <h2 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Bug className="h-4 w-4" /> Debugging Information
              </h2>
              <div className="text-xs font-mono bg-white p-2 rounded border border-gray-200">
                <p><strong>Current Path:</strong> {location}</p>
                <p><strong>Full URL:</strong> {window.location.href}</p>
                <p><strong>Referrer:</strong> {document.referrer || "None"}</p>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <div className="flex items-center gap-2 w-full">
                  <Home className="h-4 w-4" />
                  <span>Go Home</span>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" size="sm" asChild>
              <Link href="/test-page">
                <div className="flex items-center gap-2 w-full">
                  <Bug className="h-4 w-4" />
                  <span>Test Page</span>
                </div>
              </Link>
            </Button>
          </div>
          
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="w-full">
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back</span>
            </div>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
