import { forwardRef } from "react";
import { Calendar, MapPin, Clock } from "lucide-react";
import { t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
interface ShareableEventCardProps {
  event: {
    title: string;
    image_url?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    description?: string;
  };
  format: "story" | "square";
}

export const ShareableEventCard = forwardRef<HTMLDivElement, ShareableEventCardProps>(
  ({ event, format: cardFormat }, ref) => {
    const isStory = cardFormat === "story";
    
    // Dimensions for canvas capture
    const width = 1080;
    const height = isStory ? 1920 : 1080;
    const scale = 0.3; // Preview scale

    const formatEventDate = () => {
      if (!event.start_time) return "Date TBA";
      const date = new Date(event.start_time);
      return formatDate(date, "EEEE, MMMM d, yyyy");
    };

    const formatEventTime = () => {
      if (!event.start_time) return "";
      const start = new Date(event.start_time);
      const timeStr = formatDate(start, "h:mm a");
      if (event.end_time) {
        const end = new Date(event.end_time);
        return `${timeStr} - ${formatDate(end, "h:mm a")}`;
      }
      return timeStr;
    };

    return (
      <div
        ref={ref}
        style={{
          width: width * scale,
          height: height * scale,
          transform: `scale(1)`,
          transformOrigin: "top left",
        }}
        className="relative overflow-hidden rounded-xl shadow-2xl"
      >
        {/* Actual content at full size, scaled down for preview */}
        <div
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          className="relative bg-gradient-to-br from-primary/90 via-primary to-accent"
        >
          {/* Background Image with Overlay */}
          {event.image_url && (
            <>
              <img
                src={event.image_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                crossOrigin="anonymous"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
            </>
          )}

          {/* Content Container */}
          <div className={`relative h-full flex flex-col ${isStory ? "justify-end pb-32" : "justify-end pb-16"} px-12`}>
            {/* VITANA Badge */}
            <div className="absolute top-12 left-12">
              <div className="flex items-center gap-3 bg-white/20 backdrop-blur-md px-6 py-3 rounded-full">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">V</span>
                </div>
                <span className="text-white font-semibold text-2xl tracking-wide">VITANA</span>
              </div>
            </div>

            {/* Event Details */}
            <div className="space-y-8">
              {/* Title */}
              <h1 
                className="text-white font-bold leading-tight"
                style={{ fontSize: isStory ? "72px" : "64px" }}
              >
                {event.title}
              </h1>

              {/* Date & Time */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-white/90">
                  <Calendar className="w-10 h-10" strokeWidth={1.5} />
                  <span className="text-3xl font-medium">{formatEventDate()}</span>
                </div>
                
                {formatEventTime() && (
                  <div className="flex items-center gap-4 text-white/90">
                    <Clock className="w-10 h-10" strokeWidth={1.5} />
                    <span className="text-3xl font-medium">{formatEventTime()}</span>
                  </div>
                )}

                {event.location && (
                  <div className="flex items-center gap-4 text-white/90">
                    <MapPin className="w-10 h-10" strokeWidth={1.5} />
                    <span className="text-3xl font-medium">{event.location}</span>
                  </div>
                )}
              </div>

              {/* CTA hint */}
              <div className="pt-8">
                <div className="inline-flex items-center gap-3 bg-white text-primary px-8 py-4 rounded-full">
                  <span className="text-2xl font-bold">{t('screens.sharing.tapLinkBioJoin')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      </div>
    );
  }
);

ShareableEventCard.displayName = "ShareableEventCard";
