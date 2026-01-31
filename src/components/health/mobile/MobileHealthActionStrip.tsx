import { Button } from "@/components/ui/button";

interface MobileHealthActionStripProps {
  onUploadBloodTest: () => void;
  onOrderBloodTest: () => void;
  onViewPlans: () => void;
}

export function MobileHealthActionStrip({ 
  onUploadBloodTest, 
  onOrderBloodTest, 
  onViewPlans 
}: MobileHealthActionStripProps) {
  return (
    <div className="mx-4 mt-6 mb-8">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button 
          onClick={onUploadBloodTest}
          variant="outline"
          className="flex-shrink-0 whitespace-nowrap border-white/10 bg-white/5 hover:bg-white/10 text-white"
        >
          Upload Blood Test
        </Button>
        <Button 
          onClick={onOrderBloodTest}
          variant="outline"
          className="flex-shrink-0 whitespace-nowrap border-white/10 bg-white/5 hover:bg-white/10 text-white"
        >
          Order Blood Test
        </Button>
        <Button 
          onClick={onViewPlans}
          variant="outline"
          className="flex-shrink-0 whitespace-nowrap border-white/10 bg-white/5 hover:bg-white/10 text-white"
        >
          View Plans
        </Button>
      </div>
    </div>
  );
}
