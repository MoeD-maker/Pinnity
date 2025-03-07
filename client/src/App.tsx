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

// Network status alert component
function NetworkStatusAlert() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setVisible(true);
      // Auto-hide after 5 seconds
      setTimeout(() => setVisible(false), 5000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setVisible(true);
    };

    const handleOfflineStatusChanged = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setIsOffline(customEvent.detail.isOffline);
        setVisible(true);
        if (!customEvent.detail.isOffline) {
          // Auto-hide after 5 seconds if it's an online notification
          setTimeout(() => setVisible(false), 5000);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offlineStatusChanged', handleOfflineStatusChanged);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offlineStatusChanged', handleOfflineStatusChanged);
    };
  }, []);

  // Don't render if not visible
  if (!visible) return null;

  return (
    <Alert 
      className={`fixed top-4 right-4 z-50 max-w-md shadow-lg transition-all duration-300 ${isOffline ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}
      variant={isOffline ? "destructive" : "default"}
    >
      <div className="absolute right-2 top-2">
        <button onClick={() => setVisible(false)} className="p-1 rounded-full hover:bg-gray-200">
          <X className="h-3 w-3" />
        </button>
      </div>
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <AlertTitle>You're offline</AlertTitle>
          <AlertDescription>
            Some features may be limited. We'll save your changes and sync when you're back online.
          </AlertDescription>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <AlertTitle>You're back online</AlertTitle>
          <AlertDescription>
            Your data is being synchronized now.
          </AlertDescription>
        </>
      )}
    </Alert>
  );
}

// Offline data handler hook
function useOfflineData() {
  useEffect(() => {
    // Initialize offline data caching
    const setupOfflineData = async () => {
      try {
        // Create required stores if they don't exist
        const stores = ['app-state', 'user-data', 'favorites', 'redemptions'];
        for (const store of stores) {
          const data = await localforage.getItem(store);
          if (data === null) {
            await localforage.setItem(store, {});
          }
        }
      } catch (error) {
        console.error('Error setting up offline data:', error);
      }
    };

    setupOfflineData();

    // Listen for sync events from service worker
    const handleFavoritesSynced = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.success > 0) {
        // Update UI or show notification about synced favorites
        console.log(`${customEvent.detail.success} favorites synced`);
      }
    };

    const handleRedemptionsSynced = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.success > 0) {
        // Update UI or show notification about synced redemptions
        console.log(`${customEvent.detail.success} redemptions synced`);
      }
    };

    window.addEventListener('favoritesSynced', handleFavoritesSynced);
    window.addEventListener('redemptionsSynced', handleRedemptionsSynced);

    return () => {
      window.removeEventListener('favoritesSynced', handleFavoritesSynced);
      window.removeEventListener('redemptionsSynced', handleRedemptionsSynced);
    };
  }, []);

  return null; // This hook doesn't return anything, it just sets up listeners
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
  // Set up offline data handling
  useOfflineData();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
        <InstallPrompt className="fixed bottom-4 left-4 z-50 max-w-md" />
        <UpdateNotification />
        <NetworkStatusAlert />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
