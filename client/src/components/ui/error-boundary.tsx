import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { normalizeError, AppError, ErrorCategory } from '@/lib/errorHandling';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  redirectTo?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches JavaScript errors in its child component tree
 * and displays a fallback UI instead of crashing the entire application.
 */
class ErrorBoundaryComponent extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Save error info to state for display
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset the error boundary when props change if the resetOnPropsChange option is true
    if (
      this.state.hasError &&
      this.props.resetOnPropsChange &&
      prevProps !== this.props
    ) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  reload = (): void => {
    window.location.reload();
  };

  redirectHome = (): void => {
    window.location.href = '/';
  };

  navigateTo = (path: string): void => {
    window.location.href = path;
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, render it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use the default fallback UI
      return (
        <div className="w-full p-4 flex justify-center">
          <Card className="w-full max-w-lg shadow-lg border-red-200">
            <CardHeader className="bg-red-50 border-b border-red-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                <CardTitle className="text-red-700">Something went wrong</CardTitle>
              </div>
              <CardDescription className="text-red-600">
                An error occurred while rendering this section of the page
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Alert className="mb-4 bg-red-50 border-red-200">
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription className="text-sm text-red-800 whitespace-pre-wrap font-mono text-xs">
                  {this.state.error?.message || 'Unknown error'}
                </AlertDescription>
              </Alert>
              
              <div className="text-sm text-gray-600 mt-4">
                <p>You can try the following to resolve this issue:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Reload the page and try again</li>
                  <li>Check your internet connection</li>
                  <li>Clear your browser cache and cookies</li>
                  <li>If the issue persists, please contact support</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-2 border-t border-red-100 bg-red-50 p-4">
              <Button 
                variant="outline" 
                onClick={this.resetErrorBoundary}
                className="border-red-200 hover:bg-red-100"
              >
                Try Again
              </Button>
              
              <Button 
                variant="outline" 
                onClick={this.reload}
                className="border-red-200 hover:bg-red-100"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
              
              {this.props.redirectTo ? (
                <Button 
                  variant="default" 
                  onClick={() => this.navigateTo(this.props.redirectTo!)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Go to Safe Page
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  onClick={this.redirectHome}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      );
    }

    // When there's no error, render children normally
    return this.props.children;
  }
}

/**
 * A wrapper component that provides a specific fallback UI for form validation errors
 */
export function FormErrorBoundary({ children, ...props }: ErrorBoundaryProps) {
  const { toast } = useToast();
  
  const handleFormError = (error: Error, errorInfo: ErrorInfo) => {
    const appError = normalizeError(error);
    
    // Show a toast notification for the error
    toast({
      title: "Form Error",
      description: "There was a problem with form validation. We've saved your progress.",
      variant: "destructive",
    });
    
    // Call the parent onError if provided
    if (props.onError) {
      props.onError(error, errorInfo);
    }
  };
  
  const formFallback = (
    <div className="w-full p-4">
      <Card className="border-amber-200">
        <CardHeader className="bg-amber-50 border-b border-amber-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-700">Form Validation Error</CardTitle>
          </div>
          <CardDescription className="text-amber-600">
            We encountered an issue with the form validation
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="mb-4 bg-amber-50 border-amber-200">
            <AlertDescription className="text-sm">
              Your progress has been saved. You can try again or contact support if the issue persists.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-amber-100 bg-amber-50 p-4">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="border-amber-200 hover:bg-amber-100"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload Form
          </Button>
          
          <Button 
            variant="default" 
            onClick={() => window.location.href = '/'}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
  
  return (
    <ErrorBoundaryComponent 
      {...props} 
      onError={handleFormError}
      fallback={props.fallback || formFallback}
    >
      {children}
    </ErrorBoundaryComponent>
  );
}

/**
 * A wrapper component that provides a specialized fallback UI for network-related errors
 */
export function NetworkErrorBoundary({ children, ...props }: ErrorBoundaryProps) {
  const { toast } = useToast();
  
  const handleNetworkError = (error: Error, errorInfo: ErrorInfo) => {
    const appError = normalizeError(error);
    
    // Only show toast for network and offline errors
    if (
      appError.category === ErrorCategory.NETWORK || 
      appError.category === ErrorCategory.OFFLINE ||
      appError.category === ErrorCategory.TIMEOUT
    ) {
      toast({
        title: "Connection Issue",
        description: "We're having trouble connecting to the server. Your work is saved locally.",
        variant: "default",
      });
    }
    
    // Call the parent onError if provided
    if (props.onError) {
      props.onError(error, errorInfo);
    }
  };
  
  const networkFallback = (
    <div className="w-full p-4">
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-700">Connection Issue</CardTitle>
          </div>
          <CardDescription className="text-blue-600">
            We're having trouble connecting to the server
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="mb-4 bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm">
              Your data has been saved locally. Please check your internet connection and try again.
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-gray-600 mt-4">
            <p>Troubleshooting steps:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Check your Wi-Fi or mobile data connection</li>
              <li>Try again in a few moments</li>
              <li>If you're using a VPN, try disabling it temporarily</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-blue-100 bg-blue-50 p-4">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="border-blue-200 hover:bg-blue-100"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          
          <Button 
            variant="default" 
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
  
  return (
    <ErrorBoundaryComponent 
      {...props} 
      onError={handleNetworkError}
      fallback={props.fallback || networkFallback}
    >
      {children}
    </ErrorBoundaryComponent>
  );
}

/**
 * Default export for the main ErrorBoundary component
 */
export const ErrorBoundary = ErrorBoundaryComponent;