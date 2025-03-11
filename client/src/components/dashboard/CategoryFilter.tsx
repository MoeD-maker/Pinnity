import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
  Utensils,
  Coffee,
  ShoppingBag,
  Scissors,
  Dumbbell,
  Ticket,
  Wrench,
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
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {CATEGORIES.map(category => {
          const Icon = category.icon;
          const isSelected = 
            category.id === 'all' 
              ? selectedCategories.length === 0 || selectedCategories.includes('all')
              : selectedCategories.includes(category.id);
          const count = dealCounts[category.id] || 0;
          
          return (
            <div
              key={category.id}
              onClick={() => onChange(category.id)}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md cursor-pointer transition-colors ${
                isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-background border hover:bg-secondary'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm truncate">{category.name}</span>
              {count > 0 && category.id !== 'all' && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  isSelected 
                    ? 'bg-primary-foreground/20 text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}