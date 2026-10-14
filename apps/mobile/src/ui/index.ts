/**
 * VTID-05176 — `@vitana/ui`: Vitana Native UI core primitives (Native app
 * Wave 1, lane N2). Each primitive is the native twin of the shadcn/Radix
 * component today's PHONE UI renders, with the web prop names wherever React
 * Native allows (prop map: apps/mobile/README.md "Vitana Native UI").
 * The sonner-compatible `toast` lives at `@vitana/ui/sonner`.
 */
export { VitanaUIProvider, type VitanaUIProviderProps } from './provider/VitanaUIProvider';
export { useTheme, useDirection, useReducedMotion, type Theme, type Direction } from './provider/context';
export { tokens, resolveColors, withAlpha, type ColorScheme, type SemanticColors, type ShadowStyle, type TenantId, type VitanaTokens } from './theme';

export { Text, type TextProps } from './foundation/Text';
export { Slot } from './foundation/Slot';

export { useOrbSuppressed, subscribeOrbSuppression, isOrbSuppressed, getOrbSuppressionCount } from './overlay/stack';
export { computePlacement, type Side, type Align, type Rect } from './overlay/placement';

export { Button, buttonStyles, useButtonForeground, BUTTON_VARIANTS, BUTTON_SIZES, type ButtonProps, type ButtonVariant, type ButtonSize } from './button';
export { Badge, BADGE_VARIANTS, type BadgeProps, type BadgeVariant } from './badge';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
export { Input, type InputProps } from './input';
export { Textarea, type TextareaProps } from './textarea';
export { Label, type LabelProps } from './label';
export { Separator, type SeparatorProps } from './separator';
export { Skeleton } from './skeleton';
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogContentNoAnimation,
  DialogContentNoOverlay,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './alert-dialog';
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
} from './responsive-confirm-dialog';
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
  SHEET_SIDES,
  type SheetSide,
} from './sheet';
export { Drawer, DrawerPortal, DrawerOverlay, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription } from './drawer';
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
} from './responsive-dialog';
export { ResponsivePopover, ResponsivePopoverTrigger, ResponsivePopoverContent, ResponsivePopoverClose } from './responsive-popover';
export { Popover, PopoverTrigger, PopoverContent } from './popover';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select';
export { Switch, type SwitchProps } from './switch';
export { Slider, snapToStep, valueFromDrag, type SliderProps } from './slider';
export { Checkbox, type CheckboxProps, type CheckedState } from './checkbox';
export { RadioGroup, RadioGroupItem } from './radio-group';
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion';
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible';
export { Avatar, AvatarImage, AvatarFallback } from './avatar';
export { Progress, type ProgressProps } from './progress';
export { ScrollArea, ScrollBar } from './scroll-area';

export { notify, notifySuccess, notifyError, notifyWarning, notifyInfo } from './toast/notify';
export { toast, useToast, type ToastProps } from './toast/use-toast';
