import React, { useState } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

interface BusinessDay {
  dayName: string;
  dayKey: string;
  displayName: string;
}

const DAYS_OF_WEEK: BusinessDay[] = [
  { dayName: "monday", dayKey: "monday", displayName: "Monday" },
  { dayName: "tuesday", dayKey: "tuesday", displayName: "Tuesday" },
  { dayName: "wednesday", dayKey: "wednesday", displayName: "Wednesday" },
  { dayName: "thursday", dayKey: "thursday", displayName: "Thursday" },
  { dayName: "friday", dayKey: "friday", displayName: "Friday" },
  { dayName: "saturday", dayKey: "saturday", displayName: "Saturday" },
  { dayName: "sunday", dayKey: "sunday", displayName: "Sunday" },
];

interface BusinessHoursFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export function BusinessHoursField({
  name,
  label = "Business Hours",
  required = false,
  className
}: BusinessHoursFieldProps) {
  const form = useFormContext();
  
  // Time input validation regex
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  // Handle time input change with validation
  const handleTimeChange = (day: string, field: 'open' | 'close', value: string) => {
    // Only accept valid time format or empty string
    if (value === "" || timeRegex.test(value)) {
      const path = `${name}.${day}.${field}`;
      form.setValue(path, value || null, { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
    }
  };
  
  // Handle closed toggle change
  const handleClosedChange = (day: string, closed: boolean) => {
    const dayPath = `${name}.${day}`;
    const currentValue = form.getValues(dayPath);
    
    form.setValue(dayPath, {
      ...currentValue,
      closed,
      // If switching to closed, clear times
      ...(closed ? { open: null, close: null } : {})
    }, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
  };
  
  return (
    <FormField
      control={form.control}
      name={name}
      render={() => (
        <FormItem className={className}>
          {label && (
            <FormLabel className={cn(
              "text-base font-medium",
              required && "after:content-['*'] after:ml-0.5 after:text-destructive"
            )}>
              {label}
            </FormLabel>
          )}
          
          <FormControl>
            <div className="space-y-3 mt-2">
              {DAYS_OF_WEEK.map((day) => {
                const dayPath = `${name}.${day.dayKey}`;
                const dayValue = form.watch(dayPath) || {};
                const isClosed = dayValue.closed;
                
                return (
                  <div key={day.dayKey} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm w-24">{day.displayName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Closed</span>
                          <Switch
                            checked={isClosed}
                            onCheckedChange={(checked) => handleClosedChange(day.dayKey, checked)}
                            aria-label={`${day.displayName} closed`}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Open</span>
                          <Input
                            value={dayValue.open || ""}
                            onChange={(e) => handleTimeChange(day.dayKey, 'open', e.target.value)}
                            disabled={isClosed}
                            placeholder="HH:MM"
                            className="w-20 h-8 text-sm"
                            aria-label={`${day.displayName} opening time`}
                          />
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Close</span>
                          <Input
                            value={dayValue.close || ""}
                            onChange={(e) => handleTimeChange(day.dayKey, 'close', e.target.value)}
                            disabled={isClosed}
                            placeholder="HH:MM"
                            className="w-20 h-8 text-sm"
                            aria-label={`${day.displayName} closing time`}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {day.dayKey !== "sunday" && <Separator className="my-2" />}
                  </div>
                );
              })}
            </div>
          </FormControl>
          
          <FormMessage />
        </FormItem>
      )}
    />
  );
}