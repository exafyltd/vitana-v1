import { useResellerEvents } from "@/hooks/useResellerEvents";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, MapPin, Calendar, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ResellerEventsTabProps {
  searchQuery: string;
}

export function ResellerEventsTab({ searchQuery }: ResellerEventsTabProps) {
  const { data: events = [], isLoading } = useResellerEvents();

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {searchQuery ? "No events match your search" : "You haven't created any events yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {filteredEvents.map((event) => (
        <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <div className="flex gap-4">
              {event.image_url && (
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="w-32 h-24 object-cover"
                />
              )}
              <div className="flex-1 py-3 pr-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.start_time), "MMM d, yyyy")}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-1">
                      <Ticket className="h-3 w-3 mr-1" />
                      {event.tickets_sold} sold
                    </Badge>
                    <p className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(event.gross_revenue)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
