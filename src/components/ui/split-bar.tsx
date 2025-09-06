import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const SplitBar = TabsPrimitive.Root;

interface SplitBarListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  children: React.ReactNode;
}

const SplitBarList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  SplitBarListProps
>(({ className, children, ...props }, ref) => {
  // Use static grid classes based on number of children
  const childCount = React.Children.count(children);
  const gridColsClass = childCount === 2 ? "grid-cols-2" : 
                        childCount === 3 ? "grid-cols-3" : 
                        childCount === 4 ? "grid-cols-4" : "grid-cols-2";
  
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "grid w-full mb-6",
        gridColsClass,
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  );
});
SplitBarList.displayName = TabsPrimitive.List.displayName;

const SplitBarTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
));
SplitBarTrigger.displayName = TabsPrimitive.Trigger.displayName;

const SplitBarContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
SplitBarContent.displayName = TabsPrimitive.Content.displayName;

export { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent };