import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { 
  Calendar, 
  Wallet, 
  Plane, 
  FileText, 
  CalendarPlus, 
  Users, 
  Coffee, 
  Video, 
  Upload, 
  Microscope,
  Search
} from "lucide-react";
import { CalendarPopup } from "./CalendarPopup";
import { WalletPopup } from "./WalletPopup";
import { PopupCoordinationWrapper } from "./payment/PopupCoordinationWrapper";
import { AutopilotPopup } from "./AutopilotPopup";
import { CreateContentPopup } from "./CreateContentPopup";
import { CreateEventPopup } from "./CreateEventPopup";
import { CreateGroupPopup } from "./CreateGroupPopup";
import { CreateMeetupPopup } from "./CreateMeetupPopup";
import { GoLivePopup } from "./GoLivePopup";
import { MediaUploadPopup } from "./MediaUploadPopup";
import LabTestOrderPopup from "./LabTestOrderPopup";
import { usePopupCoordination } from "@/hooks/usePopupCoordination";
import { t } from '@/lib/i18n-toast';

interface MasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const actionItems = [
  {
    id: "calendar",
    title: "Calendar",
    description: "View and manage your schedule",
    icon: Calendar,
    color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
  },
  {
    id: "wallet",
    title: "Wallet",
    description: "Check balance and transactions",
    icon: Wallet,
    color: "bg-green-500/10 text-green-600 hover:bg-green-500/20"
  },
  {
    id: "autopilot",
    title: "Autopilot",
    description: "AI-powered actions and recommendations",
    icon: Plane,
    color: "bg-red-500/10 text-red-600 hover:bg-red-500/20"
  },
  {
    id: "create-content",
    title: "Create Content",
    description: "Write posts and articles",
    icon: FileText,
    color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20"
  },
  {
    id: "create-event",
    title: "Create Event",
    description: "Organize community events",
    icon: CalendarPlus,
    color: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
  },
  {
    id: "create-group",
    title: "Create Group",
    description: "Start a new community group",
    icon: Users,
    color: "bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20"
  },
  {
    id: "create-meetup",
    title: "Create Meetup",
    description: "Plan casual meetups",
    icon: Coffee,
    color: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
  },
  {
    id: "go-live",
    title: "Go Live",
    description: "Start streaming to your community",
    icon: Video,
    color: "bg-pink-500/10 text-pink-600 hover:bg-pink-500/20"
  },
  {
    id: "media-upload",
    title: "Media Upload",
    description: "Upload videos, podcasts, music",
    icon: Upload,
    color: "bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20"
  },
  {
    id: "lab-test",
    title: "Lab Test",
    description: "Order laboratory tests",
    icon: Microscope,
    color: "bg-teal-500/10 text-teal-600 hover:bg-teal-500/20"
  }
];

export function MasterActionPopup({ open, onOpenChange }: MasterActionPopupProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const { requestPopup, clearPopup, canShowPopup } = usePopupCoordination();

  const filteredActions = actionItems.filter(action =>
    action.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleActionClick = async (actionId: string) => {
    // For wallet actions, check popup coordination
    if (actionId === 'wallet') {
      const success = await requestPopup('wallet-generic');
      if (!success) {
        // Show a brief message that a wallet action is already in progress
        console.log('Wallet popup blocked by higher priority popup');
        return;
      }
    }
    
    setActivePopup(actionId);
    onOpenChange(false); // Close master popup
  };

  const handlePopupClose = () => {
    if (activePopup === 'wallet') {
      clearPopup('wallet-generic');
    }
    setActivePopup(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold mb-4">{t('screens.common.masterActions')}</DialogTitle>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t('screens.common.searchActions')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </DialogHeader>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-4">
            {filteredActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  className={`h-auto flex-col space-y-3 p-6 ${action.color} border-muted hover:border-primary/20 transition-all duration-200`}
                  onClick={() => handleActionClick(action.id)}
                >
                  <Icon className="w-8 h-8" />
                  <div className="text-center">
                    <div className="font-semibold text-sm">{action.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{action.description}</div>
                  </div>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Popups */}
      <CalendarPopup open={activePopup === "calendar"} onOpenChange={handlePopupClose} />
      <PopupCoordinationWrapper
        popupType="wallet-generic"
        isOpen={activePopup === "wallet"}
        onClose={handlePopupClose}
      >
        <WalletPopup open={activePopup === "wallet"} onOpenChange={handlePopupClose} />
      </PopupCoordinationWrapper>
      <AutopilotPopup open={activePopup === "autopilot"} onOpenChange={handlePopupClose} />
      <CreateContentPopup isOpen={activePopup === "create-content"} onClose={handlePopupClose} />
      <CreateEventPopup isOpen={activePopup === "create-event"} onClose={handlePopupClose} />
      <CreateGroupPopup isOpen={activePopup === "create-group"} onClose={handlePopupClose} />
      <CreateMeetupPopup isOpen={activePopup === "create-meetup"} onClose={handlePopupClose} />
      <GoLivePopup open={activePopup === "go-live"} onOpenChange={handlePopupClose} />
      <MediaUploadPopup open={activePopup === "media-upload"} onOpenChange={handlePopupClose} />
      <LabTestOrderPopup isOpen={activePopup === "lab-test"} onClose={handlePopupClose} labTest={null} />
    </>
  );
}