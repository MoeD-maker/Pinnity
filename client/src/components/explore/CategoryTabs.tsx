import React, { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { CATEGORIES } from '@/components/dashboard/CategoryFilter';
import useWindowSize from '@/hooks/use-window-size';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useWindowSize();
  
  // Standard scroll handler
  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const scrollAmount = 200;
    const currentScroll = scrollContainerRef.current.scrollLeft;
    
    scrollContainerRef.current.scrollTo({
      left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
      behavior: 'smooth'
    });
  };
  
  // For mobile, show a select dropdown instead of scrolling tabs
  if (isMobile) {
    // Get the active category or default to 'all'
    const activeCategory = selectedCategories.length > 0 
      ? selectedCategories[0] 
      : 'all';
      
    return (
      <div className={className}>
        <Select value={activeCategory} onValueChange={(value) => onChange(value)}>
          <SelectTrigger className="w-full h-10">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              All Categories ({dealCounts['all'] || 0})
            </SelectItem>
            {CATEGORIES.filter(cat => cat.id !== 'all').map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name} ({dealCounts[category.id] || 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  
  // For desktop, keep the scrolling tabs
  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {/* Left scroll button */}
      <Button
        variant="ghost"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white/90 shadow-sm h-9 w-9 p-0 flex items-center justify-center"
        onClick={() => handleScroll('left')}
        aria-label="Scroll categories left"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      
      {/* Scrollable tabs container */}
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto pb-2 pt-1 px-0 sm:px-1 scrollbar-hide snap-x scroll-smooth w-full"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          overflowX: 'auto'
        }}
      >
        {/* All categories tab */}
        <div className="snap-start shrink-0 pl-10 pr-1">
          <Badge
            variant={selectedCategories.length === 0 ? "default" : "outline"}
            className="cursor-pointer px-3 py-1 text-sm font-medium whitespace-nowrap h-9 flex items-center justify-center"
            onClick={() => onChange('all')}
          >
            <span>All Categories</span>
            {dealCounts['all'] > 0 && <span className="ml-1">({dealCounts['all']})</span>}
          </Badge>
        </div>
        
        {/* Individual category tabs */}
        {CATEGORIES.filter(cat => cat.id !== 'all').map((category) => (
          <div key={category.id} className="snap-start shrink-0 ml-2">
            <Badge
              variant={selectedCategories.includes(category.id) ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-sm font-medium whitespace-nowrap h-9 flex items-center justify-center"
              onClick={() => onChange(category.id)}
            >
              <span>{category.name}</span>
              {dealCounts[category.id] > 0 && <span className="ml-1">({dealCounts[category.id]})</span>}
            </Badge>
          </div>
        ))}
        
        {/* Add right padding to allow last item to be centered when scrolled fully */}
        <div className="shrink-0 w-10"></div>
      </div>
      
      {/* Right scroll button */}
      <Button
        variant="ghost"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white/90 shadow-sm h-9 w-9 p-0 flex items-center justify-center"
        onClick={() => handleScroll('right')}
        aria-label="Scroll categories right"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
      
      {/* Scrollbar hide CSS */}
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
        }
      `}</style>
    </div>
  );
}