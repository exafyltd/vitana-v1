import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { IdentityForm } from "../editor/IdentityForm";

interface IdentityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IdentityDrawer({ open, onOpenChange }: IdentityDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Edit Identity</DrawerTitle>
        </DrawerHeader>
        
        <div className="px-6 pb-6 overflow-y-auto flex-1">
          <IdentityForm />
        </div>
        
        <DrawerFooter>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1">
              Save Changes
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}