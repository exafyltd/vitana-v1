import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { t } from '@/lib/i18n-toast';

// ============================================================================
// ResponsivePopover - Renders as popover on desktop, bottom sheet on mobile
// ============================================================================

interface ResponsivePopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  isMobile: boolean
}

const ResponsivePopoverContext = React.createContext<ResponsivePopoverContextValue | null>(null)

// Hook to safely access the context
const useResponsivePopoverContext = () => {
  const context = React.useContext(ResponsivePopoverContext)
  if (!context) {
    throw new Error("ResponsivePopover components must be used within a ResponsivePopover")
  }
  return context
}

interface ResponsivePopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  children: React.ReactNode
}

const ResponsivePopover = ({ 
  open: controlledOpen, 
  onOpenChange,
  defaultOpen = false,
  children 
}: ResponsivePopoverProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isMobile = useIsMobile()
  
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = React.useCallback((newOpen: boolean) => {
    setUncontrolledOpen(newOpen)
    onOpenChange?.(newOpen)
  }, [onOpenChange])

  // Include isMobile in context so children use the same value
  const contextValue = React.useMemo(() => ({ open, setOpen, isMobile }), [open, setOpen, isMobile])

  if (isMobile) {
    return (
      <ResponsivePopoverContext.Provider value={contextValue}>
        <SheetPrimitive.Root open={open} onOpenChange={setOpen}>
          {children}
        </SheetPrimitive.Root>
      </ResponsivePopoverContext.Provider>
    )
  }

  return (
    <ResponsivePopoverContext.Provider value={contextValue}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        {children}
      </PopoverPrimitive.Root>
    </ResponsivePopoverContext.Provider>
  )
}

// Trigger that works for both popover and sheet
const ResponsivePopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ children, ...props }, ref) => {
  const { isMobile } = useResponsivePopoverContext()
  
  if (isMobile) {
    return (
      <SheetPrimitive.Trigger ref={ref} asChild {...props}>
        {children}
      </SheetPrimitive.Trigger>
    )
  }

  return (
    <PopoverPrimitive.Trigger ref={ref} asChild {...props}>
      {children}
    </PopoverPrimitive.Trigger>
  )
})
ResponsivePopoverTrigger.displayName = "ResponsivePopoverTrigger"

// Mobile sheet overlay
const MobileSheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
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
MobileSheetOverlay.displayName = "MobileSheetOverlay"

// Content - popover on desktop, bottom sheet on mobile
interface ResponsivePopoverContentProps 
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  /** Title shown in mobile sheet header */
  title?: string
  /** Hide the close button on mobile */
  hideCloseButton?: boolean
}

const ResponsivePopoverContent = React.forwardRef<
  HTMLDivElement,
  ResponsivePopoverContentProps
>(({ 
  className, 
  children, 
  title,
  hideCloseButton = false,
  align = "center", 
  sideOffset = 4, 
  ...props 
}, ref) => {
  const { isMobile } = useResponsivePopoverContext()

  if (isMobile) {
    return (
      <SheetPrimitive.Portal>
        <MobileSheetOverlay />
        <SheetPrimitive.Content
          ref={ref as React.Ref<HTMLDivElement>}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl border-t shadow-lg",
            "max-h-[calc(100dvh-24px)] pb-[env(safe-area-inset-bottom)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            "data-[state=closed]:duration-200 data-[state=open]:duration-300",
            className
          )}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          
          {/* Header with title and close */}
          {(title || !hideCloseButton) && (
            <div className="flex items-center justify-between px-4 py-2 border-b">
              {title && (
                <SheetPrimitive.Title className="text-base font-semibold">
                  {title}
                </SheetPrimitive.Title>
              )}
              {!title && <div />}
              {!hideCloseButton && (
                <SheetPrimitive.Close style={{ boxShadow: 'none' }} className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-accent -mr-2">
                  <X className="h-5 w-5" />
                  <span className="sr-only">{t('screens.ui.close')}</span>
                </SheetPrimitive.Close>
              )}
            </div>
          )}
          
          {/* Scrollable content */}
          <div className={cn(
            "overflow-y-auto overscroll-contain max-h-[calc(100dvh-140px)]",
            "[-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden",
            "p-4"
          )}>
            {children}
          </div>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    )
  }

  // Desktop popover
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
})
ResponsivePopoverContent.displayName = "ResponsivePopoverContent"

// Close button for programmatic closing
const ResponsivePopoverClose = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button">
>(({ children, ...props }, ref) => {
  const { isMobile } = useResponsivePopoverContext()
  
  if (isMobile) {
    return (
      <SheetPrimitive.Close ref={ref} asChild {...props}>
        {children}
      </SheetPrimitive.Close>
    )
  }

  return (
    <PopoverPrimitive.Close ref={ref} asChild {...props}>
      {children}
    </PopoverPrimitive.Close>
  )
})
ResponsivePopoverClose.displayName = "ResponsivePopoverClose"

export {
  ResponsivePopover,
  ResponsivePopoverTrigger,
  ResponsivePopoverContent,
  ResponsivePopoverClose,
}
