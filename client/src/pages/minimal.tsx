import { useEffect, useState } from "react";
import { useLocation } from "wouter";

/**
 * Minimal test page to diagnose React rendering issues
 */
export default function MinimalPage() {
  const [environment, setEnvironment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [location] = useLocation();

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
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-6">Pinnity Minimal Test Page</h1>
        
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">React Component Status</h2>
          <p className="mb-4 text-muted-foreground">
            This is a minimal React page to test rendering in the Replit environment.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-background rounded p-4 border">
              <h3 className="font-medium mb-2">Component Details:</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="font-medium">Current Route:</span>{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">{location}</code>
                </li>
                <li>
                  <span className="font-medium">Window Size:</span>{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">
                    {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'}
                  </code>
                </li>
                <li>
                  <span className="font-medium">User Agent:</span>{" "}
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">
                    {typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'N/A'}
                  </code>
                </li>
                <li>
                  <span className="font-medium">Online Status:</span>{" "}
                  <span className={typeof navigator !== 'undefined' && navigator.onLine ? "text-green-500" : "text-red-500"}>
                    {typeof navigator !== 'undefined' && navigator.onLine ? "Online ✅" : "Offline ❌"}
                  </span>
                </li>
              </ul>
            </div>
            
            <div className="bg-background rounded p-4 border">
              <h3 className="font-medium mb-2">Runtime Status:</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">React Loaded:</span>{" "}
                  <span className="text-green-500">Yes ✅</span>
                </div>
                <div>
                  <span className="font-medium">Styling Applied:</span>{" "}
                  <span className="text-green-500">Yes ✅</span>
                </div>
                <div>
                  <span className="font-medium">API Connection:</span>{" "}
                  {loading ? (
                    <span className="text-amber-500">Checking...</span>
                  ) : error ? (
                    <span className="text-red-500">Failed ❌</span>
                  ) : (
                    <span className="text-green-500">Connected ✅</span>
                  )}
                </div>
                <div>
                  <span className="font-medium">Rendering:</span>{" "}
                  <span className="text-green-500">Successful ✅</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Environment Information */}
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Information</h2>
          {loading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-red-700">Error: {error}</p>
              <p className="text-sm text-red-600 mt-2">
                Unable to fetch environment information from the API.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <pre className="bg-muted p-4 rounded text-xs">{JSON.stringify(environment, null, 2)}</pre>
            </div>
          )}
        </div>
        
        {/* Navigation Links */}
        <div className="bg-card rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Navigation</h2>
          <p className="mb-4 text-muted-foreground">
            Try these links to test other parts of the application:
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="/" className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded">
              Home Page
            </a>
            <a href="/auth" className="bg-secondary hover:bg-secondary/90 text-white px-4 py-2 rounded">
              Auth Page
            </a>
            <a href="/test.html" className="bg-muted hover:bg-muted/80 px-4 py-2 rounded">
              Static Test Page
            </a>
          </div>
        </div>
        
        {/* Version Information */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Pinnity Diagnostic Page • {new Date().toISOString().split('T')[0]}</p>
        </div>
      </div>
    </div>
  );
}