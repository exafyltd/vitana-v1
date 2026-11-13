/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — native twin of the mobile-web Distribution
 * tooling screen (`src/pages/sharing/Distribution.tsx`, non-Spotlight branch): three tabs (campaign
 * templates, automation rules, brand kit) of expandable sample cards, and "Create asset" opening the
 * template, rule and brand-guideline sheets. The web cards' action buttons only log to the console
 * and are not ported; the search field and the calendar shortcut of the web header strip are not
 * ported (the search has no handler).
 */
import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { Chip, Page, Panel, layout } from './components';
import { GuidelineSheet, RuleSheet, TemplateSheet } from './AssetSheets';
import { DIST_CARDS, type DistCard, type DistTab } from './distribution-cards';

const TABS: ReadonlyArray<readonly [DistTab, string]> = [
  ['templates', 'screens.sharing.campaignTemplates'],
  ['automation', 'screens.sharing.automationRules'],
  ['brand', 'screens.sharing.brandKit'],
];

function CardDetail({ card }: { card: DistCard }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={styles.detail} testID={`dist-detail-${card.id}`}>
      <Text weight="700">{t(card.heading)}</Text>
      {card.lines.map(([label, text], i) => (
        <Text key={i} size="sm" muted>
          {card.bulleted ? '• ' : ''}
          {label ? <Text size="sm" weight="700">{`${label === 'X:' ? label : t(label)} `}</Text> : null}
          {t(text)}
        </Text>
      ))}
      {card.foot.length > 0 ? (
        <View style={[styles.foot, { borderTopColor: colors.border }]}>
          {card.foot.map(([label, text]) => (
            <Text key={label} variant="caption" muted>
              <Text variant="caption" weight="700">{`${t(label)} `}</Text>
              {t(text)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Card({ card, open, onToggle }: { card: DistCard; open: boolean; onToggle: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={t(`sharingNative.dist.${card.id}.title`)} onPress={onToggle} testID={`dist-card-${card.id}`} style={styles.cardHead}>
        <Text style={styles.icon}>{card.icon}</Text>
        <View style={layout.fill}>
          <View style={layout.row}>
            <Text weight="700">{t(`sharingNative.dist.${card.id}.title`)}</Text>
            {card.badge ? (
              <Text variant="caption" weight="600" style={{ color: colors.primary }}>
                {t(`sharingNative.dist.badge.${card.badge}`)}
              </Text>
            ) : null}
          </View>
          <Text size="sm" muted>
            {t(`sharingNative.dist.${card.id}.desc`)}
          </Text>
          <Text variant="caption" muted>
            {t(`sharingNative.dist.${card.id}.meta`)}
          </Text>
        </View>
      </Pressable>
      {open ? <CardDetail card={card} /> : null}
    </View>
  );
}

export function DistributionScreen(): ReactElement {
  const { t } = useI18n();
  const [tab, setTab] = useState<DistTab>('templates');
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState<'template' | 'rule' | 'guideline' | null>(null);

  const choose = (kind: 'template' | 'rule' | 'guideline') => {
    setMenu(false);
    setSheet(kind);
  };

  return (
    <>
      <Page
        title={t('screens.sharing.distributionTooling')}
        description={t('sharingNative.distribution.description')}
        testID="distribution-screen"
        actions={
          <Button size="sm" onPress={() => setMenu((m) => !m)} testID="dist-create-asset">
            {t('screens.sharing.createAsset')}
          </Button>
        }
      >
        {menu ? (
          <Panel testID="dist-asset-menu">
            {(
              [
                ['template', 'screens.sharing.campaignTemplate', 'screens.sharing.prebuiltDistributionPattern'],
                ['rule', 'screens.sharing.automationRule', 'screens.sharing.ifthenWorkflowLogic'],
                ['guideline', 'screens.sharing.brandGuideline', 'screens.sharing.channelspecificRules'],
              ] as const
            ).map(([kind, title, sub]) => (
              <Pressable key={kind} accessibilityRole="button" accessibilityLabel={t(title)} onPress={() => choose(kind)} testID={`dist-asset-${kind}`} style={styles.menuItem}>
                <Text weight="600">{t(title)}</Text>
                <Text variant="caption" muted>
                  {t(sub)}
                </Text>
              </Pressable>
            ))}
          </Panel>
        ) : null}
        <View style={layout.row} accessibilityRole="tablist">
          {TABS.map(([id, key]) => (
            <Chip
              key={id}
              role="tab"
              label={t(key)}
              selected={tab === id}
              onPress={() => {
                setTab(id);
                setOpenCard(null);
              }}
              testID={`distribution-tab-${id}`}
            />
          ))}
        </View>
        <View style={layout.stack}>
          {DIST_CARDS.filter((c) => c.tab === tab).map((card) => (
            <Card key={card.id} card={card} open={openCard === card.id} onToggle={() => setOpenCard((cur) => (cur === card.id ? null : card.id))} />
          ))}
        </View>
      </Page>
      <TemplateSheet open={sheet === 'template'} onClose={() => setSheet(null)} />
      <RuleSheet open={sheet === 'rule'} onClose={() => setSheet(null)} />
      <GuidelineSheet open={sheet === 'guideline'} onClose={() => setSheet(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' },
  icon: { fontSize: 22 },
  detail: { paddingHorizontal: 14, paddingBottom: 14, gap: 6 },
  foot: { borderTopWidth: 1, paddingTop: 8, gap: 2 },
  menuItem: { paddingVertical: 10, gap: 2 },
});
