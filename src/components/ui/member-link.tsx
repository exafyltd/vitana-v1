import type { MouseEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { profilePath } from "@/lib/profile-path";

interface MemberLinkProps {
  userId?: string | null;
  handle?: string | null;
  /** The member's name (or anything that stands for them). */
  children: ReactNode;
  className?: string;
}

/**
 * VTID-04992 — a member's name that opens their profile. Pair with
 * ClickableAvatar for the picture. Stops the click so it does not also
 * trigger a surrounding card; without an id it renders plain text.
 */
export function MemberLink({ userId, handle, children, className }: MemberLinkProps) {
  const navigate = useNavigate();
  const path = profilePath(userId, handle);
  if (!path) return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      data-testid="member-link"
      className={cn(
        "inline cursor-pointer bg-transparent p-0 text-start font-inherit hover:underline",
        "focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        className,
      )}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        navigate(path);
      }}
    >
      {children}
    </button>
  );
}
