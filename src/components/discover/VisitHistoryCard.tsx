import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { t } from '@/lib/i18n-toast';

interface VisitHistoryCardProps {
  visit: {
    id: string;
    provider_name: string;
    provider_specialty: string;
    provider_image_url?: string;
    start_time: string;
    duration_minutes: number;
    patient_notes?: string;
  };
}

export function VisitHistoryCard({ visit }: VisitHistoryCardProps) {
  const [notesExpanded, setNotesExpanded] = useState(false);

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-white/20">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-4">
            <img
              src={visit.provider_image_url || "/placeholder.svg"}
              alt={visit.provider_name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold">{visit.provider_name}</h3>
              <p className="text-sm text-muted-foreground">{visit.provider_specialty}</p>
            </div>
          </div>
          <Badge variant="secondary">Completed</Badge>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(visit.start_time), 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{visit.duration_minutes} minutes</span>
          </div>
        </div>

        {visit.patient_notes && (
          <div className="mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotesExpanded(!notesExpanded)}
            >
              {notesExpanded ? 'Hide' : 'View'} Notes
            </Button>
            {notesExpanded && (
              <p className="text-sm mt-2 p-3 bg-muted/50 rounded">{visit.patient_notes}</p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline">{t('screens.discover.bookFollowup')}</Button>
          <Button size="sm" variant="outline">{t('screens.discover.viewDetails')}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
