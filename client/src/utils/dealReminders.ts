/**
 * Deal Reminders Utility
 * Handles checking for expiring deals and sending notifications to users
 */

// Constants
export const EXPIRING_SOON_HOURS = 48; // Define deals as "expiring soon" if they expire within 48 hours

/**
 * Get formatted expiration text for a deal
 * @param deal The deal to check
 * @returns Properly formatted text about expiration
 */
export function getExpirationText(deal: DealLike): string {
  const now = new Date();
  const endDate = new Date(deal.endDate);
  
  // If the deal is expired
  if (endDate < now) {
    return 'Expired';
  }
  
  // If the deal is expiring soon
  if (isExpiringSoon(deal)) {
    const diffMs = endDate.getTime() - now.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHrs < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `Expires in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
    }
    
    return `Expires in ${diffHrs} hour${diffHrs !== 1 ? 's' : ''}`;
  }
  
  // For regular deals, use relative format
  const diffMs = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 1) {
    return 'Expires today';
  } else if (diffDays <= 7) {
    return `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  } else if (diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Expires in ${weeks} week${weeks !== 1 ? 's' : ''}`;
  } else {
    const months = Math.floor(diffDays / 30);
    return `Expires in ${months} month${months !== 1 ? 's' : ''}`;
  }
}

/**
 * Generic interface for any deal object
 */
export interface DealLike {
  id: number;
  title: string;
  endDate: string | Date;
  business?: {
    businessName: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Import Deal and DealWithBusiness types for backward compatibility
type Deal = any;
type DealWithBusiness = any;

/**
 * Check if a deal is expiring soon (within the next 48 hours)
 */
export function isExpiringSoon(deal: DealLike): boolean {
  if (!deal.endDate) return false;
  
  // Handle different date formats
  const endDate = typeof deal.endDate === 'string' 
    ? new Date(deal.endDate) 
    : deal.endDate instanceof Date 
      ? deal.endDate 
      : new Date();
      
  const now = new Date();
  
  // Calculate the difference in hours
  const diffTime = endDate.getTime() - now.getTime();
  const diffHours = diffTime / (1000 * 60 * 60);
  
  // Return true if the deal expires within EXPIRING_SOON_HOURS and hasn't expired yet
  return diffHours > 0 && diffHours <= EXPIRING_SOON_HOURS;
}

/**
 * Check if a deal is expired
 */
export function isExpired(deal: DealLike): boolean {
  if (!deal.endDate) return false;
  
  // Handle different date formats
  const endDate = typeof deal.endDate === 'string' 
    ? new Date(deal.endDate) 
    : deal.endDate instanceof Date 
      ? deal.endDate 
      : new Date();
      
  const now = new Date();
  
  return endDate < now;
}

/**
 * Find deals that are expiring soon from a list of deals
 */
export function getExpiringSoonDeals(deals: DealLike[]): DealLike[] {
  return deals.filter(deal => isExpiringSoon(deal));
}

/**
 * Check if browser notifications are supported
 */
export function areBrowserNotificationsSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Request permission for browser notifications
 * @returns Promise that resolves to the permission state
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!areBrowserNotificationsSupported()) {
    return 'denied';
  }
  
  // If permission is already granted, return it
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  // Otherwise, request permission
  try {
    return await Notification.requestPermission();
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Send a browser notification for an expiring deal
 */
export function sendDealExpirationNotification(deal: DealLike): boolean {
  // Check if notifications are supported and permission is granted
  if (!areBrowserNotificationsSupported() || Notification.permission !== 'granted') {
    return false;
  }
  
  try {
    const businessName = deal.business?.businessName || 'a business';
    const title = `Deal Expiring Soon: ${deal.title}`;
    const body = `The deal "${deal.title}" from ${businessName} expires in less than 48 hours!`;
    
    const notification = new Notification(title, {
      body,
      icon: '/icons/deal-icon.png', // Path to your notification icon
      badge: '/icons/badge-icon.png', // Path to your badge icon for mobile
      tag: `deal-expiration-${deal.id}`, // Tag to prevent duplicate notifications
      requireInteraction: true, // Keep the notification until the user interacts with it
    });
    
    // Add click handler to open the deal details
    notification.onclick = () => {
      window.focus(); // Focus the window if it's not focused
      window.location.href = `/deals/${deal.id}`; // Redirect to the deal details page
      notification.close(); // Close the notification
    };
    
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

/**
 * Check user's saved deals and send notifications for those expiring soon
 */
export async function checkAndNotifyExpiringSoonDeals(
  savedDeals: DealLike[],
  notificationsEnabled: boolean = true
): Promise<{ notified: boolean, expiringSoonCount: number }> {
  if (!notificationsEnabled) {
    return { notified: false, expiringSoonCount: 0 };
  }
  
  // Find deals expiring soon
  const expiringSoonDeals = getExpiringSoonDeals(savedDeals);
  const expiringSoonCount = expiringSoonDeals.length;
  
  if (expiringSoonCount === 0) {
    return { notified: false, expiringSoonCount: 0 };
  }
  
  // Check if browser notifications are allowed
  const notificationsAllowed = areBrowserNotificationsSupported() && Notification.permission === 'granted';
  
  // If browser notifications are allowed, send notifications for each expiring deal
  if (notificationsAllowed) {
    expiringSoonDeals.forEach(deal => {
      sendDealExpirationNotification(deal);
    });
    return { notified: true, expiringSoonCount };
  }
  
  // If browser notifications aren't allowed, we'll rely on in-app notifications
  // The return value will be used to determine if in-app notifications should be shown
  return { notified: false, expiringSoonCount };
}

/**
 * Schedule a background check for expiring deals
 */
export function scheduleExpiringDealsCheck(intervalMinutes: number = 60): number {
  // Schedule a periodic check for expiring deals
  const intervalId = window.setInterval(async () => {
    // This would typically fetch the latest saved deals from the API
    // For now, we'll assume this function is called directly with the deals
    console.log('Scheduled check for expiring deals ran');
    
    // In a real implementation, you would:
    // 1. Check if the user is logged in
    // 2. Fetch the user's saved deals from the API
    // 3. Check for expiring deals and send notifications
  }, intervalMinutes * 60 * 1000);
  
  return intervalId;
}

/**
 * Generate text for an expiring deal notification
 */
export function getExpirationNotificationText(deal: DealLike): string {
  // Handle different date formats
  const endDate = typeof deal.endDate === 'string' 
    ? new Date(deal.endDate) 
    : deal.endDate instanceof Date 
      ? deal.endDate 
      : new Date();
      
  const now = new Date();
  
  // Check if the deal is already expired
  if (endDate < now) {
    // Format the business name
    const businessName = deal.business?.businessName || 'a business';
    return `"${deal.title}" from ${businessName} has expired.`;
  }
  
  // Calculate the difference in hours
  const diffTime = endDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  
  // Format the business name
  const businessName = deal.business?.businessName || 'a business';
  
  if (diffHours < 1) {
    return `"${deal.title}" from ${businessName} expires in less than an hour!`;
  } else if (diffHours < 24) {
    return `"${deal.title}" from ${businessName} expires in ${diffHours} hour${diffHours !== 1 ? 's' : ''}!`;
  } else {
    const days = Math.floor(diffHours / 24);
    return `"${deal.title}" from ${businessName} expires in ${days} day${days !== 1 ? 's' : ''}!`;
  }
}

/**
 * Queue offline notifications to be sent when the app is back online
 */
export function queueOfflineNotification(deal: DealLike): void {
  // Get existing queue from localStorage or initialize a new one
  const queue = JSON.parse(localStorage.getItem('offlineNotificationQueue') || '[]');
  
  // Add the notification to the queue
  queue.push({
    dealId: deal.id,
    timestamp: new Date().toISOString(),
  });
  
  // Save the updated queue back to localStorage
  localStorage.setItem('offlineNotificationQueue', JSON.stringify(queue));
}

/**
 * Process queued offline notifications when back online
 */
export async function processOfflineNotificationQueue(): Promise<void> {
  // Get the queue from localStorage
  const queue = JSON.parse(localStorage.getItem('offlineNotificationQueue') || '[]');
  
  if (queue.length === 0) {
    return; // No queued notifications
  }
  
  // For each queued notification, fetch the deal and send a notification
  for (const item of queue) {
    try {
      // In a real implementation, you would fetch the deal from the API
      // For now, we'll just log the item
      console.log('Processing queued notification for deal:', item.dealId);
      
      // Remove the processed item from the queue
      const updatedQueue = queue.filter((queueItem: any) => queueItem.dealId !== item.dealId);
      localStorage.setItem('offlineNotificationQueue', JSON.stringify(updatedQueue));
    } catch (error) {
      console.error('Error processing offline notification:', error);
    }
  }
}