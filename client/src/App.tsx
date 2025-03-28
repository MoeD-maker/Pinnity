import React, { useState, useEffect, Suspense, lazy, useMemo, useRef } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/components/ui/toast";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import OnboardingPage from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import MainLayout from "@/components/layout/MainLayout";
import TestLogin from "./test-login";
import SimpleExplorePage from "@/pages/simple-explore";
import TestPage from "@/pages/test-page";
import MinimalPage from "@/pages/minimal";
import TermsOfServicePage from "@/pages/terms";
import PrivacyPolicyPage from "@/pages/privacy";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import UpdateNotification from "@/components/pwa/UpdateNotification";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WifiOff, Wifi, X } from "lucide-react";
import { AuthTransition } from "@/components/auth/AuthTransition";
import { AnimatePresence } from "framer-motion";

// Debug logs
console.log("App.tsx module loading");

// Lazy-loaded pages for better performance
const Favorites = lazy(() => import("@/pages/favorites"));
const Profile = lazy(() => import("@/pages/profile"));
const Settings = lazy(() => import("@/pages/settings"));
const Explore = lazy(() => import("@/pages/enhanced-explore"));
const Map = lazy(() => import("@/pages/map"));
const DealDetails = lazy(() => import("@/pages/deals/[id]"));
const FormValidationDemo = lazy(() => import("@/pages/FormValidationDemo"));

