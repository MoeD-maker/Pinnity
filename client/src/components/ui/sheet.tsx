import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 safe-area-padding-horizontal",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

/**
 * Enhanced sheet variants with improved responsive behavior:
 * - Added multiple size variants (xs, sm, md, lg, xl, full) for more control
 * - Improves mobile experience with adaptive sizing
 * - Handles landscape orientation with responsive sizing
 * - Better utilizes available space across different devices
 */
const sheetVariants = cva(
  "fixed z-50 gap-3 sm:gap-4 bg-background p-4 sm:p-5 md:p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 overflow-y-auto",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top max-h-[85vh] landscape:max-h-[90vh]",
        bottom:
          "inset-x-0 bottom-0 border-t pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom))] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom max-h-[85vh] landscape:max-h-[90vh]",
        left: "inset-y-0 left-0 h-full border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left pl-[calc(0.5rem+env(safe-area-inset-left))]",
        right:
          "inset-y-0 right-0 h-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right pr-[calc(0.5rem+env(safe-area-inset-right))]",
      },
      size: {
        xs: "w-[85%] sm:w-[385px] sm:max-w-[385px]",
        sm: "w-[90%] sm:w-[450px] sm:max-w-[450px]",
        md: "w-[92%] sm:w-[550px] sm:max-w-[550px]",
        lg: "w-[95%] sm:w-[650px] sm:max-w-[650px]",
        xl: "w-[98%] sm:w-[800px] sm:max-w-[800px]",
        full: "w-full h-full sm:w-full sm:max-w-full",
      },
      fullOnMobile: {
        true: "w-full sm:w-auto landscape:w-[90%]",
      },
    },
    compoundVariants: [
      {
        side: ["left", "right"],
        size: "xs",
        className: "w-[85%] sm:w-[385px] sm:max-w-[385px]",
      },
      {
        side: ["left", "right"],
        size: "sm",
        className: "w-[90%] sm:w-[450px] sm:max-w-[450px]",
      },
      {
        side: ["left", "right"],
        size: "md",
        className: "w-[92%] sm:w-[550px] sm:max-w-[550px]",
      },
      {
        side: ["left", "right"],
        size: "lg",
        className: "w-[95%] sm:w-[650px] sm:max-w-[650px]",
      },
      {
        side: ["left", "right"],
        size: "xl",
        className: "w-[98%] sm:w-[800px] sm:max-w-[800px]",
      },
      {
        side: ["left", "right"],
        size: "full",
        className: "w-full h-full",
      },
      {
        side: ["left", "right"],
        fullOnMobile: true,
        className: "w-full sm:w-auto landscape:w-[90%]",
      },
    ],
    defaultVariants: {
      side: "right",
      size: "md",
      fullOnMobile: false,
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ 
  side = "right", 
  size = "md", 
  fullOnMobile = false, 
  className, 
  children, 
  ...props 
}, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        sheetVariants({ side, size, fullOnMobile }), 
        className,
        size === "full" ? "landscape:h-[98vh]" : ""
      )}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="absolute right-2 top-2 sm:right-3 sm:top-3 md:right-4 md:top-4 rounded-full p-2 sm:p-2.5 md:p-2 opacity-70 bg-background/90 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation">
        <X className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1 sm:space-y-1.5 md:space-y-2 text-center sm:text-left mb-2 sm:mb-3 md:mb-4",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
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
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-base sm:text-lg font-semibold leading-tight sm:leading-none tracking-tight text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-xs sm:text-sm text-muted-foreground mt-1", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

/**
 * Enhanced scrollable content container for sheets
 * - Improves mobile experience with adaptive height
 * - Properly handles landscape orientation with adjusted height
 * - Provides smooth scrolling experience on touch devices
 */
const ScrollableSheetContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /**
     * Maximum height of the scrollable area
     * - Defaults to 70vh on mobile, 80vh on larger screens
     * - Set to 'auto' to use container height
     */
    maxHeight?: string;
    /** Add padding to bottom to account for safe area insets */
    withSafeAreaPadding?: boolean;
  }
>(({ 
  className, 
  children, 
  maxHeight,
  withSafeAreaPadding = false,
  ...props 
}, ref) => (
  <div
    ref={ref}
    className={cn(
      "modal-scroll-container overflow-y-auto overscroll-contain -mx-4 px-4 sm:-mx-5 sm:px-5 md:-mx-6 md:px-6",
      withSafeAreaPadding && "safe-area-padding-bottom pb-2",
      maxHeight ? "" : "max-h-[70vh] sm:max-h-[80vh] landscape:max-h-[85vh]",
      "landscape-sheet-adjust",
      className
    )}
    style={maxHeight ? { maxHeight } : undefined}
    {...props}
  >
    {children}
  </div>
))
ScrollableSheetContent.displayName = "ScrollableSheetContent"

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  ScrollableSheetContent,
}
