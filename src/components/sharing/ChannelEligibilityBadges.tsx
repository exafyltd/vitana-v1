import { Mail, MessageSquare, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AudienceData } from "@/types/audience";
import { t } from '@/lib/i18n-toast';

import { fmtNumber } from '@/lib/locale-format';
interface ChannelEligibilityBadgesProps {
  audienceData: AudienceData;
  selectedChannels: string[];
}

export function ChannelEligibilityBadges({ 
  audienceData, 
  selectedChannels 
}: ChannelEligibilityBadgesProps) {
  const eligibility = audienceData.eligibility || { email: 0, sms: 0, whatsapp: 0, total: 0 };

  const channels = [
    {
      id: 'email',
      icon: Mail,
      label: 'Email',
      count: eligibility.email,
      color: 'bg-blue-500/10 text-blue-700 border-blue-500/20'
    },
    {
      id: 'sms',
      icon: Phone,
      label: 'SMS',
      count: eligibility.sms,
      color: 'bg-green-500/10 text-green-700 border-green-500/20'
    },
    {
      id: 'whatsapp',
      icon: MessageSquare,
      label: 'WhatsApp',
      count: eligibility.whatsapp,
      color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
    }
  ];

  const hasWarnings = selectedChannels.some(
    channelId => eligibility[channelId as keyof typeof eligibility] === 0
  );

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium mb-2">{t('screens.sharing.channelEligibility')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {channels.map(channel => {
            const Icon = channel.icon;
            const isSelected = selectedChannels.includes(channel.id);
            const hasZeroEligible = isSelected && channel.count === 0;

            return (
              <div
                key={channel.id}
                className={`flex items-center gap-2 p-3 rounded-lg border ${
                  hasZeroEligible
                    ? 'bg-destructive/5 border-destructive/20'
                    : isSelected
                    ? channel.color
                    : 'bg-muted/50 border-border'
                }`}
              >
                <Icon className="h-4 w-4" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{channel.label}</div>
                  <div className="text-xs text-muted-foreground">{t('screens.sharing.value0Eligible', { value0: fmtNumber(channel.count) })}
                  </div>
                </div>
                {hasZeroEligible && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    ⚠️
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {hasWarnings && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <p className="text-xs font-medium text-destructive">
            {t('screens.sharing.warningSomeSelectedChannelsHave0')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('screens.sharing.messagesWillOnlySentContactsWith')}
          </p>
        </div>
      )}

      {eligibility.total > 0 && (
        <div className="text-sm">
          <span className="font-medium">{t('screens.sharing.totalUniqueRecipients')}</span>{' '}
          <span className="text-muted-foreground">{fmtNumber(eligibility.total)}</span>
        </div>
      )}
    </div>
  );
}