// Admin pages
const AdminDashboard = lazy(() => import("@/pages/admin"));
const AdminVendors = lazy(() => import("@/pages/admin/vendors"));
const AdminVendorDetail = lazy(() => import("@/pages/admin/vendors/[id]"));
const AdminVendorEdit = lazy(() => import("@/pages/admin/vendors/edit/[id]"));
const AdminDeals = lazy(() => import("@/pages/admin/deals"));
const AdminDealEdit = lazy(() => import("@/pages/admin/deals/edit/[id]"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminAnalytics = lazy(() => import("@/pages/admin/analytics"));

// Vendor pages
const VendorDashboard = lazy(() => import("@/pages/vendor"));
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
  const [wasOffline, setWasOffline] = useState(!navigator.onLine); // Track previous state
  const [visible, setVisible] = useState(isOffline); // Only show initially if offline
  
  useEffect(() => {
    // Handle online/offline status changes
    const handleStatusChange = (status: boolean) => {
      // Check if transitioning from offline to online
      const isComingBackOnline = wasOffline && !status;
      
      // Update state
      setWasOffline(isOffline);
      setIsOffline(status);
      setVisible(true);
      
      // Auto-hide after 5 seconds if back online
      if (!status) {
        setTimeout(() => setVisible(false), 5000);
        
        // If transitioning from offline to online, dispatch event
        if (isComingBackOnline) {
          console.log('Connection restored - dispatching connectionRestored event');
          window.dispatchEvent(new CustomEvent('connectionRestored'));
        }
      }
    };
    
    // Browser online/offline event listeners
    const handleOnline = () => {
      // Always track transition from offline to online
      if (isOffline) {
        console.log('Connection restored - dispatching connectionRestored event');
        window.dispatchEvent(new CustomEvent('connectionRestored'));
      }
      handleStatusChange(false);
    };
    const handleOffline = () => handleStatusChange(true);
    
    // Custom event listener for programmatic status changes
    const handleStatusEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.hasOwnProperty('isOffline')) {
        const newOfflineStatus = customEvent.detail.isOffline;
        // If connection is restored programmatically, also dispatch refresh event
        if (isOffline && !newOfflineStatus) {
          console.log('Connection programmatically restored - dispatching connectionRestored event');
          window.dispatchEvent(new CustomEvent('connectionRestored'));
        }
        handleStatusChange(newOfflineStatus);
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
      console.log('Connection restored - online (useOfflineData)');
      setIsOffline(false);
      // Note: No need to dispatch connectionRestored here
      // The NetworkStatusAlert component already handles this
    };

    const handleOffline = () => {
      console.log('Connection lost - offline (useOfflineData)');
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

// Use AnimatePresence for smoother transitions

// Authenticated route wrapper
function AuthenticatedRoute({ component: Component, ...rest }: any) {
  const [location, setLocation] = useLocation();
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    authStatusChecked, 
    isRedirecting, 
    authState, 
    redirectPath,
    getAppropriateRedirectPath 
  } = useAuth();
  
  // State to track if the component should actually render
  // This prevents any content flashing during auth state changes
  const [shouldRender, setShouldRender] = useState<boolean>(false);
  
  // Generate a stable key for the current auth transition to prevent re-renders
  const transitionKey = useMemo(() => {
    if (!authStatusChecked) return 'initializing';
    if (isRedirecting) return 'redirecting';
    if (!shouldRender) return 'preparing';
    return 'complete';
  }, [authStatusChecked, isRedirecting, shouldRender]);
  
  // Stable reference to auth state to prevent re-renders
  const authStateRef = useRef(authState);
  
  // Update the ref only when auth state changes significantly
  useEffect(() => {
    // Only update the ref for major state changes
    if (
      (authState === 'authenticated' && authStateRef.current !== 'authenticated') ||
      (authState === 'unauthenticated' && authStateRef.current !== 'unauthenticated')
    ) {
      authStateRef.current = authState;
    }
  }, [authState]);
  
  // Use useEffect to handle the redirect instead of doing it during render
  // Always declare hooks before any conditional returns
  useEffect(() => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    
    // Create a debounce mechanism to prevent rapid state changes
    // This ensures we don't have multiple redirects or state changes in quick succession
    let redirectTimer: number | null = null;
    let renderTimer: number | null = null;
    
    // Function to execute redirect with debounce
    const executeRedirect = (path: string) => {
      // Clear any pending redirect
      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
      
      // Schedule the new redirect with a delay
      redirectTimer = window.setTimeout(() => {
        console.log(`[${timestamp}] Executing debounced redirect to ${path}`);
        setLocation(path);
      }, 500); // Increased delay to stabilize redirects
    };
    
    // Only process redirection logic if:
    // 1. Auth status check is complete (prevents premature redirects)
    // 2. Not currently loading
    // 3. Not already in a redirection process (prevents double redirects)
    if (authStatusChecked && !isLoading && !isRedirecting) {
      console.log(`[${timestamp}] Route evaluation: authState=${authState}, path=${location}`);
      
      // Prevent redirect loops by checking current path
      if (!isAuthenticated && location !== '/auth') {
        console.log(`[${timestamp}] User not authenticated, redirecting to /auth`);
        executeRedirect("/auth");
        return;
      }
      
      // Prevent redirect when already on auth page
      if (isAuthenticated && location === '/auth') {
        console.log(`[${timestamp}] User authenticated, redirecting from auth page`);
        executeRedirect("/");
        return;
      }
      
      // Determine appropriate redirect path using the centralized function
      const targetPath = getAppropriateRedirectPath(user, location);
      
      // Only redirect if the path is different
      if (targetPath !== location) {
        console.log(`[${timestamp}] Redirecting from ${location} to ${targetPath}`);
        executeRedirect(targetPath);
        return;
      }
      
      // If we get here, we should render the component
      // Use a longer timeout to ensure this happens after any pending state updates
      if (renderTimer) {
        window.clearTimeout(renderTimer);
      }
      
      renderTimer = window.setTimeout(() => {
        console.log(`[${timestamp}] Path ${location} is valid for user, proceeding to render`);
        setShouldRender(true);
      }, 300);
    }
    
    // Cleanup function to clear any pending timeouts
    return () => {
      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
      if (renderTimer) {
        window.clearTimeout(renderTimer);
      }
    };
  }, [isLoading, isAuthenticated, user, authStatusChecked, isRedirecting, location, setLocation, authState, redirectPath, getAppropriateRedirectPath]);
  
  // Get appropriate loading message based on current state
  const getLoadingMessage = () => {
    if (!authStatusChecked) return "Loading...";
    if (isRedirecting) return "Redirecting...";
    return isAuthenticated ? "Preparing your dashboard..." : "Please log in";
  };
  
  // Determine whether to show loading or content
  const showContent = authStatusChecked && !isLoading && !isRedirecting && shouldRender && isAuthenticated;
  
  // For admin routes, don't wrap with MainLayout since they already use AdminLayout
  const RenderedComponent = showContent ? (
    location.startsWith('/admin') ? (
      <Component {...rest} key="admin-component" />
    ) : (
      <MainLayout key="main-layout">
        <Component {...rest} />
      </MainLayout>
    )
  ) : null;
  
  // Use AnimatePresence to smoothly transition between loading and content states
  return (
    <AnimatePresence mode="wait">
      {!showContent ? (
        <AuthTransition
          key={`auth-transition-${transitionKey}`}
          state={authStateRef.current}
          message={getLoadingMessage()}
        />
      ) : RenderedComponent}
    </AnimatePresence>
  );
}

function Router() {
  // Use useLocation to track the current location for debugging
  const [location] = useLocation();
  console.log("Current route location:", location);
  
  // Extract path for direct comparison
  const path = location;
  
  // Special handler for testing paths - bypass the normal router for diagnostic pages
  if (
    path === '/minimal' || 
    path === '/test-page' || 
    path === '/simple-explore' || 
    path === '/test-login' ||
    path === '/form-validation-demo' ||
    path.startsWith('/test')
  ) {
    console.log("Rendering diagnostic page directly:", path);
    
    // Return the appropriate test component based on path
    if (path === '/minimal') return <MinimalPage />;
    if (path === '/test-page') return <TestPage />;
    if (path === '/simple-explore') return <SimpleExplorePage />;
    if (path === '/test-login') return <TestLogin />;
    if (path === '/form-validation-demo') return (
      <Suspense fallback={<LoadingFallback />}>
        <FormValidationDemo />
      </Suspense>
    );
  }
  
  return (
    <Switch>
      {/* Public routes - no authentication required */}
      <Route path="/auth" component={AuthPage}/>
      <Route path="/forgot-password" component={ForgotPasswordPage}/>
      <Route path="/reset-password" component={ResetPasswordPage}/>
      <Route path="/terms" component={TermsOfServicePage}/>
      <Route path="/privacy" component={PrivacyPolicyPage}/>
      <Route path="/onboarding/:userType/:userId" component={OnboardingPage}/>
      <Route path="/test-login" component={TestLogin}/>
      <Route path="/simple-explore" component={SimpleExplorePage}/>
      <Route path="/test-page" component={TestPage}/>
      <Route path="/minimal" component={MinimalPage}/>
      <Route path="/form-validation-demo">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <FormValidationDemo />
          </Suspense>
        )}
      </Route>
      
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
      
      <Route path="/settings">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={Settings} params={params} />
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
      
      <Route path="/deals/:id">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            {/* Use a direct component without MainLayout wrapper */}
            {(location) => {
              if (!params) return null;
              return (
                <div className="min-h-screen flex flex-col bg-background text-foreground">
                  <DealDetails />
                </div>
              );
            }}
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
      
      <Route path="/admin/vendors/edit/:id">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={AdminVendorEdit} params={params} />
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
      
      <Route path="/admin/deals/edit/:id">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={AdminDealEdit} params={params} />
          </Suspense>
        )}
      </Route>

      <Route path="/admin/deals">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={AdminDeals} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/admin/users">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={AdminUsers} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/admin/analytics">
        {(params) => (
          <Suspense fallback={<LoadingFallback />}>
            <AuthenticatedRoute component={AdminAnalytics} params={params} />
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
      
      {/* Fallback for unmatched routes */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  console.log("App component rendering");
  
  // Initialize the offline data hook for availability throughout the app
  useOfflineData();
  
  // Initialize service worker with PWA support
  useEffect(() => {
    import('./serviceWorkerRegistration').then(({ register, checkForUpdates }) => {
      // Register service worker with callbacks for updates
      register({
        onUpdate: (registration) => {
          console.log('[PWA] New content is available, triggering update notification');
          // Service worker update found, notification is handled via event
        },
        onSuccess: (registration) => {
          console.log('[PWA] Content is cached for offline use');
        },
        onOffline: () => {
          console.log('[PWA] App is offline');
        },
        onOnline: () => {
          console.log('[PWA] App is online, syncing data');
        },
        onMessage: (event) => {
          console.log('[PWA] Received message from service worker:', event.data);
          // Handle service worker messages (sync results, etc.)
          if (event.data?.type === 'FAVORITES_SYNCED' || event.data?.type === 'REDEMPTIONS_SYNCED') {
            const { success, failed } = event.data;
            if (success > 0) {
              // Notify user of successful synchronization
              console.log(`[PWA] Synced ${success} items successfully, ${failed} failed`);
            }
          }
        }
      });
      
      // Check for waiting service worker updates
      setTimeout(() => {
        checkForUpdates();
      }, 3000);
    });
  }, []);
  
  // Simplified App component for debugging
  try {
    // Instead of returning the debug view directly, let's wrap everything in providers
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <div className="app-container min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
              {/* PWA-related notifications */}
              <NetworkStatusAlert />
              <InstallPrompt />
              <UpdateNotification />
              
              {/* Main routing */}
              <Router />
              
              {/* Toast notifications */}
              <Toaster />
            </div>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error("Error in App component:", error);
    return (
      <div className="p-8 text-red-500">
        <h1 className="text-3xl font-bold">Error in App</h1>
        <p className="mt-4">{String(error)}</p>
      </div>
    );
  }
}

export default App;
