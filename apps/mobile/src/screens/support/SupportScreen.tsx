/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — `/support`, the native
 * twin of the mobile-web member support screen (`src/pages/MobileSupport.tsx`).
 * One file serves the four ledger rows: the `tab` search param (with the web's
 * aliases, `normalizeTab`) selects Contact (default), My tickets, FAQs or
 * Community; a `?ticket=` deep link opens My tickets with that ticket
 * highlighted. The tab pill writes the param back with `router.setParams`.
 *
 * Contact builds the `POST /api/v1/feedback/tickets` body with the native twin
 * of `buildSupportContactBody` — a write, asserted against a mocked gateway in
 * tests and never fired by them. The message is typed (`entry_method: 'text'`):
 * the web's microphone capture and image attachments need a native audio
 * recorder and image picker the app does not ship yet (G1 device pass), so the
 * native form uses the web's typed-contact strings (`supportTickets.support.*`).
 */
import { useEffect, useState, type ReactElement } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Icon,
  PressableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
  Textarea,
  notifyError,
  useUITheme,
} from '../../ports/ui';
import { activateOrbForSupportReport } from '../../ports/support';
import { MobileModePill, type ModeOption } from '../../shell/components/MobileModePill';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { Panel, PanelTitle, ScreenScaffold } from './components';
import { MyTicketsList } from './MyTicketsList';
import { SUPPORT_CATEGORIES, buildSupportContactBody, submitSupportContact, type CreatedTicket, type SupportCategory } from './data/tickets';

export type SupportTab = 'contact' | 'tickets' | 'faqs' | 'community';

/** Web `TAB_ALIASES` (MobileSupport.tsx): canonical keys plus the navigator's synonyms. */
const TAB_ALIASES: Record<string, SupportTab> = {
  contact: 'contact',
  'contact-support': 'contact',
  faqs: 'faqs',
  faq: 'faqs',
  knowledge: 'faqs',
  'knowledge-base': 'faqs',
  help: 'faqs',
  articles: 'faqs',
  community: 'community',
  'community-help': 'community',
  tickets: 'tickets',
  'my-tickets': 'tickets',
  ticket: 'tickets',
};

export function normalizeTab(value: string | null | undefined): SupportTab | null {
  if (!value) return null;
  return TAB_ALIASES[value.trim().toLowerCase().replace(/[\s_]+/g, '-')] ?? null;
}

const FAQ_KEYS = ['CreateAccount', 'ResetPassword', 'UpdateProfile', 'PaymentMethods', 'DataSecure', 'DeleteAccount'] as const;

const SUPPORT_EMAIL = 'mailto:support@exafy.io';

const CATEGORY_LABEL: Record<SupportCategory, string> = {
  account: 'mobilesupport.categoryAccount',
  billing: 'mobilesupport.categoryBilling',
  technical: 'mobilesupport.categoryTechnical',
  feature: 'mobilesupport.categoryFeature',
  privacy: 'mobilesupport.categoryPrivacy',
  other: 'mobilesupport.categoryOther',
};

export function SupportScreen(): ReactElement {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ tab?: string; ticket?: string }>();
  const [activeTab, setActiveTab] = useState<SupportTab>(() => normalizeTab(params.tab) ?? (params.ticket ? 'tickets' : 'contact'));
  const [highlight, setHighlight] = useState<string | null>(params.ticket ?? null);

  // Honour `?tab=` deep links whenever the param changes (web VTID-NAV-SUPPORT-TABS).
  useEffect(() => {
    const next = normalizeTab(params.tab);
    if (next) setActiveTab(next);
  }, [params.tab]);

  useEffect(() => {
    if (params.ticket) setHighlight(params.ticket);
  }, [params.ticket]);

  const changeTab = (next: SupportTab) => {
    setActiveTab(next);
    router.setParams({ tab: next });
  };

  const modes: ModeOption[] = [
    { value: 'contact', label: t('mobilesupport.tabContact'), icon: '💬' },
    { value: 'tickets', label: t('supportTickets.support.tabTickets'), icon: '🎫' },
    { value: 'faqs', label: t('mobilesupport.tabFaqs'), icon: '❓' },
    { value: 'community', label: t('mobilesupport.tabCommunity'), icon: '👥' },
  ];

  const viewTicket = (ticket: NonNullable<CreatedTicket>) => {
    setActiveTab('tickets');
    setHighlight(ticket.id);
    router.setParams({ tab: 'tickets', ticket: ticket.id });
  };

  return (
    <ScreenScaffold
      testID="screen-support"
      title={t('mobilesupport.title')}
      description={t('mobilesupport.description')}
      emoji="🆘"
      toolbar={<MobileModePill modes={modes} activeMode={activeTab} onModeChange={(v) => changeTab(v as SupportTab)} />}
    >
      {activeTab === 'contact' ? <ContactTab onViewTicket={viewTicket} /> : null}
      {activeTab === 'tickets' ? <MyTicketsList highlight={highlight} /> : null}
      {activeTab === 'faqs' ? <FaqsTab /> : null}
      {activeTab === 'community' ? <CommunityTab /> : null}
    </ScreenScaffold>
  );
}

