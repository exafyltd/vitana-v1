import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { useVitanalandNavigation } from "@/context/VitanalandNavigationContext";

export function VitanaButton() {
  const { expandToFull } = useVitanalandNavigation();
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            size="sm" 
            variant="outline"
            onClick={expandToFull}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            VITANA
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Enter Vitanaland (⌘K)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
