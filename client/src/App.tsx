import React, { useState, useEffect, Suspense, lazy } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import MainLayout from "@/components/layout/MainLayout";
import TestLogin from "./test-login";
import SimpleExplorePage from "@/pages/simple-explore";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import UpdateNotification from "@/components/pwa/UpdateNotification";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WifiOff, Wifi, X } from "lucide-react";
import * as localforage from 'localforage';

// Lazy-loaded pages for better performance
const Favorites = lazy(() => import("@/pages/favorites"));
const Profile = lazy(() => import("@/pages/profile"));
const Explore = lazy(() => import("@/pages/explore"));
const Map = lazy(() => import("@/pages/map"));

// Admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/index"));
const AdminVendors = lazy(() => import("@/pages/admin/vendors/index"));
const AdminVendorDetail = lazy(() => import("@/pages/admin/vendors/[id]"));

// Vendor pages
const VendorDashboard = lazy(() => import("@/pages/vendor/index"));
const CreateDeal = lazy(() => import("@/pages/vendor/deals/create"));
const VendorProfile = lazy(() => import("@/pages/vendor/profile"));

// Fallback loading component with better styling
const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
    <p className="text-sm text-muted-foreground">Loading content...</p>
  </div>
);

// Network status alert component with auto-dismiss for online status
function NetworkStatusAlert() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [visible, setVisible] = useState(isOffline); // Only show initially if offline
  
  useEffect(() => {
    // Handle online/offline status changes
    const handleStatusChange = (status: boolean) => {
      setIsOffline(status);
      setVisible(true);
      
      // Auto-hide after 5 seconds if back online
      if (!status) {
        setTimeout(() => setVisible(false), 5000);
      }
    };
    
    // Browser online/offline event listeners
    const handleOnline = () => handleStatusChange(false);
    const handleOffline = () => handleStatusChange(true);
    
    // Custom event listener for programmatic status changes
    const handleStatusEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.hasOwnProperty('isOffline')) {
        handleStatusChange(customEvent.detail.isOffline);
      }
    };
    
    // Register all event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offlineStatusChanged', handleStatusEvent);
    
    // Clean up listeners on component unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offlineStatusChanged', handleStatusEvent);
    };
  }, []);
  
  // Don't render anything if not visible
  if (!visible) return null;
  
  return (
    <Alert 
      className={`fixed top-4 right-4 z-50 max-w-md shadow-lg transition-all duration-300 ${
        isOffline ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
      }`}
      variant={isOffline ? "destructive" : "default"}
    >
      <div className="absolute right-2 top-2">
        <button 
          onClick={() => setVisible(false)} 
          className="p-1 rounded-full hover:bg-gray-200"
          aria-label="Close notification"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <AlertTitle>You're offline</AlertTitle>
          <AlertDescription>
            Limited functionality is available. Your changes will be saved locally and synchronized when you reconnect.
          </AlertDescription>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <AlertTitle>You're back online</AlertTitle>
          <AlertDescription>
            Connection restored. Your data is being synchronized now.
          </AlertDescription>
        </>
      )}
    </Alert>
  );
}

// Offline data handler hook
function useOfflineData() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Check initial network status
    setIsOffline(!navigator.onLine);

    // Set up event listeners
    const handleOnline = () => {
      console.log('Connection restored - online');
      setIsOffline(false);
    };

    const handleOffline = () => {
      console.log('Connection lost - offline');
      setIsOffline(true);
    };

    // Listen for browser online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clean up event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // We could return the offline status if needed by other components
  return isOffline;
}

// Authenticated route wrapper
function AuthenticatedRoute({ component: Component, ...rest }: any) {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();
  
  // Use useEffect to handle the redirect instead of doing it during render
  // Always declare hooks before any conditional returns
  React.useEffect(() => {
    if (!isLoading) {
      // Redirect to auth if not authenticated
      if (!isAuthenticated) {
        setLocation("/auth");
        return;
      }
      
      // Role-based route protection
      const path = location;
      const userType = user?.userType;
      
      // Vendor trying to access non-vendor routes
      if (userType === 'business' && !path.startsWith('/vendor') && path !== '/profile') {
        setLocation('/vendor');
        return;
      }
      
      // Admin trying to access non-admin routes
      if (userType === 'admin' && !path.startsWith('/admin') && path !== '/profile') {
        setLocation('/admin');
        return;
      }
      
      // Individual user trying to access vendor or admin routes
      if (userType === 'individual' && (path.startsWith('/vendor') || path.startsWith('/admin'))) {
        setLocation('/');
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, location, setLocation]);
  
  // Show loading indicator while checking auth status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // If not authenticated and not loading, don't render anything during the redirect
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <MainLayout>
      <Component {...rest} />
    </MainLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage}/>
      <Route path="/test-login" component={TestLogin}/>
      <Route path="/simple-explore" component={SimpleExplorePage}/>
      
      {/* Protected routes */}
      <Route path="/">
        {(params) => (
          <AuthenticatedRoute component={Dashboard} params={params} />
        )}
      </Route>
      
      <Route path="/favorites">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={Favorites} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/profile">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={Profile} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/explore">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={Explore} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/map">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={Map} params={params} />
          </Suspense>
        )}
      </Route>
      
      {/* Admin routes */}
      <Route path="/admin">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={AdminDashboard} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/admin/vendors">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={AdminVendors} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/admin/vendors/:id">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={AdminVendorDetail} params={params} />
          </Suspense>
        )}
      </Route>
      
      {/* Vendor routes */}
      <Route path="/vendor">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={VendorDashboard} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/vendor/deals/create">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={CreateDeal} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/vendor/profile">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={VendorProfile} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Set up offline data handling with useOfflineData hook
  const isOffline = useOfflineData();

  // Track whether PWA update is available
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  // Setup PWA event listeners
  useEffect(() => {
    const handlePwaUpdate = () => {
      setUpdateAvailable(true);
    };
    
    // Listen for PWA update events
    window.addEventListener('pwaUpdate', handlePwaUpdate);
    
    return () => {
      window.removeEventListener('pwaUpdate', handlePwaUpdate);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
        
        {/* Show install prompt only in supported browsers */}
        {'serviceWorker' in navigator && (
          <InstallPrompt className="fixed bottom-4 left-4 z-50 max-w-md" />
        )}
        
        {/* Show update notification only when an update is available */}
        {updateAvailable && <UpdateNotification />}
        
        {/* Always include the network status notification component */}
        <NetworkStatusAlert />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
