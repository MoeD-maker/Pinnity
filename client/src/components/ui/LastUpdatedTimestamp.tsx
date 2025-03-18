import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { Button } from './button';

interface LastUpdatedTimestampProps {
  timestamp: number | undefined;
  isCached: boolean;
  onRefresh?: () => void;
  className?: string;
}

/**
 * Component that displays when data was last updated
 * Indicates whether data is from cache or fresh
 * Provides refresh button to fetch fresh data
 */
export function LastUpdatedTimestamp({
  timestamp,
  isCached,
  onRefresh,
  className = '',
}: LastUpdatedTimestampProps) {
  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });
  
  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      <span>
        {isCached ? 'Data cached' : 'Last updated'}: {timeAgo}
      </span>
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-6 w-6 p-0 rounded-full"
          title="Refresh data"
        >
          <RefreshCw className="h-3 w-3" />
          <span className="sr-only">Refresh</span>
        </Button>
      )}
    </div>
  );
}