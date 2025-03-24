import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Coffee, 
  UtensilsCrossed, 
  ShoppingBag, 
  Sparkles, 
  Dumbbell, 
  Popcorn, 
  Wrench, 
  Plane, 
  Wine, 
  Shapes
} from 'lucide-react';
import { CATEGORIES } from '@/components/dashboard/CategoryFilter';

interface CategoryCardsProps {
  selectedCategories: string[];
  onChange: (category: string) => void;
  dealCounts: Record<string, number>;
}

// Category icon mapping
const categoryIcons: Record<string, React.ReactNode> = {
  'restaurants': <UtensilsCrossed className="h-5 w-5" />,
  'cafes': <Coffee className="h-5 w-5" />,
  'retail': <ShoppingBag className="h-5 w-5" />,
  'beauty': <Sparkles className="h-5 w-5" />,
  'health': <Dumbbell className="h-5 w-5" />,
  'entertainment': <Popcorn className="h-5 w-5" />,
  'services': <Wrench className="h-5 w-5" />,
  'travel': <Plane className="h-5 w-5" />,
  'nightlife': <Wine className="h-5 w-5" />,
  'other': <Shapes className="h-5 w-5" />
};

export default function CategoryCards({ selectedCategories, onChange, dealCounts }: CategoryCardsProps) {
  return (
    <div className="pb-4">
      <h3 className="font-medium text-base sm:text-lg mb-3">Browse Categories</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        {CATEGORIES.filter(cat => cat.id !== 'all').map((category) => {
          const isSelected = selectedCategories.includes(category.id);
          const count = dealCounts[category.id] || 0;
          
          return (
            <Card 
              key={category.id}
              className={`cursor-pointer transition-all overflow-hidden ${
                isSelected ? 'ring-2 ring-primary' : ''
              } hover:shadow-md`}
              onClick={() => onChange(category.id)}
            >
              <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center min-h-[90px] justify-center">
                <div className={`rounded-full p-2.5 mb-2 ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {categoryIcons[category.id] || categoryIcons['other']}
                </div>
                <span className="text-sm font-medium">{category.name}</span>
                {count > 0 && (
                  <Badge variant="outline" className="mt-1.5 text-xs px-2 py-0.5">
                    {count}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}