import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import MainLayout from "@/components/layout/MainLayout";
import { Suspense, lazy } from "react";
import TestLogin from "./test-login";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

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

// Authenticated route wrapper
function AuthenticatedRoute({ component: Component, ...rest }: any) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Use useEffect to handle the redirect instead of doing it during render
  // Always declare hooks before any conditional returns
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/auth");
    }
  }, [isLoading, isAuthenticated, setLocation]);
  
  // Show loading indicator while checking auth status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B]"></div>
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
          <Suspense fallback={<div>Loading...</div>}>
            <AuthenticatedRoute component={Favorites} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/profile">
        {(params) => (
          <Suspense fallback={<div>Loading...</div>}>
            <AuthenticatedRoute component={Profile} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/explore">
        {(params) => (
          <Suspense fallback={<div>Loading...</div>}>
            <AuthenticatedRoute component={Explore} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/map">
        {(params) => (
          <Suspense fallback={<div>Loading...</div>}>
            <AuthenticatedRoute component={Map} params={params} />
          </Suspense>
        )}
      </Route>
      
      {/* Admin routes */}
      <Route path="/admin">
        {(params) => (
          <Suspense fallback={<div>Loading...</div>}>
            <AuthenticatedRoute component={AdminDashboard} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/admin/vendors">
        {(params) => (
          <Suspense fallback={<div>Loading...</div>}>
            <AuthenticatedRoute component={AdminVendors} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/admin/vendors/:id">
        {(params) => (
          <Suspense fallback={<div>Loading...</div>}>
            <AuthenticatedRoute component={AdminVendorDetail} params={params} />
          </Suspense>
        )}
      </Route>
      
      {/* Vendor routes */}
      <Route path="/vendor">
        {(params) => (
          <Suspense fallback={<div>Loading...</div>}>
            <AuthenticatedRoute component={VendorDashboard} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/vendor/deals/create">
        {(params) => (
          <Suspense fallback={<div>Loading...</div>}>
            <AuthenticatedRoute component={CreateDeal} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route path="/vendor/profile">
        {(params) => (
          <Suspense fallback={<div>Loading...</div>}>
            <AuthenticatedRoute component={VendorProfile} params={params} />
          </Suspense>
        )}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
