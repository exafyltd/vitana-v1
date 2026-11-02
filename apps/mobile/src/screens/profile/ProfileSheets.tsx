/**
 * VTID-05429 (Native Wave 2, profile lane) — bottom-sheet twins of the web
 * profile edit drawers the mobile `/me/profile` opens:
 *
 *   IdentitySheet  ← `src/components/profile/drawers/IdentityDrawer.tsx` (+ editor/IdentityForm:
 *                    avatar Upload / Remove through the media port, `avatars` bucket)
 *   AboutSheet     ← `src/components/profile/drawers/AboutDrawer.tsx` (+ editor/AboutForm:
 *                    bio, location, the links editor and the languages editor)
 *   AccountSheet   ← `src/components/profile/drawers/AccountEditDrawer.tsx`
 *
 * Each sheet pre-fills from the loaded profile (the web form's own load; the
 * sheet only opens once the profile has loaded, which is the web's
 * `loadSucceeded` guard), builds the exact `profiles` UPDATE with the pure
 * `build*Update` (data/profile.ts) and sends it through `useProfileUpdate`.
 * Same toasts and keys as the web drawers. Tests assert the built request on
 * the client double; no real write fires. React 19: `ReactElement`.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, BottomSheet, Button, IconButton, PressableRow, Text, TextInput, notify, notifyError, useUITheme } from '../../ports/ui';
import { AVATAR_EXTS, buildAvatarUpload } from '../../ports/profile-media';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { initialsOf } from './ProfileCards';
import { pickCheckedImage } from './media';
import { runStorageUpload } from './data/uploads';
import {
  buildAboutUpdate,
  buildAccountUpdate,
  buildIdentityUpdate,
  useProfileUpdate,
  type MyProfile,
  type ProfileLink,
  type ProfileUpdate,
} from './data/profile';

/** Web AboutForm `languageOptions`: the stored value and its `profileEditor.languageOptions.*` key. */
export const LANGUAGE_OPTIONS: readonly { key: string; value: string }[] = [
  { key: 'english', value: 'English' },
  { key: 'german', value: 'German' },
  { key: 'spanish', value: 'Spanish' },
  { key: 'french', value: 'French' },
  { key: 'italian', value: 'Italian' },
  { key: 'portuguese', value: 'Portuguese' },
  { key: 'russian', value: 'Russian' },
  { key: 'arabic', value: 'Arabic' },
  { key: 'chinese', value: 'Chinese' },
  { key: 'japanese', value: 'Japanese' },
];

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  testID,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  testID: string;
  hint?: string;
}): ReactElement {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={label}
        multiline={multiline}
        style={multiline ? styles.multiline : undefined}
        testID={testID}
      />
      {hint ? (
        <Text variant="caption" muted>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Cancel / Save row (web drawer footer: outline Cancel + primary Save, "Saving…" while pending). */
function SheetActions({ onCancel, onSave, saving, testID }: { onCancel: () => void; onSave: () => void; saving: boolean; testID: string }): ReactElement {
  const { t } = useI18n();
  return (
    <View style={styles.actions}>
      <View style={styles.fill}>
        <Button variant="outline" onPress={onCancel} disabled={saving} testID={`${testID}-cancel`}>
          {t('profileEditor.cancel')}
        </Button>
      </View>
      <View style={styles.fill}>
        <Button onPress={onSave} disabled={saving} testID={`${testID}-save`}>
          {saving ? t('profileEditor.saving') : t('profileEditor.save')}
        </Button>
      </View>
    </View>
  );
}

function useSend(onDone: () => void, successTitle: string, successDesc: string) {
  const update = useProfileUpdate();
  const send = (req: ProfileUpdate) =>
    update.mutate(req, {
      onSuccess: () => {
        notify(successTitle, successDesc);
        onDone();
      },
      onError: () => notifyError('profileEditor.saveFailed', 'profileEditor.saveFailedDesc'),
    });
  return { send, saving: update.isPending };
}

export function IdentitySheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: MyProfile }): ReactElement {
  const { t } = useI18n();
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [archetype, setArchetype] = useState('');
  const [avatar, setAvatar] = useState({ url: '', offsetX: 50, offsetY: 50 });
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  useEffect(() => {
    if (!open) return;
    setDisplayName(profile.displayName);
    setHandle(profile.handle ?? '');
    setArchetype(profile.longevityArchetype ?? '');
    setAvatar({ url: profile.avatarUrl ?? '', offsetX: profile.avatarOffsetX, offsetY: profile.avatarOffsetY });
  }, [open, profile]);

  // Web IdentityForm.handleFileSelected → uploadFile(file, 'avatars', 'avatar').
  const uploadAvatar = async () => {
    const image = await pickCheckedImage(AVATAR_EXTS, 'profileEditor.identity.uploadFailed', true);
    if (!image) return;
    if (!user?.id) return;
    setUploading(true);
    try {
      const url = await runStorageUpload(buildAvatarUpload(user.id, image), image);
      setAvatar({ url, offsetX: 50, offsetY: 50 });
      notify('profileEditor.identity.avatarUploaded', 'profileEditor.identity.avatarUploadedDesc');
    } catch {
      notifyError('profileEditor.identity.uploadFailed', 'profileEditor.identity.uploadFailedDesc');
    } finally {
      setUploading(false);
    }
  };
  const { send, saving } = useSend(onClose, 'profileEditor.identity.identityUpdated', 'profileEditor.identity.identityUpdatedDesc');

  const save = () => {
    if (!displayName.trim()) {
      notifyError('profileEditor.identity.displayName', 'toasts.profile.displayNameRequired');
      return;
    }
    send(
      buildIdentityUpdate(
        profile.userId,
        { displayName, handle, longevityArchetype: archetype, avatarUrl: avatar.url, avatarOffsetX: avatar.offsetX, avatarOffsetY: avatar.offsetY },
        profile,
      ),
    );
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t('profileEditor.identity.editIdentity')} testID="identity-sheet">
      <Text variant="caption" muted>
        {t('profileEditor.identity.description')}
      </Text>
      <View style={styles.field}>
        <Text variant="label">{t('profileEditor.identity.profilePicture')}</Text>
        <View style={styles.avatarRow}>
          <Avatar uri={avatar.url || null} fallback={initialsOf(displayName) || 'U'} size={80} />
          <View style={styles.avatarActions}>
            <Button variant="outline" size="sm" onPress={() => void uploadAvatar()} disabled={uploading} testID="identity-avatar-upload">
              {uploading ? t('profileEditor.identity.uploading') : t('profileEditor.identity.upload')}
            </Button>
            {avatar.url ? (
              <Button variant="outline" size="sm" onPress={() => setAvatar({ url: '', offsetX: 50, offsetY: 50 })} disabled={uploading} testID="identity-avatar-remove">
                {t('profileEditor.identity.remove')}
              </Button>
            ) : null}
          </View>
        </View>
      </View>
      <Field
        label={t('profileEditor.identity.displayName')}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder={t('profileEditor.identity.displayNamePlaceholder')}
        testID="identity-display-name"
      />
      <Field
        label={t('profileEditor.identity.handle')}
        value={handle}
        onChangeText={setHandle}
        placeholder={t('profileEditor.identity.handlePlaceholder')}
        hint={t('profileEditor.identity.handleDescription')}
        testID="identity-handle"
      />
      <Field
        label={t('profileEditor.identity.personalityDescriptor')}
        value={archetype}
        onChangeText={setArchetype}
        placeholder={t('profileEditor.identity.personalityDescriptorPlaceholder')}
        hint={t('profileEditor.identity.personalityDescriptorDescription')}
        testID="identity-archetype"
      />
      <SheetActions onCancel={onClose} onSave={save} saving={saving || uploading} testID="identity-sheet" />
    </BottomSheet>
  );
}

