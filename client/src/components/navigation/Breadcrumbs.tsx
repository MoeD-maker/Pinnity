import React from 'react';
import { useLocation } from 'wouter';
import { Link } from 'wouter';
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

interface BreadcrumbItem {
  href: string;
  label: string;
  isCurrent?: boolean;
}

interface BreadcrumbsProps {
  /**
   * Items to display in the breadcrumb
   * If not provided, will be generated from the current path
   */
  items?: BreadcrumbItem[];
  
  /**
   * Whether to show home as the first item
   * @default true
   */
  showHome?: boolean;
  
  /**
   * Max items to show on mobile
   * When exceeded, middle items will be collapsed
   * @default 3
   */
  maxMobileItems?: number;
  
  /**
   * Custom labels for path segments
   * e.g. { 'deals': 'All Deals', 'featured': 'Featured Deals' }
   */
  pathLabels?: Record<string, string>;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Converts a path segment to a readable label
 * @param segment Path segment (e.g., 'user-profile')
 * @returns Readable label (e.g., 'User Profile')
 */
function getReadableLabel(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate breadcrumb items from a URL path
 */
export function generateBreadcrumbs(
  path: string,
  showHome: boolean = true,
  pathLabels: Record<string, string> = {}
): BreadcrumbItem[] {
  // For root path, just return home
  if (path === '/' || path === '') {
    return showHome ? [{ href: '/', label: 'Home', isCurrent: true }] : [];
  }

  // Split the path into segments and filter out empty ones
  const segments = path.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];
  
  // Add home if requested
  if (showHome) {
    items.push({ href: '/', label: 'Home' });
  }
  
  // Build up breadcrumb items for each segment
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Get custom label or generate readable label
    const label = pathLabels[segment] || getReadableLabel(segment);
    const isCurrent = index === segments.length - 1;
    
    items.push({
      href: currentPath,
      label,
      isCurrent,
    });
  });
  
  return items;
}

/**
 * Responsive breadcrumb navigation component
 * Shows the current location in the app hierarchy
 */
export function Breadcrumbs({
  items,
  showHome = true,
  maxMobileItems = 3,
  pathLabels = {},
  className = '',
}: BreadcrumbsProps) {
  const [location] = useLocation();
  
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
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={item.href}>
              {index > 0 && <BreadcrumbSeparator />}
              
              <BreadcrumbItem>
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
            </React.Fragment>
          ))}
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
}

/**
 * Common path labels for various application routes
 * Use this to customize the display text in breadcrumbs
 */
export const commonPathLabels: Record<string, string> = {
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

export default Breadcrumbs;