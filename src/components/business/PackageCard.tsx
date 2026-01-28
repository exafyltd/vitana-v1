import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { 
  Package, 
  Repeat, 
  CalendarDays, 
  Clock, 
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BusinessPackage, useBusinessPackages, formatCents } from "@/hooks/useBusinessPackages";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface PackageCardProps {
  pkg: BusinessPackage;
  onEdit?: (pkg: BusinessPackage) => void;
}

const PACKAGE_TYPE_CONFIG = {
  bundle: {
    labelKey: 'packages.types.bundle',
    fallback: 'Bundle',
    icon: Package,
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  subscription: {
    labelKey: 'packages.types.subscription',
    fallback: 'Subscription',
    icon: Repeat,
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  },
  program: {
    labelKey: 'packages.types.program',
    fallback: 'Program',
    icon: CalendarDays,
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
};

const STATUS_CONFIG = {
  draft: { labelKey: 'packages.status.draft', fallback: 'Draft', color: 'bg-muted text-muted-foreground' },
  published: { labelKey: 'packages.status.published', fallback: 'Live', color: 'bg-emerald-500/10 text-emerald-600' },
  archived: { labelKey: 'packages.status.archived', fallback: 'Archived', color: 'bg-destructive/10 text-destructive' },
};

export function PackageCard({ pkg, onEdit }: PackageCardProps) {
  const { updatePackage, deletePackage } = useBusinessPackages();
  const { translate } = useTranslation();
  
  const typeConfig = PACKAGE_TYPE_CONFIG[pkg.package_type];
  const statusConfig = STATUS_CONFIG[pkg.status];
  const TypeIcon = typeConfig.icon;

  const itemCount = pkg.items?.length || 0;
  const totalQuantity = pkg.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  // Calculate savings using cents
  const savings = pkg.original_price_cents && pkg.original_price_cents > pkg.price_cents
    ? Math.round(((pkg.original_price_cents - pkg.price_cents) / pkg.original_price_cents) * 100)
    : 0;

  const handleToggleStatus = () => {
    updatePackage({
      id: pkg.id,
      status: pkg.status === 'published' ? 'draft' : 'published',
    });
  };

  const handleDelete = () => {
    if (confirm(translate('packages.confirmDelete', 'Are you sure you want to delete this package?'))) {
      deletePackage(pkg.id);
    }
  };

  return (
    <Card className="group relative overflow-hidden">
      {/* Status Badge */}
      <div className="absolute top-3 right-3 z-10">
        <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
          {translate(statusConfig.labelKey, statusConfig.fallback)}
        </Badge>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2.5 rounded-lg border",
            typeConfig.color
          )}>
            <TypeIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-16">
            <h3 className="font-semibold text-foreground truncate">{pkg.title}</h3>
            <Badge variant="outline" className={cn("text-xs mt-1", typeConfig.color)}>
              {translate(typeConfig.labelKey, typeConfig.fallback)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {pkg.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {pkg.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            {itemCount} {itemCount === 1 ? translate('packages.item', 'item') : translate('packages.items', 'items')}
          </span>
          {totalQuantity > itemCount && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {totalQuantity} {translate('packages.total', 'total')}
            </span>
          )}
          {pkg.validity_days && pkg.package_type !== 'subscription' && (
            <span className="text-xs">
              {translate('packages.validDays', 'Valid {days} days').replace('{days}', String(pkg.validity_days))}
            </span>
          )}
          {pkg.package_type === 'subscription' && pkg.billing_interval && (
            <span className="text-xs capitalize">
              {pkg.billing_interval}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-foreground">
            {formatCents(pkg.price_cents, pkg.currency)}
          </span>
          {pkg.original_price_cents && pkg.original_price_cents > pkg.price_cents && (
            <>
              <span className="text-sm text-muted-foreground line-through">
                {formatCents(pkg.original_price_cents, pkg.currency)}
              </span>
              <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
                {translate('packages.save', 'Save {percent}%').replace('{percent}', String(savings))}
              </Badge>
            </>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(pkg)}>
              <Edit className="w-4 h-4 mr-2" />
              {translate('buttons.edit', 'Edit')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleStatus}>
              {pkg.status === 'published' ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  {translate('packages.unpublish', 'Unpublish')}
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  {translate('packages.publish', 'Publish')}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              {translate('buttons.delete', 'Delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
