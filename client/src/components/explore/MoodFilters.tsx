import React from 'react';
import { 
  Utensils, 
  Wine, 
  Heart, 
  Users, 
  Coffee, 
  Banana, 
  Clock, 
  DollarSign,
  FolderHeart,
  Pizza
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type MoodFilter = 'dateNight' | 'familyFun' | 'quickBites' | 'budgetFriendly' | 'treatYourself' | 'groupDining' | 'coffee' | 'healthy' | 'lunchSpecials' | 'dinnerDeals';

interface MoodFiltersProps {
  selectedMoods: MoodFilter[];
  onChange: (mood: MoodFilter) => void;
  className?: string;
}

export default function MoodFilters({ selectedMoods, onChange, className = '' }: MoodFiltersProps) {
  // Mood/occasion filters data
  const moodOptions = [
    { 
      id: 'dateNight' as MoodFilter, 
      label: 'Date Night', 
      icon: <Heart className="h-3.5 w-3.5" />,
      color: 'bg-red-100 hover:bg-red-200 border-red-200 text-red-700'
    },
    { 
      id: 'familyFun' as MoodFilter, 
      label: 'Family Fun', 
      icon: <Users className="h-3.5 w-3.5" />,
      color: 'bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-700'
    },
    { 
      id: 'quickBites' as MoodFilter, 
      label: 'Quick Bites', 
      icon: <Pizza className="h-3.5 w-3.5" />,
      color: 'bg-amber-100 hover:bg-amber-200 border-amber-200 text-amber-700'
    },
    { 
      id: 'budgetFriendly' as MoodFilter, 
      label: 'Budget Friendly', 
      icon: <DollarSign className="h-3.5 w-3.5" />,
      color: 'bg-green-100 hover:bg-green-200 border-green-200 text-green-700'
    },
    { 
      id: 'treatYourself' as MoodFilter, 
      label: 'Treat Yourself', 
      icon: <FolderHeart className="h-3.5 w-3.5" />,
      color: 'bg-purple-100 hover:bg-purple-200 border-purple-200 text-purple-700'
    },
    { 
      id: 'groupDining' as MoodFilter, 
      label: 'Group Dining', 
      icon: <Utensils className="h-3.5 w-3.5" />,
      color: 'bg-orange-100 hover:bg-orange-200 border-orange-200 text-orange-700'
    },
    { 
      id: 'coffee' as MoodFilter, 
      label: 'Coffee Break', 
      icon: <Coffee className="h-3.5 w-3.5" />,
      color: 'bg-brown-100 hover:bg-brown-200 border-brown-200 text-brown-700'
    },
    { 
      id: 'healthy' as MoodFilter, 
      label: 'Healthy Options', 
      icon: <Banana className="h-3.5 w-3.5" />,
      color: 'bg-green-100 hover:bg-green-200 border-green-200 text-green-700'
    },
    { 
      id: 'lunchSpecials' as MoodFilter, 
      label: 'Lunch Specials', 
      icon: <Clock className="h-3.5 w-3.5" />,
      color: 'bg-cyan-100 hover:bg-cyan-200 border-cyan-200 text-cyan-700'
    },
    { 
      id: 'dinnerDeals' as MoodFilter, 
      label: 'Dinner Deals', 
      icon: <Wine className="h-3.5 w-3.5" />,
      color: 'bg-indigo-100 hover:bg-indigo-200 border-indigo-200 text-indigo-700'
    }
  ];
  
  return (
    <div className={className}>
      <h3 className="text-sm sm:text-base font-medium mb-2">Filter by mood & occasion</h3>
      <div className="flex flex-wrap gap-2">
        {moodOptions.map(mood => {
          const isSelected = selectedMoods.includes(mood.id);
          
          return (
            <Badge 
              key={mood.id}
              variant="outline"
              className={`cursor-pointer px-3 py-1.5 ${mood.color} ${
                isSelected ? 'ring-1 ring-offset-1 ring-primary' : ''
              } h-9`}
              onClick={() => onChange(mood.id)}
            >
              <span className="flex items-center gap-1.5">
                {mood.icon}
                <span className="font-medium">{mood.label}</span>
              </span>
            </Badge>
          );
        })}
      </div>
    </div>
  );
}