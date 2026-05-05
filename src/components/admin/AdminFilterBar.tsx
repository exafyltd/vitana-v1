import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { t } from '@/lib/i18n-toast';

interface FilterOption {
  value: string;
  label: string;
}

interface AdminFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: Array<{
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    placeholder: string;
  }>;
  onReset?: () => void;
  rightActions?: React.ReactNode;
}

export default function AdminFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  onReset,
  rightActions,
}: AdminFilterBarProps) {
  const hasActiveFilters = searchValue || filters?.some((f) => f.value && f.value !== "all");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {filters?.map((filter, i) => (
        <Select key={i} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder={filter.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {hasActiveFilters && onReset && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-9 px-2">
          <X className="h-4 w-4 mr-1" />
          {t('screens.admin.reset')}
        </Button>
      )}

      {rightActions && <div className="ml-auto flex items-center gap-2">{rightActions}</div>}
    </div>
  );
}
