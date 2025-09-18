import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserPlus, UserMinus, UserX, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemMessageProps {
  message: {
    id: string;
    body: string;
    content_data?: {
      system_type: string;
      group_name?: string;
      created_by?: string;
      added_by?: string;
      added_user?: string;
      added_user_name?: string;
      removed_by?: string;
      removed_user?: string;
      removed_user_name?: string;
      left_user?: string;
      left_user_name?: string;
    };
    created_at: string;
  };
  className?: string;
}

export default function SystemMessage({ message, className }: SystemMessageProps) {
  const systemType = message.content_data?.system_type;
  
  const getSystemIcon = () => {
    switch (systemType) {
      case 'group_created':
        return <Crown className="w-4 h-4 text-amber-500" />;
      case 'member_added':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'member_removed':
        return <UserMinus className="w-4 h-4 text-red-500" />;
      case 'member_left':
        return <UserX className="w-4 h-4 text-orange-500" />;
      default:
        return <Users className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSystemColor = () => {
    switch (systemType) {
      case 'group_created':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'member_added':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'member_removed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'member_left':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-muted-foreground bg-muted/30 border-muted';
    }
  };

  return (
    <div className={cn("flex justify-center my-4", className)}>
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium",
        getSystemColor()
      )}>
        {getSystemIcon()}
        <span>{message.body}</span>
      </div>
    </div>
  );
}