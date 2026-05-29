import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar as CalendarIcon, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
interface AdvancedSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  "chat", "memory", "wallet", "discover", "calendar", "autopilot", "health", "community"
];

export function AdvancedSearchDialog({ open, onOpenChange }: AdvancedSearchDialogProps) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [sortBy, setSortBy] = useState("date-desc");

  const handleSearch = () => {
    console.log("Searching with filters:", { keyword, category, dateFrom, dateTo, sortBy });
    // TODO: Implement actual search functionality
    onOpenChange(false);
  };

  const handleReset = () => {
    setKeyword("");
    setCategory("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSortBy("date-desc");
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Search className="w-6 h-6" />
            {t('screens.memory.advancedSearch')}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <div className="space-y-6">
            {/* Keyword Search */}
            <div className="space-y-2">
              <Label htmlFor="keyword">{t('screens.memory.keyword')}</Label>
              <Input
                id="keyword"
                placeholder={t('screens.memory.searchActivityContent')}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <Label htmlFor="category">{t('screens.memory.category')}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('screens.memory.allCategories')}</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('screens.memory.fromDate')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? formatDate(dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>{t('screens.memory.date')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? formatDate(dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label htmlFor="sort">{t('screens.memory.sortBy')}</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">{t('screens.memory.dateNewestFirst')}</SelectItem>
                  <SelectItem value="date-asc">{t('screens.memory.dateOldestFirst')}</SelectItem>
                  <SelectItem value="category">{t('screens.memory.category')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={handleReset}>
              <X className="w-4 h-4 mr-2" />
              {t('screens.memory.reset')}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('screens.memory.cancel')}
              </Button>
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" />
                {t('screens.memory.search')}
              </Button>
            </div>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}