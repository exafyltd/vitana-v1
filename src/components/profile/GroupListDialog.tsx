import { useTranslation } from "@/hooks/useTranslation";
import { useUserGroups } from "@/hooks/useUserGroups";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Users, Crown, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { fmtNumber } from '@/lib/locale-format';
interface GroupListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function GroupListDialog({
  open,
  onOpenChange,
  userId,
}: GroupListDialogProps) {
  const { translate } = useTranslation();
  const navigate = useNavigate();
  const { data: groups = [], isLoading } = useUserGroups(userId);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case "moderator":
        return <Shield className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl px-0">
        <SheetHeader className="px-4 pb-3 border-b border-border">
          <SheetTitle className="text-center">
            {translate("profileStats.groups", "Groups")}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(70vh-80px)]">
          <div className="px-4 py-2">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center py-8 space-y-2">
                <Users className="h-10 w-10 text-muted-foreground" />
                <p className="text-center text-muted-foreground text-sm">
                  {translate(
                    "profileGroups.emptyTitle",
                    "No groups yet"
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/comm/groups/${group.id}`);
                    }}
                  >
                    <Avatar className="h-10 w-10 rounded-xl">
                      <AvatarImage
                        src={group.avatar_url || undefined}
                        alt={group.name}
                      />
                      <AvatarFallback className="rounded-xl text-xs bg-primary/10 text-primary font-medium">
                        {getInitials(group.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {group.name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {fmtNumber(group.member_count)}{" "}
                        {translate("profileGroups.membersLabel", "members")}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {getRoleIcon(group.role)}
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize h-5 px-1.5"
                      >
                        {group.role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
