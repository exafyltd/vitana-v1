/**
 * VTID-05430 (Native Wave 2, public-profile lane) — native twin of the web
 * `src/components/profile/public/PublicProfileLanding.tsx`: the immersive
 * landing a signed-out visitor (or a shared `?utm_source=profile` link) sees.
 * Same sections in the same order — cover, avatar, name, @handle, VITANA
 * Index pill, location, bio, social links, Follow / Message CTAs, the four-stat
 * strip, up to three public milestones, up to six public photos, View Full
 * Profile + "Powered by VITANA" — and the same catalog keys.
 *
 * The CTAs send the visitor to `/maxina?redirectTo=/u/<handle>` exactly as the
 * web buttons do. Native differences: lucide-react-native ships no brand
 * glyphs, so the social links draw `Globe` (TikTok keeps `Music2`, as on web)
 * with the network name as the accessibility label; the web's gradient
 * backgrounds are drawn as flat token colours. React 19: `ReactElement`.
 */
import type { ReactElement } from 'react';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Button, Card, Icon, Text, useUITheme } from '../../ports/ui';
import { radius } from '../../ports/tokens';
import { useI18n } from '../../i18n/I18nProvider';
import type { GalleryPhoto, Milestone, PublicProfile } from './types';
import { formatMonthYear } from './format';

type Props = { profile: PublicProfile; milestones: Milestone[]; galleryPhotos: GalleryPhoto[] };

const SOCIAL: ReadonlyArray<{ key: keyof PublicProfile; label: string; icon: string }> = [
  { key: 'instagram_url', label: 'Instagram', icon: 'Globe' },
  { key: 'linkedin_url', label: 'LinkedIn', icon: 'Globe' },
  { key: 'youtube_url', label: 'YouTube', icon: 'Globe' },
  { key: 'facebook_url', label: 'Facebook', icon: 'Globe' },
  { key: 'tiktok_url', label: 'TikTok', icon: 'Music2' },
  { key: 'x_url', label: 'X', icon: 'Globe' },
];

function CtaContent({ icon, label, color }: { icon: string; label: string; color?: string }): ReactElement {
  return (
    <View style={styles.ctaContent}>
      <Icon name={icon} size={16} color={color} />
      <Text weight="600" color={color}>
        {label}
      </Text>
    </View>
  );
}

