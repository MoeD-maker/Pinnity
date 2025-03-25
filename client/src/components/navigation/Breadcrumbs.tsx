import React from 'react';
import { useLocation } from 'wouter';
import { Link as WouterLink } from 'wouter';
import { Home } from 'lucide-react';

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '@/components/ui/breadcrumb';

// Create a simple Link component that wraps WouterLink to avoid React.Fragment props issues
const Link = ({ href, children, ...props }: { href: string, children: React.ReactNode } & React.HTMLAttributes<HTMLAnchorElement>) => (
  <WouterLink href={href} {...props}>{children}</WouterLink>
);

// Type for breadcrumb items
interface BreadcrumbItemType {
  href: string;
  label: string;
  isCurrent?: boolean;
}

// Props for the Breadcrumbs component
interface BreadcrumbsProps {
  items?: BreadcrumbItemType[];
  showHome?: boolean;
  maxMobileItems?: number;
  pathLabels?: Record<string, string>;
  className?: string;
}

// Common path labels to use across the application
const commonPathLabels: Record<string, string> = {
  // Main sections
  'dashboard': 'Dashboard',
  'explore': 'Explore',
  'map': 'Map View',
  'favorites': 'My Favorites',
  'profile': 'My Profile',
  'settings': 'Settings',
  
  // Deal types
  'deals': 'All Deals',
  'featured': 'Featured',
  'nearby': 'Nearby',
  'popular': 'Popular',
  'recent': 'Recently Added',
  'expiring': 'Expiring Soon',
  
  // Admin
  'admin': 'Admin',
  'vendors': 'Vendors',
  'approvals': 'Approvals',
  'users': 'Users',
  'analytics': 'Analytics',
  
  // Vendor routes
  'vendor': 'Vendor',
  'business': 'Business',
  'redemptions': 'Redemptions',
  'reports': 'Reports',
  'store': 'Store',
  
  // User related
  'account': 'My Account',
  'notifications': 'Notifications',
  'saved': 'Saved Items',
  'history': 'History',
  
  // Other
  'new': 'Create New',
  'edit': 'Edit',
  'details': 'Details',
  'view': 'View',
};

// Breadcrumbs component with helper functions contained within
const Breadcrumbs = ({
  items,
  showHome = true,
  maxMobileItems = 3,
  pathLabels = {},
  className = '',
}: BreadcrumbsProps) => {
  const [location] = useLocation();
  
  // Converts a path segment to a readable label
  const getReadableLabel = (segment: string): string => {
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Generates breadcrumb items from a URL path
  const generateBreadcrumbs = (
    path: string,
    showHomeItem: boolean = true,
    customPathLabels: Record<string, string> = {}
  ): BreadcrumbItemType[] => {
    // For root path, just return home
    if (path === '/' || path === '') {
      return showHomeItem ? [{ href: '/', label: 'Home', isCurrent: true }] : [];
    }

    // Split the path into segments and filter out empty ones
    const segments = path.split('/').filter(Boolean);
    const breadcrumbItems: BreadcrumbItemType[] = [];
    
    // Add home if requested
    if (showHomeItem) {
      breadcrumbItems.push({ href: '/', label: 'Home' });
    }
    
    // Build up breadcrumb items for each segment
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Get custom label or generate readable label
      const label = customPathLabels[segment] || getReadableLabel(segment);
      const isCurrent = index === segments.length - 1;
      
      breadcrumbItems.push({
        href: currentPath,
        label,
        isCurrent,
      });
    });
    
    return breadcrumbItems;
  };
  
  // Generate items from current path if not provided
  const breadcrumbItems = items || generateBreadcrumbs(location, showHome, pathLabels);
  
  // No breadcrumbs to show
  if (breadcrumbItems.length === 0) {
    return null;
  }
  
  // We need to handle responsiveness for small screens
  const shouldCollapse = breadcrumbItems.length > maxMobileItems;
  
  // For mobile view (visible only on small screens)
  const renderMobileView = () => {
    if (!shouldCollapse) return null;
    
    // Get first, last, and middle collapsed items
    const first = breadcrumbItems[0];
    const last = breadcrumbItems[breadcrumbItems.length - 1];
    
    return (
      <Breadcrumb className={`md:hidden ${className}`}>
        <BreadcrumbList>
          {/* First item (usually Home) */}
          <BreadcrumbItem>
            {first.label === 'Home' ? (
              <BreadcrumbLink asChild>
                <Link href={first.href}>
                  <Home className="h-4 w-4" />
                  <span className="sr-only">Home</span>
                </Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbLink asChild>
                <Link href={first.href}>{first.label}</Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          
          <BreadcrumbSeparator />
          
          {/* Collapsed middle section */}
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
          
          <BreadcrumbSeparator />
          
          {/* Last item (current page) */}
          <BreadcrumbItem>
            {last.isCurrent ? (
              <BreadcrumbPage>{last.label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link href={last.href}>{last.label}</Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  };
  
  // For desktop view (visible on medium screens and up)
  const renderDesktopView = () => {
    return (
      <Breadcrumb className={`hidden md:block ${className}`}>
        <BreadcrumbList>
          {breadcrumbItems.map((item, index) => {
            // Use array approach instead of React.Fragment
            return [
              // Only add separator after the first item
              index > 0 && <BreadcrumbSeparator key={`sep-${item.href}`} />,
              
              <BreadcrumbItem key={item.href}>
                {item.label === 'Home' && index === 0 ? (
                  // Home icon
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>
                      <Home className="h-4 w-4" />
                      <span className="sr-only">Home</span>
                    </Link>
                  </BreadcrumbLink>
                ) : item.isCurrent ? (
                  // Current page (not a link)
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  // Regular link
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            ];
          }).flat().filter(Boolean)}
        </BreadcrumbList>
      </Breadcrumb>
    );
  };
  
  return (
    <>
      {renderMobileView()}
      {renderDesktopView()}
    </>
  );
};

// Export the main component as default and the helpers as named exports
export { commonPathLabels };
export default Breadcrumbs;