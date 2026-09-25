import React, { useState } from "react";
import { Calendar as CalendarIcon, MapPin, Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { t } from "@/lib/i18n-toast";

import { fmtDate, formatDate } from '@/lib/locale-format';
interface MobileEventFormProps {
  onSubmit: (event: Partial<CalendarEvent>) => void;
  onCancel: () => void;
  /** Pre-fill with a specific date (e.g. from month-view tap) */
  initialDate?: Date;
}

const EVENT_TYPES: { value: CalendarEvent['event_type'] }[] = [
  { value: 'personal' },
  { value: 'professional' },
  { value: 'health' },
  { value: 'workout' },
  { value: 'community' },
  { value: 'nutrition' },
];

/** Generate 24h time options in 15-min intervals */
function timeOptions(): string[] {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
}

const TIME_OPTIONS = timeOptions();

/** Round a Date to the next 15-min slot and return "HH:mm" */
function roundToNext15(d: Date): string {
  const h = d.getHours();
  const m = Math.ceil(d.getMinutes() / 15) * 15;
  const rounded = new Date(d);
  rounded.setHours(h, m, 0, 0);
  if (m >= 60) rounded.setHours(h + 1, 0, 0, 0);
  return formatDate(rounded, 'HH:mm');
}

function addOneHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const newH = (h + 1) % 24;
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function MobileEventForm({ onSubmit, onCancel, initialDate }: MobileEventFormProps) {
  const now = new Date();
  const defaultStart = roundToNext15(now);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date>(initialDate ?? now);
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(addOneHour(defaultStart));
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState<CalendarEvent['event_type']>('personal');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;

    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);

    const startDate = new Date(date);
    startDate.setHours(sH, sM, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(eH, eM, 0, 0);

    onSubmit({
      title: title.trim(),
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      location: location.trim() || undefined,
      event_type: eventType,
    });
  };

  // Quick-select date buttons
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">
          {t('vcal.form.title')}
        </Label>
        <Input
          placeholder={t('vcal.form.titlePlaceholder')}
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
          className="h-11 text-base"
        />
      </div>

      {/* Date — quick buttons + picker */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">
          {t('vcal.form.date')}
        </Label>
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant={isToday ? 'default' : 'outline'}
            className="h-9"
            onClick={() => { setDate(new Date(now)); setShowDatePicker(false); }}
          >
            {t('vcal.form.today')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isTomorrow ? 'default' : 'outline'}
            className="h-9"
            onClick={() => { setDate(new Date(tomorrow)); setShowDatePicker(false); }}
          >
            {t('vcal.form.tomorrow')}
          </Button>
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant={!isToday && !isTomorrow ? 'default' : 'outline'}
                className="h-9 gap-1.5"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                {!isToday && !isTomorrow
                  ? fmtDate(date, { weekday: 'short', day: 'numeric', month: 'short' })
                  : t('vcal.form.pickDate')
                }
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={d => { if (d) { setDate(d); setShowDatePicker(false); } }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Time — start & end */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            <Clock className="w-3 h-3 inline mr-1" />
            {t('vcal.form.start')}
          </Label>
          <select
            value={startTime}
            onChange={e => {
              setStartTime(e.target.value);
              setEndTime(addOneHour(e.target.value));
            }}
            className="w-full h-11 rounded-md border border-input bg-background px-3 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TIME_OPTIONS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            <Clock className="w-3 h-3 inline mr-1" />
            {t('vcal.form.end')}
          </Label>
          <select
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            className="w-full h-11 rounded-md border border-input bg-background px-3 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TIME_OPTIONS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Location (optional) */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">
          <MapPin className="w-3 h-3 inline mr-1" />
          {t('vcal.form.location')} <span className="opacity-50">({t('vcal.form.optional')})</span>
        </Label>
        <Input
          placeholder={t('vcal.form.locationPlaceholder')}
          value={location}
          onChange={e => setLocation(e.target.value)}
          className="h-10"
        />
      </div>

      {/* Event type chips */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">
          {t('vcal.form.category')}
        </Label>
        <div className="flex gap-1.5 flex-wrap">
          {EVENT_TYPES.map(type => (
            <Badge
              key={type.value}
              variant={eventType === type.value ? 'default' : 'outline'}
              className={cn(
                "cursor-pointer text-xs px-2.5 py-1 transition-colors",
                eventType === type.value && "bg-primary text-primary-foreground",
              )}
              onClick={() => setEventType(type.value)}
            >
              {t(`vcal.form.types.${type.value}`)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1 h-11" onClick={onCancel}>
          {t('vcal.form.cancel')}
        </Button>
        <Button
          className="flex-1 h-11"
          onClick={handleSubmit}
          disabled={!title.trim()}
        >
          {t('vcal.form.create')}
        </Button>
      </div>
    </div>
  );
}
