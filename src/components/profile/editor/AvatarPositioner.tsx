import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

interface AvatarPositionerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  initialOffsetX?: number;
  initialOffsetY?: number;
  onConfirm: (offsetX: number, offsetY: number) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function AvatarPositioner({
  open,
  onOpenChange,
  imageUrl,
  initialOffsetX = 50,
  initialOffsetY = 50,
  onConfirm,
}: AvatarPositionerProps) {
  const { translate } = useTranslation();
  const [offsetX, setOffsetX] = useState(initialOffsetX);
  const [offsetY, setOffsetY] = useState(initialOffsetY);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  // Reset offsets when dialog opens with new initial values
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setOffsetX(initialOffsetX);
        setOffsetY(initialOffsetY);
      }
      onOpenChange(isOpen);
    },
    [initialOffsetX, initialOffsetY, onOpenChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startOffsetX: offsetX,
        startOffsetY: offsetY,
      };
    },
    [offsetX, offsetY]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    // Sensitivity: ~200px of drag covers the full 0-100 range
    const sensitivity = 200;
    // Inverted: dragging the image right reveals the left side (decrease X)
    setOffsetX(clamp(dragRef.current.startOffsetX - (deltaX / sensitivity) * 100, 0, 100));
    setOffsetY(clamp(dragRef.current.startOffsetY - (deltaY / sensitivity) * 100, 0, 100));
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleConfirm = () => {
    onConfirm(Math.round(offsetX), Math.round(offsetY));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {translate("profileEditor.identity.positionPhoto", "Position Your Photo")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* Circular preview area */}
          <div
            className="relative w-64 h-64 rounded-full overflow-hidden ring-2 ring-border/60 cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <img
              src={imageUrl}
              alt="Position preview"
              className="w-full h-full object-cover pointer-events-none"
              style={{
                objectPosition: `${offsetX}% ${offsetY}%`,
              }}
              draggable={false}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {translate("profileEditor.identity.dragToReposition", "Drag to reposition")}
          </p>

          <div className="flex gap-3 w-full pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {translate("profileEditor.cancel", "Cancel")}
            </Button>
            <Button className="flex-1" onClick={handleConfirm}>
              {translate("profileEditor.done", "Done")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
