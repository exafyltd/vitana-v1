import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

// ============================================================================
// ResponsiveDialog - Automatically renders as bottom sheet on mobile
// ============================================================================

interface ResponsiveDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const ResponsiveDialog = ({ children, ...props }: ResponsiveDialogProps) => {
  return <DialogPrimitive.Root {...props}>{children}</DialogPrimitive.Root>
}

const ResponsiveDialogTrigger = DialogPrimitive.Trigger

const ResponsiveDialogClose = DialogPrimitive.Close

// Mobile-optimized overlay with blur
interface ResponsiveDialogOverlayProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> {
  overlayClassName?: string
}

const ResponsiveDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  ResponsiveDialogOverlayProps
>(({ className, overlayClassName, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      overlayClassName,
      className
    )}
    {...props}
  />
))
ResponsiveDialogOverlay.displayName = "ResponsiveDialogOverlay"

// Content wrapper that switches between centered dialog and bottom sheet
interface ResponsiveDialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Force fullscreen on mobile instead of bottom sheet */
  fullscreenOnMobile?: boolean
  /** Hide the default close button */
  hideCloseButton?: boolean
  /** Additional class for the overlay (e.g. z-index overrides) */
  overlayClassName?: string
}

const ResponsiveDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ResponsiveDialogContentProps
>(({ className, children, fullscreenOnMobile = false, hideCloseButton = false, overlayClassName, ...props }, ref) => {
  const isMobile = useIsMobile()

  return (
    <DialogPrimitive.Portal>
      <ResponsiveDialogOverlay overlayClassName={overlayClassName} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 bg-background shadow-lg outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          // Desktop styles - centered dialog
          !isMobile && [
            "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
            "w-full max-w-lg rounded-lg border p-6",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          ],
          // Mobile styles - bottom sheet or fullscreen
          isMobile && [
            fullscreenOnMobile
              ? "inset-0 rounded-none"
              : [
                  "inset-x-0 bottom-0 rounded-t-2xl border-t",
                  "max-h-[calc(100dvh-24px)]",
                  "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
                ],
            // Safe area padding for iOS
            "pb-[env(safe-area-inset-bottom)]",
          ],
          className
        )}
        {...props}
      >
        {/* Drag handle for mobile bottom sheet */}
        {isMobile && !fullscreenOnMobile && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        )}
        
        {/* Content wrapper with proper scrolling */}
        <div className={cn(
          "flex flex-col",
          isMobile && !fullscreenOnMobile && "max-h-[calc(100dvh-80px)]",
          isMobile && fullscreenOnMobile && "h-full"
        )}>
          {children}
        </div>
        
        {/* Close button - always accessible with 44px tap target on mobile */}
        {!hideCloseButton && (
          <DialogPrimitive.Close 
            className={cn(
              "absolute rounded-sm opacity-70 ring-offset-background transition-opacity",
              "hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
              isMobile
                ? "right-2 top-1 z-20 w-10 h-10 flex items-center justify-center"
                : "right-4 top-4"
            )}
          >
            <X className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")} />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
})
ResponsiveDialogContent.displayName = "ResponsiveDialogContent"

// Header - sticky on mobile
const ResponsiveDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useIsMobile()
  
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5",
        isMobile 
          ? "sticky top-0 z-10 bg-background px-4 pr-12 pt-2 pb-3 text-center border-b"
          : "text-center sm:text-left",
        className
      )}
      {...props}
    />
  )
}
ResponsiveDialogHeader.displayName = "ResponsiveDialogHeader"

// Body - scrollable area
const ResponsiveDialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useIsMobile()
  
  return (
    <div
      className={cn(
        isMobile && [
          "flex-1 overflow-y-auto overscroll-contain",
          "px-4 py-4",
          // iOS smooth scrolling
          "[&::-webkit-scrollbar]:hidden",
          "[-webkit-overflow-scrolling:touch]"
        ],
        className
      )}
      {...props}
    />
  )
}
ResponsiveDialogBody.displayName = "ResponsiveDialogBody"

// Footer - sticky on mobile
const ResponsiveDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useIsMobile()
  
  return (
    <div
      className={cn(
        isMobile
          ? "sticky bottom-0 z-10 bg-background px-4 py-3 border-t flex flex-col gap-2"
          : "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      {...props}
    />
  )
}
ResponsiveDialogFooter.displayName = "ResponsiveDialogFooter"

// Title
const ResponsiveDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
ResponsiveDialogTitle.displayName = "ResponsiveDialogTitle"

// Description
const ResponsiveDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
ResponsiveDialogDescription.displayName = "ResponsiveDialogDescription"

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
}
