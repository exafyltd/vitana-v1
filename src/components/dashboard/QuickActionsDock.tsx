import { Button } from "@/components/ui/button";
import { Droplet, Dumbbell, Smartphone, Moon, Music, MessageCircle } from "lucide-react";

interface QuickActionsDockProps {
  onLogWater: () => void;
  onStartWorkout: () => void;
  onPhoneBreak: () => void;
  onSetBedtime: () => void;
  onPlayMusic: () => void;
  onMessageFriend: () => void;
}

export default function QuickActionsDock({
  onLogWater,
  onStartWorkout,
  onPhoneBreak,
  onSetBedtime,
  onPlayMusic,
  onMessageFriend
}: QuickActionsDockProps) {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-3">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto p-2 hover:bg-blue-100"
            onClick={onLogWater}
          >
            <Droplet className="w-4 h-4 text-blue-600 mb-1" />
            <span className="text-xs text-blue-600">Water</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto p-2 hover:bg-green-100"
            onClick={onStartWorkout}
          >
            <Dumbbell className="w-4 h-4 text-green-600 mb-1" />
            <span className="text-xs text-green-600">Workout</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto p-2 hover:bg-orange-100"
            onClick={onPhoneBreak}
          >
            <Smartphone className="w-4 h-4 text-orange-600 mb-1" />
            <span className="text-xs text-orange-600">Break</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto p-2 hover:bg-purple-100"
            onClick={onSetBedtime}
          >
            <Moon className="w-4 h-4 text-purple-600 mb-1" />
            <span className="text-xs text-purple-600">Bedtime</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto p-2 hover:bg-pink-100"
            onClick={onPlayMusic}
          >
            <Music className="w-4 h-4 text-pink-600 mb-1" />
            <span className="text-xs text-pink-600">Music</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto p-2 hover:bg-cyan-100"
            onClick={onMessageFriend}
          >
            <MessageCircle className="w-4 h-4 text-cyan-600 mb-1" />
            <span className="text-xs text-cyan-600">Message</span>
          </Button>
        </div>
      </div>
    </div>
  );
}