import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import MainLayout from "@/components/layout/MainLayout";
import { Suspense, lazy } from "react";

// Lazy-loaded pages for better performance
const Favorites = lazy(() => import("@/pages/favorites"));
const Profile = lazy(() => import("@/pages/profile"));
const Explore = lazy(() => import("@/pages/explore"));
const Map = lazy(() => import("@/pages/map"));

// Admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/index"));
const AdminVendors = lazy(() => import("@/pages/admin/vendors/index"));
const AdminVendorDetail = lazy(() => import("@/pages/admin/vendors/[id]"));

// Authenticated route wrapper
function AuthenticatedRoute({ component: Component, ...rest }: any) {
  const [location, setLocation] = useLocation();
  
  // This is a simplified auth check, in a real app would check tokens/session
  const isAuthenticated = true; // For demo purposes, always logged in
  
  if (!isAuthenticated) {
    // Redirect to login
    setLocation("/auth");
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
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
