import React, { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
  Utensils,
  Coffee,
  ShoppingBag,
  Scissors,
  Dumbbell,
  Ticket,
  Wrench, // Replace Tool with Wrench
  Hotel,
  Wine,
  Briefcase
} from 'lucide-react';

// Predefined categories with icons
export const CATEGORIES = [
  { id: 'all', name: 'All Categories', icon: Briefcase },
  { id: 'restaurants', name: 'Restaurants', icon: Utensils },
  { id: 'cafes', name: 'Cafés', icon: Coffee },
  { id: 'retail', name: 'Retail & Shopping', icon: ShoppingBag },
  { id: 'beauty', name: 'Beauty & Spas', icon: Scissors },
  { id: 'health', name: 'Health & Fitness', icon: Dumbbell },
  { id: 'entertainment', name: 'Entertainment', icon: Ticket },
  { id: 'services', name: 'Services', icon: Wrench },
  { id: 'travel', name: 'Travel & Hotels', icon: Hotel },
  { id: 'nightlife', name: 'Nightlife', icon: Wine },
  { id: 'other', name: 'Other', icon: Briefcase }
];

interface CategoryFilterProps {
  selectedCategories: string[];
  onChange: (category: string) => void;
  dealCounts?: Record<string, number>;
  onClearFilters?: () => void;
}

export default function CategoryFilter({ 
  selectedCategories, 
  onChange,
  dealCounts = {},
  onClearFilters
}: CategoryFilterProps) {
  // Load saved categories from localStorage on mount
  useEffect(() => {
    const savedCategories = localStorage.getItem('pinnity-category-filters');
    if (savedCategories) {
      const parsed = JSON.parse(savedCategories);
      // Check if the saved categories are in the correct format and not empty
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Calling onChange for each saved category would not work well
        // This should be handled in the parent component by setting the initial state
        // We just log here to debug
        console.log('Loaded saved categories:', parsed);
      }
    }
  }, []);

  // Save selected categories to localStorage when they change
  useEffect(() => {
    // Don't save if only "all" is selected or if nothing is selected
    if (selectedCategories.length === 0 || 
        (selectedCategories.length === 1 && selectedCategories[0] === 'all')) {
      localStorage.removeItem('pinnity-category-filters');
      return;
    }
    localStorage.setItem('pinnity-category-filters', JSON.stringify(selectedCategories));
  }, [selectedCategories]);

  const hasActiveFilters = selectedCategories.length > 0 && 
                          !(selectedCategories.length === 1 && selectedCategories[0] === 'all');

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">Filter by category</h3>
        {hasActiveFilters && onClearFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilters}
            className="h-8 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear filters
          </Button>
        )}
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap pb-4 px-0">
        <div className="flex gap-2 pb-2 pr-10">
          {CATEGORIES.map(category => (
            <CategoryBadge
              key={category.id}
              category={category}
              count={dealCounts[category.id] || 0}
              isSelected={
                category.id === 'all' 
                  ? selectedCategories.length === 0 || selectedCategories.includes('all')
                  : selectedCategories.includes(category.id)
              }
              onClick={() => onChange(category.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface CategoryBadgeProps {
  category: { id: string; name: string; icon: React.ComponentType<any> };
  isSelected: boolean;
  onClick: () => void;
  count?: number;
}

function CategoryBadge({ category, isSelected, onClick, count = 0 }: CategoryBadgeProps) {
  const Icon = category.icon;
  
  return (
    <Badge
      variant={isSelected ? 'default' : 'outline'}
      className={`cursor-pointer px-3 py-1.5 h-9 hover:bg-primary hover:text-primary-foreground transition-colors ${
        isSelected ? 'bg-primary text-primary-foreground' : 'bg-background'
      }`}
      onClick={onClick}
    >
      <Icon className="h-4 w-4 mr-1.5" />
      <span>{category.name}</span>
      {count > 0 && category.id !== 'all' && (
        <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
          isSelected 
            ? 'bg-primary-foreground/20 text-primary-foreground' 
            : 'bg-muted text-muted-foreground'
        }`}>
          {count}
        </span>
      )}
    </Badge>
  );
}