function ContactTab({ onViewTicket }: { onViewTicket: (ticket: NonNullable<CreatedTicket>) => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<SupportCategory | ''>('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [created, setCreated] = useState<CreatedTicket>(null);

  const submit = async () => {
    const text = message.trim();
    if (!text) {
      notifyError('mobilesupport.errorEmpty');
      return;
    }
    setSending(true);
    try {
      const ticket = await submitSupportContact(buildSupportContactBody({ message: text, category, entryMethod: 'text', attachments: [] }));
      setCreated(ticket);
      setMessage('');
      setCategory('');
      setSuccess(true);
    } catch {
      notifyError('mobilesupport.errorSend');
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return (
      <Panel testID="support-sent" style={styles.center}>
        <Icon name="CircleCheck" size={40} color={colors.statusSuccess} />
        <Text size="lg" weight="600">
          {t('mobilesupport.sentTitle')}
        </Text>
        {created ? (
          <>
            <Text weight="600" testID="created-ticket-number">
              {t('supportTickets.submittedNumber', { number: created.ticket_number })}
            </Text>
            <Text size="sm" muted style={styles.centerText}>
              {t('supportTickets.submittedBody')}
            </Text>
            <Button
              testID="support-view-ticket"
              onPress={() => {
                setSuccess(false);
                onViewTicket(created);
              }}
            >
              {t('supportTickets.viewTicket')}
            </Button>
          </>
        ) : (
          <Text size="sm" muted style={styles.centerText}>
            {t('mobilesupport.sentBody')}
          </Text>
        )}
        <Button variant="outline" onPress={() => setSuccess(false)} testID="support-send-another">
          {t('mobilesupport.sendAnother')}
        </Button>
      </Panel>
    );
  }

  return (
    <>
      <Panel testID="support-contact">
        <PanelTitle title={t('supportTickets.support.contactTitle')} subtitle={t('supportTickets.support.contactSubtitle')} />
        <Text size="xs" weight="500" muted>
          {t('supportTickets.support.messageLabel')}
        </Text>
        <Textarea
          testID="support-message"
          value={message}
          onChangeText={setMessage}
          placeholder={t('supportTickets.support.messagePlaceholder')}
          accessibilityLabel={t('supportTickets.support.messageLabel')}
          rows={5}
        />
      </Panel>

      {message.trim() ? (
        <Panel testID="support-submit-card">
          <Text size="xs" weight="500" muted>
            {t('mobilesupport.categoryLabel')}
          </Text>
          <Select value={category} onValueChange={(v) => setCategory(v as SupportCategory)}>
            <SelectTrigger testID="support-category" accessibilityLabel={t('mobilesupport.categoryLabel')}>
              <SelectValue placeholder={t('mobilesupport.categoryPlaceholder')} />
            </SelectTrigger>
            <SelectContent testID="support-category-list">
              {SUPPORT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} testID={`support-category-${c}`}>
                  {t(CATEGORY_LABEL[c])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="lg" onPress={() => void submit()} disabled={sending} testID="support-submit">
            {sending ? t('mobilesupport.submitting') : t('mobilesupport.submitButton')}
          </Button>
          <Text size="xs" muted style={styles.centerText}>
            {t('mobilesupport.responseTime')}
          </Text>
        </Panel>
      ) : null}

      <Panel testID="support-quick-contact">
        <Text size="sm" weight="600" accessibilityRole="header">
          {t('mobilesupport.quickContactTitle')}
        </Text>
        <View style={styles.tiles}>
          <QuickTile
            testID="support-email"
            icon="Mail"
            title={t('mobilesupport.quickContactEmail')}
            subtitle={t('mobilesupport.quickContactEmailSub')}
            onPress={() => void Linking.openURL(SUPPORT_EMAIL)}
          />
          <QuickTile
            testID="support-voice-report"
            icon="MessageCircle"
            title={t('supportTickets.support.voiceButton')}
            subtitle={t('mobilesupport.quickContactChatSub')}
            onPress={() => {
              if (!activateOrbForSupportReport()) notifyError('supportTickets.orbUnavailable');
            }}
          />
          <QuickTile icon="Phone" title={t('mobilesupport.quickContactCall')} subtitle={t('mobilesupport.quickContactCallSub')} disabled />
        </View>
      </Panel>
    </>
  );
}

function QuickTile({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
  testID,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}): ReactElement {
  const { colors } = useUITheme();
  const body = (
    <>
      <Icon name={icon} size={20} color={colors.primary} />
      <Text size="xs" weight="500" style={styles.centerText} numberOfLines={2}>
        {title}
      </Text>
      <Text size="xs" muted style={styles.centerText} numberOfLines={1}>
        {subtitle}
      </Text>
    </>
  );
  const style = [styles.tile, { borderColor: colors.border }, disabled ? styles.disabled : null];
  if (disabled || !onPress) {
    return (
      <View style={style} accessibilityState={{ disabled: true }}>
        {body}
      </View>
    );
  }
  return (
    <PressableRow testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={style}>
      {body}
    </PressableRow>
  );
}

function FaqsTab(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <>
      <Panel testID="support-faqs">
        <PanelTitle
          icon={<Icon name="BookOpen" size={18} color={colors.primary} />}
          title={t('mobilesupport.faqsTitle')}
          subtitle={t('mobilesupport.faqsSubtitle')}
        />
        <Accordion type="single" collapsible>
          {FAQ_KEYS.map((k) => (
            <AccordionItem key={k} value={k}>
              <AccordionTrigger testID={`faq-${k}`}>{t(`mobilesupport.faq${k}Q`)}</AccordionTrigger>
              <AccordionContent testID={`faq-${k}-answer`}>
                <Text size="sm" muted>
                  {t(`mobilesupport.faq${k}A`)}
                </Text>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Panel>
      <PressableRow
        testID="support-help-center"
        onPress={() => navigateToWebPath('/maxina_support')}
        accessibilityRole="button"
        accessibilityLabel={t('mobilesupport.faqsOpenHelpCenter')}
        style={[styles.helpRow, { backgroundColor: colors.muted, borderColor: colors.border }]}
      >
        <Icon name="BookOpen" size={16} color={colors.primary} />
        <Text size="sm" weight="500" style={styles.fill}>
          {t('mobilesupport.faqsOpenHelpCenter')}
        </Text>
      </PressableRow>
    </>
  );
}

function CommunityTab(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const stats: Array<[string, string]> = [
    [t('mobilesupport.communityStatsActive'), '2,847'],
    [t('mobilesupport.communityStatsAnswered'), '1,234'],
    [t('mobilesupport.communityStatsResponse'), t('mobilesupport.communityStatsResponseValue')],
  ];
  return (
    <>
      <Panel testID="support-community">
        <PanelTitle
          icon={<Icon name="Users" size={18} color={colors.primary} />}
          title={t('mobilesupport.communityTitle')}
          subtitle={t('mobilesupport.communitySubtitle')}
        />
        <View style={[styles.inner, { borderColor: colors.border }]}>
          <Text size="sm" weight="500">
            {t('mobilesupport.communityGroupTitle')}
          </Text>
          <Text size="xs" muted>
            {t('mobilesupport.communityGroupBody')}
          </Text>
          <Button size="sm" onPress={() => navigateToWebPath('/comm/groups')} testID="support-community-group">
            {t('mobilesupport.communityGroupCta')}
          </Button>
        </View>
        <View style={[styles.inner, { borderColor: colors.border }]}>
          <Text size="sm" weight="500">
            {t('mobilesupport.communityForumTitle')}
          </Text>
          <Text size="xs" muted>
            {t('mobilesupport.communityForumBody')}
          </Text>
          <Button size="sm" variant="outline" onPress={() => navigateToWebPath('/comm/groups')} testID="support-community-forum">
            {t('mobilesupport.communityForumCta')}
          </Button>
        </View>
      </Panel>
      <Panel testID="support-community-stats">
        {stats.map(([label, value]) => (
          <View key={label} style={styles.statRow}>
            <Text size="sm" muted>
              {label}
            </Text>
            <Text size="sm" weight="600">
              {value}
            </Text>
          </View>
        ))}
      </Panel>
    </>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  fill: { flex: 1 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, minWidth: 0, flexDirection: 'column', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  disabled: { opacity: 0.6 },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  inner: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
