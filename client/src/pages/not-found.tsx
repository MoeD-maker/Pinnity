import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Bug, Home, FileCode, FileJson, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NotFound() {
  const [location] = useLocation();
  const [environment, setEnvironment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchEnvironment() {
      try {
        const response = await fetch('/api/environment');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setEnvironment(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching environment:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchEnvironment();
    console.log("Not Found page loaded - Path:", location);
  }, [location]);
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
            <CardTitle className="text-2xl font-bold text-gray-900">404 Page Not Found</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="mt-2 space-y-4">
            <p className="text-gray-600">
              The page you're looking for doesn't exist or has been moved. This enhanced 404 page includes
              debugging tools to help diagnose routing issues in the Replit environment.
            </p>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
                <TabsTrigger value="environment">Environment</TabsTrigger>
              </TabsList>
            
              <TabsContent value="basic">
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h2 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Bug className="h-4 w-4" /> Basic Debugging Information
                  </h2>
                  <div className="text-xs font-mono bg-white p-3 rounded border border-gray-200 space-y-1">
                    <p><strong>Current Path:</strong> {location}</p>
                    <p><strong>Full URL:</strong> {window.location.href}</p>
                    <p><strong>Referrer:</strong> {document.referrer || "None"}</p>
                    <p><strong>User Agent:</strong> {navigator.userAgent.substring(0, 60)}...</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="technical">
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h2 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileCode className="h-4 w-4" /> Technical Details
                  </h2>
                  <div className="text-xs font-mono bg-white p-3 rounded border border-gray-200 space-y-1 max-h-60 overflow-y-auto">
                    <p><strong>Window Location:</strong></p>
                    <pre className="text-xs overflow-x-auto p-2 bg-gray-50 rounded">
                      {JSON.stringify({
                        href: window.location.href,
                        origin: window.location.origin,
                        protocol: window.location.protocol,
                        host: window.location.host,
                        hostname: window.location.hostname,
                        port: window.location.port,
                        pathname: window.location.pathname,
                        search: window.location.search,
                        hash: window.location.hash
                      }, null, 2)}
                    </pre>
                    <p className="mt-2"><strong>React Router Location:</strong> {location}</p>
                    <p><strong>Browser Supports History API:</strong> {typeof window.history !== 'undefined' ? 'Yes' : 'No'}</p>
                    <p><strong>History Length:</strong> {window.history.length}</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="environment">
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h2 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileJson className="h-4 w-4" /> Environment Variables
                  </h2>
                  {loading ? (
                    <div className="flex items-center justify-center h-20">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : error ? (
                    <div className="bg-red-50 border-l-4 border-red-500 p-3 text-xs">
                      <p className="text-red-700">Error: {error}</p>
                      <p className="text-red-600 mt-1">
                        Unable to fetch environment information from the API.
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs font-mono bg-white p-3 rounded border border-gray-200 max-h-60 overflow-y-auto">
                      <pre>{JSON.stringify(environment, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-3 gap-3 w-full">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
            
            <Button variant="outline" size="sm" asChild>
              <Link href="/minimal">
                <Bug className="h-4 w-4 mr-2" />
                Minimal Page
              </Link>
            </Button>
            
            <Button variant="outline" size="sm" asChild>
              <a href="/test.html" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Test Page
              </a>
            </Button>
          </div>
          
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
