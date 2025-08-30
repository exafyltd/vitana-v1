import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AboutForm } from "../editor/AboutForm";

interface AboutDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDrawer({ open, onOpenChange }: AboutDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit About</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <AboutForm />
          
          <div className="flex gap-3 pt-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}