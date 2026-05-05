import { t } from '@/lib/i18n-toast';
interface AdminHeaderProps {
  title: string;
  description: string;
  emoji?: string;
  syncTimestamp?: string;
  rightAction?: React.ReactNode;
}

export default function AdminHeader({ 
  title, 
  description, 
  emoji,
  syncTimestamp,
  rightAction 
}: AdminHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-card via-card/95 to-card border rounded-2xl shadow-lg p-8">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            {emoji && <span className="text-4xl">{emoji}</span>}
            {title}
          </h1>
          <p className="text-muted-foreground text-lg max-w-3xl">
            {description}
          </p>
          {syncTimestamp && (
            <p className="text-xs text-muted-foreground mt-2">{t('screens.admin.lastSyncedSynctimestamp', { syncTimestamp })}</p>
          )}
        </div>
        {rightAction && (
          <div className="ml-6">
            {rightAction}
          </div>
        )}
      </div>
    </div>
  );
}
