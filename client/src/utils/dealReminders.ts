/**
 * Deal Reminders Utility
 * Handles checking for expiring deals and sending notifications to users
 */

import { Deal } from "@shared/schema";

// Constants
export const EXPIRING_SOON_HOURS = 48; // Define deals as "expiring soon" if they expire within 48 hours

/**
 * Interface for deal with business information
 */
export interface DealWithBusiness extends Deal {
  business: {
    businessName: string;
    id: number;
    [key: string]: any;
  };
}

/**
 * Check if a deal is expiring soon (within the next 48 hours)
 */
export function isExpiringSoon(deal: Deal | DealWithBusiness): boolean {
  if (!deal.endDate) return false;
  
  const endDate = new Date(deal.endDate);
  const now = new Date();
  
  // Calculate the difference in hours
  const diffTime = endDate.getTime() - now.getTime();
  const diffHours = diffTime / (1000 * 60 * 60);
  
  // Return true if the deal expires within EXPIRING_SOON_HOURS and hasn't expired yet
  return diffHours > 0 && diffHours <= EXPIRING_SOON_HOURS;
}

/**
 * Find deals that are expiring soon from a list of deals
 */
export function getExpiringSoonDeals(deals: (Deal | DealWithBusiness)[]): (Deal | DealWithBusiness)[] {
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
export function sendDealExpirationNotification(deal: Deal | DealWithBusiness): boolean {
  // Check if notifications are supported and permission is granted
  if (!areBrowserNotificationsSupported() || Notification.permission !== 'granted') {
    return false;
  }
  
  try {
    const businessName = 'business' in deal ? deal.business.businessName : 'a business';
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
  savedDeals: (Deal | DealWithBusiness)[],
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
export function getExpirationNotificationText(deal: Deal | DealWithBusiness): string {
  const endDate = new Date(deal.endDate as string);
  const now = new Date();
  
  // Calculate the difference in hours
  const diffTime = endDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  
  // Format the business name
  const businessName = 'business' in deal ? deal.business.businessName : 'a business';
  
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
export function queueOfflineNotification(deal: Deal | DealWithBusiness): void {
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