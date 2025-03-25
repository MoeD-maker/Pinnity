import React, { useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORIES } from '@/components/dashboard/CategoryFilter';
import useWindowSize from '@/hooks/use-window-size';

interface CategoryTabsProps {
  selectedCategories: string[];
  onChange: (category: string) => void;
  dealCounts: Record<string, number>;
  className?: string;
}

export default function CategoryTabs({ 
  selectedCategories, 
  onChange, 
  dealCounts,
  className = ''
}: CategoryTabsProps) {
  // Reference to the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Use our custom hook for better device detection
  const { isMobile } = useWindowSize();
  
  // Handle scroll actions
  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    // Use smaller scroll amount on mobile for more precise control
    const scrollAmount = isMobile ? 120 : 200;
    const currentScroll = scrollContainerRef.current.scrollLeft;
    
    scrollContainerRef.current.scrollTo({
      left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
      behavior: 'smooth'
    });
  };
  
  return (
    <div className={`relative w-full overflow-hidden max-w-full ${className}`}>
      {/* Left scroll button - shown only on desktop */}
      <Button
        variant="ghost"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white/90 shadow-sm h-9 w-9 p-0 hidden sm:flex items-center justify-center"
        onClick={() => handleScroll('left')}
        aria-label="Scroll categories left"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      
      {/* Scrollable tabs container - enhanced for mobile touch scrolling */}
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto pb-2 pt-1 px-0 sm:px-1 scrollbar-hide snap-x scroll-smooth w-full max-w-[calc(100vw-24px)]"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch', // Enable momentum scrolling on iOS
          overflowX: 'auto'
        }}
      >
        {/* All categories tab - optimized for mobile */}
        <div className="snap-start shrink-0 pl-1 sm:pl-2 md:pl-10 pr-1">
          <Badge
            variant={selectedCategories.length === 0 ? "default" : "outline"}
            className={`cursor-pointer px-1.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-sm font-medium whitespace-nowrap ${isMobile ? 'h-6 min-w-[40px]' : 'h-9'} flex items-center justify-center touch-manipulation`}
            onClick={() => onChange('all')}
          >
            <span className="max-w-[80px] sm:max-w-none truncate">{isMobile ? 'All' : 'All Categories'}</span>
            {dealCounts['all'] > 0 && <span className="ml-1">({dealCounts['all']})</span>}
          </Badge>
        </div>
        
        {/* Individual category tabs - optimized for mobile */}
        {CATEGORIES.filter(cat => cat.id !== 'all').map((category) => (
          <div key={category.id} className="snap-start shrink-0 ml-1 sm:ml-2">
            <Badge
              variant={selectedCategories.includes(category.id) ? "default" : "outline"}
              className={`cursor-pointer px-1.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-sm font-medium whitespace-nowrap ${isMobile ? 'h-6 min-w-[40px]' : 'h-9'} flex items-center justify-center touch-manipulation`}
              onClick={() => onChange(category.id)}
            >
              <span className="max-w-[80px] sm:max-w-none truncate">{category.name}</span>
              {dealCounts[category.id] > 0 && <span className="ml-1">({dealCounts[category.id]})</span>}
            </Badge>
          </div>
        ))}
        
        {/* Add right padding to allow last item to be centered when scrolled fully */}
        <div className="shrink-0 w-2 sm:w-4 md:w-10"></div>
      </div>
      
      {/* Right scroll button - hidden on mobile */}
      <Button
        variant="ghost"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white/90 shadow-sm h-9 w-9 p-0 hidden sm:flex items-center justify-center"
        onClick={() => handleScroll('right')}
        aria-label="Scroll categories right"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
      
      {/* Custom scrollbar hide CSS - enhanced for cross-browser compatibility */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .scrollbar-hide {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
          scroll-behavior: smooth !important;
          -webkit-overflow-scrolling: touch !important;
        }
        @media (max-width: 640px) {
          .scrollbar-hide {
            scroll-snap-type: x proximity; /* proximity instead of mandatory for smoother experience */
            scroll-padding: 0.5rem;
            scroll-behavior: smooth !important;
            touch-action: pan-x !important; /* Optimize for horizontal panning */
          }
        }
        /* Provide momentum scrolling on iOS */
        @supports (-webkit-overflow-scrolling: touch) {
          .scrollbar-hide {
            -webkit-overflow-scrolling: touch !important;
          }
        }
      `}</style>
    </div>
  );
}