export function AboutSheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: MyProfile }): ReactElement {
  const { t } = useI18n();
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [languagePicker, setLanguagePicker] = useState(false);
  const { colors } = useUITheme();
  useEffect(() => {
    if (!open) return;
    setBio(profile.bio ?? '');
    setLocation(profile.location ?? '');
    setLinks(profile.links.map((l) => ({ label: l.label || '', url: l.url || '' })));
    setLanguages(profile.languages);
    setLanguagePicker(false);
  }, [open, profile]);
  const { send, saving } = useSend(onClose, 'profileEditor.profileUpdated', 'profileEditor.profileUpdatedDesc');

  // Web AboutForm: links as `{ label, url }` (the per-link visibility select is not saved), languages as stored values.
  const save = () => send(buildAboutUpdate(profile.userId, { bio, location, links, languages }));
  const updateLink = (i: number, patch: Partial<ProfileLink>) => setLinks((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const addLanguage = (value: string) => {
    setLanguagePicker(false);
    if (value && !languages.includes(value)) setLanguages([...languages, value]);
  };
  const languageName = (value: string) => {
    const option = LANGUAGE_OPTIONS.find((o) => o.value === value);
    return option ? t(`profileEditor.languageOptions.${option.key}`) : value;
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t('profileEditor.editAbout')} testID="about-sheet">
      <Text variant="caption" muted>
        {t('profileEditor.aboutDescription')}
      </Text>
      <Field label={t('profileEditor.bio')} value={bio} onChangeText={setBio} placeholder={t('profileEditor.bioPlaceholder')} multiline testID="about-bio" />
      <Field
        label={t('profileEditor.location')}
        value={location}
        onChangeText={setLocation}
        placeholder={t('profileEditor.locationPlaceholder')}
        testID="about-location"
      />
      <View style={styles.field} testID="about-links">
        <View style={styles.rowBetween}>
          <Text variant="label">{t('profileEditor.links')}</Text>
          <Button variant="outline" size="sm" onPress={() => setLinks([...links, { label: '', url: '' }])} testID="about-add-link">
            {t('profileEditor.addLink')}
          </Button>
        </View>
        {links.map((link, i) => (
          <View key={i} style={[styles.linkCard, { borderColor: colors.border }]} testID={`about-link-${i}`}>
            <View style={styles.rowBetween}>
              <View style={styles.fill}>
                <TextInput
                  value={link.label}
                  onChangeText={(v) => updateLink(i, { label: v })}
                  placeholder={t('profileEditor.linkLabelPlaceholder')}
                  accessibilityLabel={t('profileEditor.linkLabelPlaceholder')}
                  testID={`about-link-${i}-label`}
                />
              </View>
              <IconButton name="X" accessibilityLabel={t('profileEditor.identity.remove')} onPress={() => setLinks(links.filter((_, j) => j !== i))} testID={`about-link-${i}-remove`} />
            </View>
            <TextInput
              value={link.url}
              onChangeText={(v) => updateLink(i, { url: v })}
              placeholder={t('profileEditor.linkUrlPlaceholder')}
              accessibilityLabel={t('profileEditor.linkUrlPlaceholder')}
              autoCapitalize="none"
              testID={`about-link-${i}-url`}
            />
          </View>
        ))}
      </View>
      <View style={styles.field} testID="about-languages">
        <Text variant="label">{t('profileEditor.languages')}</Text>
        <View style={styles.chips}>
          {languages.map((lang) => (
            <View key={lang} style={[styles.chip, { backgroundColor: colors.secondary }]} testID={`about-language-${lang}`}>
              <Text variant="caption">{languageName(lang)}</Text>
              <IconButton name="X" size={14} accessibilityLabel={t('profileEditor.identity.remove')} onPress={() => setLanguages(languages.filter((l) => l !== lang))} testID={`about-language-${lang}-remove`} />
            </View>
          ))}
        </View>
        <Button variant="outline" onPress={() => setLanguagePicker((v) => !v)} testID="about-add-language">
          {t('profileEditor.addLanguage')}
        </Button>
        {languagePicker ? (
          <View style={[styles.options, { borderColor: colors.border }]} testID="about-language-options">
            {LANGUAGE_OPTIONS.map((o) => (
              <PressableRow key={o.key} onPress={() => addLanguage(o.value)} accessibilityLabel={t(`profileEditor.languageOptions.${o.key}`)} testID={`about-language-option-${o.key}`} style={styles.option}>
                <Text>{t(`profileEditor.languageOptions.${o.key}`)}</Text>
              </PressableRow>
            ))}
          </View>
        ) : null}
      </View>
      <SheetActions onCancel={onClose} onSave={save} saving={saving} testID="about-sheet" />
    </BottomSheet>
  );
}

export function AccountSheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: MyProfile }): ReactElement {
  const { t } = useI18n();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  useEffect(() => {
    if (!open) return;
    const a = profile.account;
    setFirstName(a.firstName ?? '');
    setLastName(a.lastName ?? '');
    setPhone(a.phone ?? '');
    setCountry(a.country ?? '');
    setCity(a.city ?? '');
  }, [open, profile]);
  const { send, saving } = useSend(onClose, 'profileEditor.profileUpdated', 'profileEditor.profileUpdatedDesc');

  const save = () => send(buildAccountUpdate(profile.userId, { firstName, lastName, phone, country, city }));

  return (
    <BottomSheet open={open} onClose={onClose} title={t('screens.profile.editAccountDetails')} testID="account-sheet">
      <Text variant="label">{t('screens.profile.basicPersonalInformation')}</Text>
      <Field label={t('profile.account.fields.firstName')} value={firstName} onChangeText={setFirstName} testID="account-first-name" />
      <Field label={t('profile.account.fields.lastName')} value={lastName} onChangeText={setLastName} testID="account-last-name" />
      <Text variant="label">{t('screens.profile.contactInformation')}</Text>
      <Field label={t('profile.account.fields.phone')} value={phone} onChangeText={setPhone} testID="account-phone" />
      <Field label={t('profile.account.fields.country')} value={country} onChangeText={setCountry} testID="account-country" />
      <Field label={t('profile.account.fields.city')} value={city} onChangeText={setCity} testID="account-city" />
      <SheetActions onCancel={onClose} onSave={save} saving={saving} testID="account-sheet" />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  field: { gap: 6 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, paddingTop: 8 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  linkCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingStart: 10, paddingEnd: 4, paddingVertical: 2 },
  options: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12 },
  option: { paddingHorizontal: 12, paddingVertical: 10 },
});
