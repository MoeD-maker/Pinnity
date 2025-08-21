import React, { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { resetCSRFToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestLogin() {
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("Admin123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [, navigate] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // First, get a CSRF token
      const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
      const csrfData = await csrfResponse.json();
      console.log('CSRF token obtained:', csrfData.csrfToken ? 'Yes' : 'No');
      resetCSRFToken(csrfData.csrfToken);

      // Make the login request
      const response = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        data: { email, password, rememberMe: true }
      });

      setResult(response);
      console.log('Login successful:', response);

      // Delay navigation to admin page to allow state to update
      setTimeout(() => {
        navigate('/admin');
      }, 1000);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      setLoading(true);
      
      // Try to fetch the current user
      const response = await apiRequest('/api/v1/user/me');
      setResult(response);
      console.log('Auth check response:', response);
    } catch (err: any) {
      console.error('Auth check error:', err);
      setError(err.message || 'Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const checkAdmin = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from an admin-only endpoint
      const response = await apiRequest('/api/v1/admin/businesses?status=pending');
      setResult(response);
      console.log('Admin check response:', response);
    } catch (err: any) {
      console.error('Admin check error:', err);
      setError(err.message || 'Admin access failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Test Login</CardTitle>
          <CardDescription>
            Login using admin credentials to test admin functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@test.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login as Admin"}
            </Button>
          </form>

          <div className="flex space-x-2 mt-4">
            <Button variant="outline" onClick={checkAuth} disabled={loading} className="flex-1">
              Check Auth
            </Button>
            <Button variant="outline" onClick={checkAdmin} disabled={loading} className="flex-1">
              Check Admin Access
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded border border-red-200">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded border border-green-200">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="ghost" onClick={() => navigate('/')} className="w-full">
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}