export function PublicProfileLanding({ profile, milestones, galleryPhotos }: Props): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const toSignIn = () => router.navigate(`/maxina?redirectTo=/u/${profile.handle}` as never);

  const socialLinks = SOCIAL.map((s) => ({ ...s, url: profile[s.key] as string | undefined })).filter((l) => !!l.url);
  const topMilestones = milestones.filter((m) => m.is_public).slice(0, 3);
  const topPhotos = galleryPhotos.filter((p) => p.is_public).slice(0, 6);
  const stats = [
    { id: 'posts', label: t('publicProfile.posts'), value: profile.stats?.posts || 0, icon: 'FileText' },
    { id: 'followers', label: t('publicProfile.followers'), value: profile.stats?.followers || 0, icon: 'Users' },
    { id: 'following', label: t('publicProfile.following'), value: profile.stats?.following || 0, icon: 'Heart' },
    { id: 'groups', label: t('publicProfile.groups'), value: profile.stats?.groupsJoined || 0, icon: 'Users' },
  ];

  return (
    <ScrollView testID="public-profile-landing" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={[styles.cover, { backgroundColor: colors.muted }]}>
        {profile.coverUrl ? (
          <Image testID="landing-cover" source={{ uri: profile.coverUrl }} accessibilityLabel={t('screens.profile.cover')} resizeMode="cover" style={StyleSheet.absoluteFill} />
        ) : null}
      </View>
      <View style={styles.hero}>
        <View style={[styles.avatarRing, { borderColor: colors.background }]}>
          <Avatar uri={profile.avatarUrl || null} fallback={profile.name?.charAt(0) || '?'} size={112} />
        </View>
        <Text size="2xl" weight="700" accessibilityRole="header" style={styles.centerText}>
          {profile.name}
        </Text>
        {profile.handle ? (
          <Text variant="caption" muted>
            {`@${profile.handle}`}
          </Text>
        ) : null}

        {profile.vitanaIndex ? (
          <View testID="landing-vitana-index" style={[styles.indexPill, { borderColor: colors.border }]}>
            <Text weight="700">{t('publicProfileNative.landing.vitanaIndex', { score: profile.vitanaIndex })}</Text>
          </View>
        ) : null}

        {profile.location ? (
          <View style={styles.inlineRow}>
            <Icon name="MapPin" size={16} color={colors.mutedForeground} />
            <Text variant="caption" muted>
              {profile.location}
            </Text>
          </View>
        ) : null}

        {profile.bio ? <Text style={[styles.bio, styles.centerText]}>{profile.bio}</Text> : null}

        {socialLinks.length > 0 ? (
          <View style={styles.inlineRow}>
            {socialLinks.map((link) => (
              <Button
                key={link.label}
                testID={`landing-social-${link.label}`}
                variant="ghost"
                size="icon"
                accessibilityRole="link"
                accessibilityLabel={t('publicProfileNative.landing.openSocial', { network: link.label })}
                onPress={() => void Linking.openURL(link.url as string)}
                style={[styles.socialButton, { backgroundColor: colors.muted }]}
              >
                <Icon name={link.icon} size={16} />
              </Button>
            ))}
          </View>
        ) : null}

        <View style={styles.ctaRow}>
          <Button testID="landing-follow" variant="pill" onPress={toSignIn}>
            <CtaContent icon="UserPlus" label={t('publicProfile.follow')} color={colors.primaryForeground} />
          </Button>
          <Button testID="landing-message" variant="outline" onPress={toSignIn} style={styles.pill}>
            <CtaContent icon="MessageSquare" label={t('publicProfile.sendMessage')} />
          </Button>
        </View>
      </View>

      {/* Stats strip */}
      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <Card key={stat.id} testID={`landing-stat-${stat.id}`} style={styles.statCard}>
            <Icon name={stat.icon} size={20} color={colors.primary} />
            <Text size="lg" weight="700">
              {String(stat.value)}
            </Text>
            <Text variant="caption" muted numberOfLines={1}>
              {stat.label}
            </Text>
          </Card>
        ))}
      </View>

      {/* Milestones */}
      {topMilestones.length > 0 ? (
        <View style={styles.section}>
          <Text size="lg" weight="600" accessibilityRole="header">
            {`🏆 ${t('publicProfile.milestones')}`}
          </Text>
          {topMilestones.map((m) => (
            <Card key={m.id} testID={`landing-milestone-${m.id}`} style={styles.milestone}>
              <Text size="2xl">{m.icon || '⭐'}</Text>
              <View style={styles.fill}>
                <Text weight="600">{m.title}</Text>
                {m.description ? (
                  <Text variant="caption" muted numberOfLines={2}>
                    {m.description}
                  </Text>
                ) : null}
                {m.milestone_date ? (
                  <View style={styles.inlineRowStart}>
                    <Icon name="Calendar" size={12} color={colors.mutedForeground} />
                    <Text variant="caption" muted>
                      {formatMonthYear(m.milestone_date, locale)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {/* Photo gallery preview */}
      {topPhotos.length > 0 ? (
        <View style={styles.section}>
          <Text size="lg" weight="600" accessibilityRole="header">
            {`📸 ${t('gallery.title')}`}
          </Text>
          <View style={styles.grid}>
            {topPhotos.map((photo) => (
              <View key={photo.id} style={[styles.gridCell, { backgroundColor: colors.muted }]}>
                <Image
                  testID={`landing-photo-${photo.id}`}
                  source={{ uri: photo.image_url }}
                  accessibilityLabel={photo.caption || t('gallery.photo')}
                  resizeMode="cover"
                  style={StyleSheet.absoluteFill}
                />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* View full profile */}
      <View style={styles.footer}>
        <Button testID="landing-view-full" variant="outline" onPress={toSignIn} style={styles.pill}>
          <CtaContent icon="ExternalLink" label={t('publicProfile.viewFull')} />
        </Button>
        <Text variant="caption" muted style={styles.centerText}>
          {`${t('screens.profile.poweredBy')} `}
          <Text variant="caption" weight="600" color={colors.primary}>
            {t('publicProfileNative.landing.brand')}
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 48 },
  cover: { height: 192, width: '100%', overflow: 'hidden' },
  hero: { alignItems: 'center', paddingHorizontal: 24, marginTop: -64, gap: 8 },
  avatarRing: { borderWidth: 4, borderRadius: 999 },
  centerText: { textAlign: 'center' },
  indexPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6, marginTop: 4 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  inlineRowStart: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  bio: { marginTop: 8, lineHeight: 22 },
  socialButton: { borderRadius: 999 },
  ctaRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  ctaContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { borderRadius: 999 },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginTop: 32 },
  statCard: { flex: 1, alignItems: 'center', padding: 12, gap: 2, borderRadius: radius.lg },
  section: { paddingHorizontal: 24, marginTop: 32, gap: 12 },
  milestone: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: radius.lg },
  fill: { flex: 1, minWidth: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCell: { width: '31%', aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden' },
  footer: { alignItems: 'center', paddingHorizontal: 24, marginTop: 40, gap: 12 },
});
