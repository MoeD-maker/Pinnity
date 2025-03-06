import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  score: number;
  feedback: string;
}

export default function PasswordStrengthIndicator({
  score,
  feedback
}: PasswordStrengthIndicatorProps) {
  const getColorForSegment = (segmentIndex: number) => {
    if (segmentIndex >= score) return "bg-gray-200";
    
    if (score === 1) return "bg-red-500";
    if (score === 2) return "bg-yellow-500";
    if (score === 3) return "bg-orange-500";
    if (score === 4) return "bg-green-500";
    
    return "bg-gray-200";
  };

  return (
    <div className="space-y-1">
      <div className="flex space-x-1">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-1 flex-1 rounded-sm transition-all duration-200",
              getColorForSegment(index)
            )}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">{feedback}</p>
    </div>
  );
}
