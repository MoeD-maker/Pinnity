import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CategoryFilterProps {
  categories: string[];
  selectedCategories: string[];
  onChange: (category: string) => void;
}

export default function CategoryFilter({ 
  categories, 
  selectedCategories, 
  onChange 
}: CategoryFilterProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-medium mb-3">Filter by category</h3>
      <ScrollArea className="whitespace-nowrap pb-2">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <CategoryBadge
              key={category}
              category={category}
              isSelected={selectedCategories.includes(category)}
              onClick={() => onChange(category)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface CategoryBadgeProps {
  category: string;
  isSelected: boolean;
  onClick: () => void;
}

function CategoryBadge({ category, isSelected, onClick }: CategoryBadgeProps) {
  return (
    <Badge
      variant={isSelected ? 'default' : 'outline'}
      className={`cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors ${
        isSelected ? 'bg-primary text-primary-foreground' : 'bg-background'
      }`}
      onClick={onClick}
    >
      {category}
    </Badge>
  );
}