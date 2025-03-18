import React from 'react';
import { Progress } from '@/components/ui/progress';

interface PasswordStrengthIndicatorProps {
  score: number;
  feedback: string;
}

export default function PasswordStrengthIndicator({
  score,
  feedback,
}: PasswordStrengthIndicatorProps) {
  // Get color based on password strength score
  const getColor = () => {
    switch (score) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-orange-500';
      case 3:
        return 'bg-yellow-500';
      case 4:
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  // Get label based on password strength score
  const getLabel = () => {
    switch (score) {
      case 0:
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return '';
    }
  };
  
  // Get label color class
  const getLabelColorClass = () => {
    switch (score) {
      case 0:
      case 1:
        return 'text-red-700';
      case 2:
        return 'text-orange-700';
      case 3:
        return 'text-yellow-700';
      case 4:
        return 'text-green-700';
      default:
        return 'text-gray-500';
    }
  };

  // Calculate progress value (out of 100)
  const progressValue = score * 25; // 0, 25, 50, 75, 100

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between">
        <p className={`text-xs font-medium ${getLabelColorClass()}`}>{getLabel()}</p>
        <p className="text-xs text-gray-500">{progressValue}%</p>
      </div>
      <Progress value={progressValue} className={getColor()} />
      {feedback && <p className="mt-1 text-xs text-gray-500">{feedback}</p>}
    </div>
  );
}