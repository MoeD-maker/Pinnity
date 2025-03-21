import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/hooks/use-motion"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const reducedMotion = useReducedMotion();
  
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] safe-area-padding-horizontal",
        // Apply animations only if reduced motion is not preferred
        !reducedMotion && "transition-all",
        !reducedMotion && "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      style={!reducedMotion ? { 
        transitionDuration: 'var(--animation-normal)' 
      } : undefined}
      {...props}
    />
  );
})
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const reducedMotion = useReducedMotion();
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-h-[85vh] md:max-h-[90vh] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-3 md:gap-4 border bg-background p-4 sm:p-5 md:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom))] overflow-y-auto shadow-lg rounded-lg sm:w-full",
          // Apply animations only if reduced motion is not preferred
          !reducedMotion && "transition-all",
          !reducedMotion && "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          !reducedMotion && "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          !reducedMotion && "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          !reducedMotion && "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          className
        )}
        style={!reducedMotion ? {
          transitionDuration: 'var(--animation-normal)'
        } : undefined}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-2 top-2 sm:right-3 sm:top-3 md:right-4 md:top-4 rounded-full p-2 sm:p-2.5 md:p-2 opacity-70 bg-background/90 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation">
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1 sm:space-y-1.5 text-center sm:text-left mb-2 sm:mb-3 md:mb-4",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0 mt-2 sm:mt-3 md:mt-4",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-base sm:text-lg font-semibold leading-tight sm:leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-xs sm:text-sm text-muted-foreground mt-1", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

const ScrollableDialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("modal-scroll-container", className)}
    {...props}
  >
    {children}
  </div>
))
ScrollableDialogContent.displayName = "ScrollableDialogContent"

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  ScrollableDialogContent,
}
