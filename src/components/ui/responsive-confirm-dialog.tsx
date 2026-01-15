import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"

// ============================================================================
// ResponsiveConfirmDialog - For confirmation flows, mobile-friendly
// ============================================================================

const ResponsiveConfirmDialog = AlertDialogPrimitive.Root

const ResponsiveConfirmDialogTrigger = AlertDialogPrimitive.Trigger

// Mobile-optimized overlay
const ResponsiveConfirmDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
ResponsiveConfirmDialogOverlay.displayName = "ResponsiveConfirmDialogOverlay"

// Content - switches between centered and bottom sheet
const ResponsiveConfirmDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const isMobile = useIsMobile()

  return (
    <AlertDialogPrimitive.Portal>
      <ResponsiveConfirmDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 bg-background shadow-lg outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          // Desktop styles
          !isMobile && [
            "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
            "w-full max-w-lg rounded-lg border p-6",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          ],
          // Mobile styles - bottom sheet
          isMobile && [
            "inset-x-0 bottom-0 rounded-t-2xl border-t",
            "max-h-[calc(100dvh-24px)]",
            "pb-[env(safe-area-inset-bottom)]",
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          ],
          className
        )}
        {...props}
      >
        {/* Drag handle for mobile */}
        {isMobile && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        )}
        
        <div className={cn(
          "flex flex-col",
          isMobile && "px-4 pb-4"
        )}>
          {children}
        </div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  )
})
ResponsiveConfirmDialogContent.displayName = "ResponsiveConfirmDialogContent"

// Header
const ResponsiveConfirmDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useIsMobile()
  
  return (
    <div
      className={cn(
        "flex flex-col space-y-2",
        isMobile ? "text-center pt-2 pb-4" : "text-center sm:text-left",
        className
      )}
      {...props}
    />
  )
}
ResponsiveConfirmDialogHeader.displayName = "ResponsiveConfirmDialogHeader"

// Footer with mobile-optimized button layout
const ResponsiveConfirmDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useIsMobile()
  
  return (
    <div
      className={cn(
        isMobile
          ? "flex flex-col-reverse gap-2 pt-2"
          : "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      {...props}
    />
  )
}
ResponsiveConfirmDialogFooter.displayName = "ResponsiveConfirmDialogFooter"

// Title
const ResponsiveConfirmDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
))
ResponsiveConfirmDialogTitle.displayName = "ResponsiveConfirmDialogTitle"

// Description
const ResponsiveConfirmDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
ResponsiveConfirmDialogDescription.displayName = "ResponsiveConfirmDialogDescription"

// Action button - larger tap target on mobile
const ResponsiveConfirmDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => {
  const isMobile = useIsMobile()
  
  return (
    <AlertDialogPrimitive.Action
      ref={ref}
      className={cn(
        buttonVariants(),
        isMobile && "h-12 text-base",
        className
      )}
      {...props}
    />
  )
})
ResponsiveConfirmDialogAction.displayName = "ResponsiveConfirmDialogAction"

// Cancel button - larger tap target on mobile
const ResponsiveConfirmDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => {
  const isMobile = useIsMobile()
  
  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      className={cn(
        buttonVariants({ variant: "outline" }),
        !isMobile && "mt-2 sm:mt-0",
        isMobile && "h-12 text-base",
        className
      )}
      {...props}
    />
  )
})
ResponsiveConfirmDialogCancel.displayName = "ResponsiveConfirmDialogCancel"

export {
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogTrigger,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogTitle,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
}
