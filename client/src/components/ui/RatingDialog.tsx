import React, { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RatingData, ratingSchema } from '@shared/schema';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

interface RatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RatingData) => void;
  onSkip?: () => void;
  dealTitle: string;
  businessName: string;
}

export default function RatingDialog({
  isOpen,
  onClose,
  onSubmit,
  onSkip,
  dealTitle,
  businessName,
}: RatingDialogProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const { toast } = useToast();

  const form = useForm<RatingData>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  const displayRating = hoveredRating !== null ? hoveredRating : rating;

  const handleRatingClick = (value: number) => {
    setRating(value);
    form.setValue('rating', value, { shouldValidate: true });
  };

  const handleRatingHover = (value: number | null) => {
    setHoveredRating(value);
  };

  const handleFormSubmit = (data: RatingData) => {
    if (data.rating === 0) {
      toast({
        variant: 'destructive',
        title: 'Please select a rating',
        description: 'Please select a star rating before submitting.',
      });
      return;
    }
    
    onSubmit(data);
    onClose();
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Rate Your Experience</DialogTitle>
          <DialogDescription className="text-center">
            How was your experience with <span className="font-semibold">{dealTitle}</span> from {businessName}?
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center my-4">
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handleRatingClick(value)}
                onMouseEnter={() => handleRatingHover(value)}
                onMouseLeave={() => handleRatingHover(null)}
                className="p-1 focus:outline-none"
              >
                {value <= displayRating ? (
                  <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                ) : (
                  <Star className="w-8 h-8 text-gray-300" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-sm mb-4">
          {displayRating === 1 && "Poor"}
          {displayRating === 2 && "Fair"}
          {displayRating === 3 && "Good"}
          {displayRating === 4 && "Very Good"}
          {displayRating === 5 && "Excellent"}
          {displayRating === 0 && "Tap a star to rate"}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Share your experience (optional)"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="sm:justify-between gap-2">
              <Button type="button" variant="outline" onClick={handleSkip} className="flex-1">
                Skip
              </Button>
              <Button type="submit" className="flex-1">
                Submit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}