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
    <div className={`relative ${className}`}>
      {/* Left scroll button */}
      <Button
        variant="ghost"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white/90 shadow-sm h-9 w-9 p-0 hidden sm:flex items-center justify-center"
        onClick={() => handleScroll('left')}
        aria-label="Scroll categories left"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      
      {/* Scrollable tabs container */}
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto pb-3 pt-1 px-1 scrollbar-hide snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* All categories tab */}
        <div className="snap-start shrink-0 first:pl-2 sm:first:pl-10 last:pr-8">
          <Badge
            variant={selectedCategories.length === 0 ? "default" : "outline"}
            className="cursor-pointer px-3 py-1.5 text-sm font-semibold whitespace-nowrap h-9"
            onClick={() => onChange('all')}
          >
            All Categories {dealCounts['all'] > 0 && `(${dealCounts['all']})`}
          </Badge>
        </div>
        
        {/* Individual category tabs */}
        {CATEGORIES.filter(cat => cat.id !== 'all').map((category) => (
          <div key={category.id} className="snap-start shrink-0 ml-2">
            <Badge
              variant={selectedCategories.includes(category.id) ? "default" : "outline"}
              className="cursor-pointer px-3 py-1.5 text-sm font-semibold whitespace-nowrap h-9"
              onClick={() => onChange(category.id)}
            >
              {category.name} {dealCounts[category.id] > 0 && `(${dealCounts[category.id]})`}
            </Badge>
          </div>
        ))}
      </div>
      
      {/* Right scroll button */}
      <Button
        variant="ghost"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white/90 shadow-sm h-9 w-9 p-0 hidden sm:flex items-center justify-center"
        onClick={() => handleScroll('right')}
        aria-label="Scroll categories right"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
      
      {/* Custom scrollbar hide CSS */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}