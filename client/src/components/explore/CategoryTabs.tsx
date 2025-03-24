import React, { useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORIES } from '@/components/dashboard/CategoryFilter';

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
  
  // Handle scroll actions
  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const scrollAmount = 200; // Pixels to scroll
    const currentScroll = scrollContainerRef.current.scrollLeft;
    
    scrollContainerRef.current.scrollTo({
      left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
      behavior: 'smooth'
    });
  };
  
  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {/* Left scroll button - hidden on mobile */}
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
        className="flex overflow-x-auto pb-2 pt-1 px-0 sm:px-1 scrollbar-hide snap-x scroll-smooth w-full"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch', // Enable momentum scrolling on iOS
          overflowX: 'auto'
        }}
      >
        {/* All categories tab - padding adjusted for mobile */}
        <div className="snap-start shrink-0 pl-1 sm:pl-2 md:pl-10 pr-1">
          <Badge
            variant={selectedCategories.length === 0 ? "default" : "outline"}
            className="cursor-pointer px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold whitespace-nowrap h-8 sm:h-9 flex items-center justify-center"
            onClick={() => onChange('all')}
          >
            All Categories {dealCounts['all'] > 0 && `(${dealCounts['all']})`}
          </Badge>
        </div>
        
        {/* Individual category tabs - improved touch targets */}
        {CATEGORIES.filter(cat => cat.id !== 'all').map((category) => (
          <div key={category.id} className="snap-start shrink-0 ml-1 sm:ml-2">
            <Badge
              variant={selectedCategories.includes(category.id) ? "default" : "outline"}
              className="cursor-pointer px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold whitespace-nowrap h-8 sm:h-9 flex items-center justify-center"
              onClick={() => onChange(category.id)}
            >
              {category.name} {dealCounts[category.id] > 0 && `(${dealCounts[category.id]})`}
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
          display: none;
          width: 0;
          height: 0;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        @media (max-width: 640px) {
          .scrollbar-hide {
            scroll-snap-type: x mandatory;
            scroll-padding: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
}