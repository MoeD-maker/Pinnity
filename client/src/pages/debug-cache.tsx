import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, RefreshCw, Database, Info } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

export default function DebugCachePage() {
  const [clearStatus, setClearStatus] = useState<string>('');
  const [isClearing, setIsClearing] = useState(false);

  // Test query to verify cache clearing
  const { data: testData, isLoading, refetch } = useQuery({
    queryKey: ['/api/v1/deals/featured', { timestamp: Date.now() }],
    queryFn: async () => {
      const response = await fetch(`/api/v1/deals/featured?_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      return response.json();
    },
    enabled: false // Don't auto-fetch
  });

  const forceClearAllCaches = async () => {
    setIsClearing(true);
    setClearStatus('Clearing all caches...');

    try {
      // Clear React Query cache
      queryClient.clear();
      queryClient.removeQueries();
      queryClient.invalidateQueries();
      
      // Clear all storage types
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear IndexedDB
      if (window.indexedDB) {
        try {
          const databases = await indexedDB.databases();
          await Promise.all(
            databases.map(db => {
              if (db.name) {
                return new Promise((resolve) => {
                  const deleteReq = indexedDB.deleteDatabase(db.name);
                  deleteReq.onsuccess = () => resolve(true);
                  deleteReq.onerror = () => resolve(false);
                  deleteReq.onblocked = () => resolve(false);
                });
              }
            })
          );
        } catch (e) {
          // Fallback for browsers that don't support databases()
          const dbsToDelete = ['localforage', 'pinnity-cache', 'workbox-cache'];
          await Promise.all(
            dbsToDelete.map(dbName => 
              new Promise((resolve) => {
                const deleteReq = indexedDB.deleteDatabase(dbName);
                deleteReq.onsuccess = () => resolve(true);
                deleteReq.onerror = () => resolve(false);
                deleteReq.onblocked = () => resolve(false);
              })
            )
          );
        }
      }
      
      // Clear service worker cache
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });

      setClearStatus('✅ All caches cleared successfully! Click "Test Fresh Data" to verify.');
    } catch (error) {
      setClearStatus(`❌ Error clearing caches: ${error}`);
    } finally {
      setIsClearing(false);
    }
  };

  const testFreshData = async () => {
    setClearStatus('Testing fresh data fetch...');
    try {
      await refetch();
      setClearStatus('✅ Fresh data test completed! Check the response below.');
    } catch (error) {
      setClearStatus(`❌ Error fetching fresh data: ${error}`);
    }
  };

  const reloadPage = () => {
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Cache Debug Tools</h1>
        <p className="text-muted-foreground mt-2">
          Clear browser caches and test fresh data loading
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Cache Clearing
            </CardTitle>
            <CardDescription>
              Force clear all browser caches including React Query, localStorage, IndexedDB, and service worker caches
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={forceClearAllCaches} 
              disabled={isClearing}
              className="w-full"
              variant="destructive"
            >
              {isClearing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Force Clear All Caches
                </>
              )}
            </Button>
            
            <Button 
              onClick={reloadPage} 
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Testing
            </CardTitle>
            <CardDescription>
              Test fresh data fetching to verify cache clearing worked
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testFreshData}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Test Fresh Data
                </>
              )}
            </Button>
            
            {testData && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">API Response:</h4>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(testData, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {clearStatus && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {clearStatus}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>Step 1:</strong> Click "Force Clear All Caches" to remove all cached data</p>
            <p><strong>Step 2:</strong> Click "Test Fresh Data" to verify the API returns clean data</p>
            <p><strong>Step 3:</strong> Click "Reload Page" to start fresh</p>
            <p><strong>Step 4:</strong> Navigate to the Explore page to see if the "Unknown Business" deal is gone</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}