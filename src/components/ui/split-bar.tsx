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
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "flex w-full mb-6 gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1",
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
>(({ className, children, ...props }, ref) => {
  // Process children to soften emojis while keeping text primary
  const processedChildren = React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      // Split text to find emoji patterns and wrap them with softer styling
      const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
      const parts = child.split(emojiRegex);
      return parts.map((part, i) => {
        if (emojiRegex.test(part)) {
          // Reset regex lastIndex after test
          emojiRegex.lastIndex = 0;
          return <span key={i} className="text-xs opacity-60 mr-1">{part}</span>;
        }
        return part;
      });
    }
    return child;
  });

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 snap-start",
        "bg-muted/40 text-muted-foreground",
        "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold",
        className
      )}
      {...props}
    >
      {processedChildren}
    </TabsPrimitive.Trigger>
  );
});
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