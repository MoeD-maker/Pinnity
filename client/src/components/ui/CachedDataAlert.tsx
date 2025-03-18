import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CachedDataAlertProps {
  /**
   * Whether the data is from cache
   */
  isCached: boolean;
  
  /**
   * The timestamp when the data was cached
   * Can be a Date object or timestamp string
   */
  cachedDate?: Date | string | number;
  
  /**
   * Optional callback to refresh the data
   */
  onRefresh?: () => void;
  
  /**
   * Optional class name for additional styling
   */
  className?: string;
}

/**
 * A component that shows a warning banner when viewing cached data
 */
const CachedDataAlert: React.FC<CachedDataAlertProps> = ({
  isCached,
  cachedDate,
  onRefresh,
  className = '',
}) => {
  // Don't render anything if data isn't cached
  if (!isCached) {
    return null;
  }

  // Parse the cached date
  let formattedTime = 'unknown time';
  if (cachedDate) {
    const date = typeof cachedDate === 'string' || typeof cachedDate === 'number' 
      ? new Date(cachedDate) 
      : cachedDate;
    
    // Check if the date is valid
    if (!isNaN(date.getTime())) {
      formattedTime = formatDistanceToNow(date, { addSuffix: true });
    }
  }

  return (
    <div className={`bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-md shadow-sm mb-4 ${className}`}>
      <div className="flex items-center">
        <AlertTriangle className="h-5 w-5 text-amber-400 mr-2 flex-shrink-0" />
        <div className="flex-grow text-sm text-amber-800">
          You're viewing cached data from {formattedTime}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="ml-2 bg-amber-100 hover:bg-amber-200 text-amber-800 py-1 px-3 rounded-md text-xs font-medium transition-colors flex items-center"
            aria-label="Refresh data"
          >
            <RotateCw className="h-3 w-3 mr-1" />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
};

export default CachedDataAlert;