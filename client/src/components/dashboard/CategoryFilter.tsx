import React from 'react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Keep any existing categories array if it exists in the file
export const CATEGORIES = [
  { id: "all", name: "All", count: 0 },
  { id: "food", name: "Food & Drink", count: 0 },
  { id: "retail", name: "Retail", count: 0 },
  { id: "health", name: "Health & Beauty", count: 0 },
  { id: "entertainment", name: "Entertainment", count: 0 },
  { id: "services", name: "Services", count: 0 },
  { id: "travel", name: "Travel", count: 0 },
  { id: "other", name: "Other", count: 0 },
];

export interface CategoryBadgeProps {
  isSelected?: boolean;
  isCount?: boolean;
  count?: number;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ 
  isSelected, 
  isCount, 
  count, 
  onClick, 
  className, 
  children 
}) => {
  return (
    <Button
      variant={isSelected ? "default" : "outline"}
      size="sm"
      className={cn(
        "rounded-full h-8 text-xs px-3 gap-1.5 whitespace-nowrap flex-shrink-0",
        isCount && "pr-2.5",
        className
      )}
      onClick={onClick}
    >
      {children}
      {isCount && count !== undefined && count > 0 && (
        <span className="ml-1 min-w-[1.1rem] text-center text-xs opacity-70">{count}</span>
      )}
    </Button>
  );
};

export interface CategoryFilterProps {
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  categories?: Array<{id: string; name: string; count?: number}>;
  className?: string;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory = "all",
  onSelectCategory,
  categories = CATEGORIES,
  className,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Filter By Category</h3>
        {selectedCategory !== "all" && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 text-xs"
            onClick={() => onSelectCategory?.("all")}
          >
            Clear
          </Button>
        )}
      </div>

      <ScrollArea className="w-full pb-4 px-0">
        <div className="flex gap-2 pb-2 pr-10">
          {categories.map(category => (
            <CategoryBadge
              key={category.id}
              isSelected={selectedCategory === category.id}
              isCount={true}
              count={category.count}
              onClick={() => onSelectCategory?.(category.id)}
            >
              {category.name}
            </CategoryBadge>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CategoryFilter;