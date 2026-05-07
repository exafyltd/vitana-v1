import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getAutoAvatarUrl } from "@/lib/autoAvatar";

interface ClickableAvatarProps {
  userId?: string;
  handle?: string;
  src?: string;
  fallback: string;
  alt?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  onPreview?: (userId: string, e: React.MouseEvent) => void;
  disabled?: boolean;
}

export function ClickableAvatar({
  userId,
  handle,
  src,
  fallback,
  alt,
  className,
  onClick,
  onPreview,
  disabled = false
}: ClickableAvatarProps) {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (onClick) {
      onClick(e);
      return;
    }
    
    // If onPreview is provided, use it instead of navigation
    if (onPreview && userId) {
      onPreview(userId, e);
      return;
    }
    
    if (disabled) return;
    
    const identifier = handle || userId;
    if (identifier) {
      navigate(`/u/${identifier}`);
    }
  };
  
  return (
    <Avatar 
      className={cn(
        !disabled && (userId || handle) && "cursor-pointer hover:scale-[1.02] transition-transform duration-150 ease-out",
        "focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none",
        className
      )}
      onClick={handleClick}
      role={!disabled && (userId || handle) ? "button" : undefined}
      tabIndex={!disabled && (userId || handle) ? 0 : undefined}
      aria-label={alt || `View ${fallback}'s profile`}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled && (userId || handle)) {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
    >
      {/* VTID-02806i: when the user hasn't uploaded their own photo
          yet, render a deterministic playful auto-avatar so no tile
          is ever empty. The fallback (initials) only ever renders
          if the auto-avatar URL itself fails to load. */}
      <AvatarImage
        src={src && src.length > 0 ? src : getAutoAvatarUrl(handle ?? userId ?? fallback)}
        alt={alt}
      />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}
