import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Brain, 
  Filter,
  Calendar,
  TrendingUp,
  MapPin,
  MessageCircle,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RecallMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecallMasterActionPopup({ open, onOpenChange }: RecallMasterActionPopupProps) {
  const navigate = useNavigate();

  const recallActions = [
    {
      title: "Ask AI Question",
      description: "Query your memories with natural language AI search",
      icon: MessageCircle,
      onClick: () => {
        console.log("Open AI chat search");
        onOpenChange(false);
      },
      color: "bg-primary/10 text-primary hover:bg-primary/20"
    },
    {
      title: "Advanced Search",
      description: "Use filters, tags, and date ranges to find memories",
      icon: Search,
      onClick: () => {
        console.log("Open advanced search");
        onOpenChange(false);
      },
      color: "bg-accent/10 text-accent-foreground hover:bg-accent/20"
    },
    {
      title: "Pattern Analysis",
      description: "Discover trends and patterns in your wellness data",
      icon: TrendingUp,
      onClick: () => {
        console.log("Run pattern analysis");
        onOpenChange(false);
      },
      color: "bg-secondary/10 text-secondary-foreground hover:bg-secondary/20"
    },
    {
      title: "Memory Insights",
      description: "Get AI-powered insights from your health journey",
      icon: Brain,
      onClick: () => {
        console.log("Generate insights");
        onOpenChange(false);
      },
      color: "bg-muted/20 text-muted-foreground hover:bg-muted/30"
    },
    {
      title: "Search by Date",
      description: "Browse memories from specific time periods",
      icon: Calendar,
      onClick: () => {
        navigate('/memory/timeline');
        onOpenChange(false);
      },
      color: "bg-primary/10 text-primary hover:bg-primary/20"
    },
    {
      title: "Location Memories",
      description: "Find entries by places and locations visited",
      icon: MapPin,
      onClick: () => {
        console.log("Search by location");
        onOpenChange(false);
      },
      color: "bg-accent/10 text-accent-foreground hover:bg-accent/20"
    },
    {
      title: "Filter by Category",
      description: "Browse memories by wellness pillars and categories",
      icon: Filter,
      onClick: () => {
        console.log("Open category filters");
        onOpenChange(false);
      },
      color: "bg-secondary/10 text-secondary-foreground hover:bg-secondary/20"
    },
    {
      title: "Quick Recalls",
      description: "Access frequently searched memories and queries",
      icon: Zap,
      onClick: () => {
        console.log("Show quick recalls");
        onOpenChange(false);
      },
      color: "bg-muted/20 text-muted-foreground hover:bg-muted/30"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-4">
            Memory Search & Recall Actions
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recallActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card 
                key={index}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20"
                onClick={action.onClick}
              >
                <CardHeader className="pb-3">
                  <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {action.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-center pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}