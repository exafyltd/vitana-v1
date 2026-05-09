import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, 
  Video,
  Headphones,
  Search,
  Bookmark,
  Share2,
  Download,
  GraduationCap,
  FileText,
  Users,
  Star,
  Clock
} from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface EducationMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EducationMasterActionPopup({ open, onOpenChange }: EducationMasterActionPopupProps) {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: "Browse Articles",
      description: "Explore curated health and wellness articles",
      icon: BookOpen,
      action: () => {
        onOpenChange(false);
        navigate('/health/education');
      }
    },
    {
      title: "Watch Videos",
      description: "Educational health videos and documentaries",
      icon: Video,
      action: () => {
        onOpenChange(false);
        navigate('/health/education');
      }
    },
    {
      title: "Listen to Podcasts",
      description: "Health and wellness podcast episodes",
      icon: Headphones,
      action: () => {
        onOpenChange(false);
        navigate('/health/education');
      }
    },
    {
      title: "Search Content",
      description: "Find specific health topics and information",
      icon: Search,
      action: () => {
        onOpenChange(false);
        navigate('/health/education');
      }
    },
    {
      title: "My Bookmarks",
      description: "Access your saved articles and resources",
      icon: Bookmark,
      action: () => {
        onOpenChange(false);
        navigate('/health/education');
      }
    },
    {
      title: "Share Resources",
      description: "Share health content with friends and family",
      icon: Share2,
      action: () => {
        onOpenChange(false);
        navigate('/health/education');
      }
    },
    {
      title: "Download for Offline",
      description: "Save content to read or watch later",
      icon: Download,
      action: () => {
        onOpenChange(false);
        navigate('/health/education');
      }
    },
    {
      title: "Health Courses",
      description: "Enroll in structured wellness education programs",
      icon: GraduationCap,
      action: () => {
        onOpenChange(false);
        navigate('/health/education');
      }
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {t('screens.common.educationActions')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Card 
              key={index} 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-card via-card to-muted/20"
              onClick={action.action}
            >
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <action.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{action.title}</CardTitle>
                <CardDescription className="text-sm">
                  {action.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('screens.common.close')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}