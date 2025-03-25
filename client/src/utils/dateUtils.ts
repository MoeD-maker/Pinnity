/**
 * Date utility functions for use throughout the application
 */

/**
 * Check if a date is within a specified number of days from today
 * @param date Date to check
 * @param days Number of days threshold
 * @returns Boolean indicating if date is within specified days
 */
export function isWithinDays(date: Date, days: number): boolean {
  if (!date) return false;
  
  const today = new Date();
  const targetDate = new Date(date);
  
  // Reset time portion for accurate day difference calculation
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  // Calculate difference in milliseconds and convert to days
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 0 && diffDays <= days;
}

/**
 * Format a date for display in a user-friendly way
 * @param date Date to format
 * @param includeTime Whether to include time in the formatted string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number, includeTime: boolean = false): string {
  if (!date) return '';
  
  const dateObj = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Check if date is today, yesterday, or another day
  if (dateObj.toDateString() === today.toDateString()) {
    return includeTime 
      ? `Today at ${dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
      : 'Today';
  } else if (dateObj.toDateString() === yesterday.toDateString()) {
    return includeTime 
      ? `Yesterday at ${dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
      : 'Yesterday';
  } else {
    return includeTime
      ? dateObj.toLocaleString(undefined, { 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit', 
          minute: '2-digit'
        })
      : dateObj.toLocaleDateString(undefined, { 
          month: 'short', 
          day: 'numeric'
        });
  }
}

/**
 * Get the relative time between now and a given date
 * @param date Date to compare
 * @returns Formatted relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(date: Date | string | number): string {
  if (!date) return '';
  
  const now = new Date();
  const dateObj = new Date(date);
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  
  if (diffSec < 0) {
    // Past
    if (diffSec > -60) return 'just now';
    if (diffMin > -60) return `${Math.abs(diffMin)} minute${Math.abs(diffMin) === 1 ? '' : 's'} ago`;
    if (diffHour > -24) return `${Math.abs(diffHour)} hour${Math.abs(diffHour) === 1 ? '' : 's'} ago`;
    if (diffDay > -7) return `${Math.abs(diffDay)} day${Math.abs(diffDay) === 1 ? '' : 's'} ago`;
    return formatDate(date);
  } else {
    // Future
    if (diffSec < 60) return 'in a few seconds';
    if (diffMin < 60) return `in ${diffMin} minute${diffMin === 1 ? '' : 's'}`;
    if (diffHour < 24) return `in ${diffHour} hour${diffHour === 1 ? '' : 's'}`;
    if (diffDay < 7) return `in ${diffDay} day${diffDay === 1 ? '' : 's'}`;
    return `on ${formatDate(date)}`;
  }
}

/**
 * Calculate and format the time remaining until a date
 * @param date Date to calculate time remaining until
 * @returns Formatted time remaining string
 */
export function getTimeRemaining(date: Date | string | number): string {
  if (!date) return '';
  
  const now = new Date();
  const endDate = new Date(date);
  const diffMs = endDate.getTime() - now.getTime();
  
  // Date has passed
  if (diffMs <= 0) {
    return 'Expired';
  }
  
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  // More than 30 days
  if (diffDay > 30) {
    const diffMonth = Math.floor(diffDay / 30);
    return `${diffMonth} month${diffMonth > 1 ? 's' : ''}`;
  }
  
  // More than 7 days
  if (diffDay >= 7) {
    const diffWeek = Math.floor(diffDay / 7);
    return `${diffWeek} week${diffWeek > 1 ? 's' : ''}`;
  }
  
  // Days
  if (diffDay >= 1) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''}`;
  }
  
  // Hours
  if (diffHour >= 1) {
    return `${diffHour}h ${diffMin % 60}m`;
  }
  
  // Minutes
  return `${diffMin}m`;
}