import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ClickableAvatarProps {
  userId?: string;
  handle?: string;
  src?: string;
  fallback: string;
  alt?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
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
  disabled = false
}: ClickableAvatarProps) {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (onClick) {
      onClick(e);
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
        !disabled && (userId || handle) && "cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all",
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
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}
