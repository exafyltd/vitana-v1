/**
 * VTID-05429 (Native Wave 2, profile lane) — bottom-sheet twins of the web
 * profile edit drawers the mobile `/me/profile` opens:
 *
 *   IdentitySheet  ← `src/components/profile/drawers/IdentityDrawer.tsx` (+ editor/IdentityForm)
 *   AboutSheet     ← `src/components/profile/drawers/AboutDrawer.tsx` (+ editor/AboutForm)
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
import { BottomSheet, Button, Text, TextInput, notify, notifyError } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import {
  buildAboutUpdate,
  buildAccountUpdate,
  buildIdentityUpdate,
  useProfileUpdate,
  type MyProfile,
  type ProfileUpdate,
} from './data/profile';

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
  useEffect(() => {
    if (!open) return;
    setDisplayName(profile.displayName);
    setHandle(profile.handle ?? '');
    setArchetype(profile.longevityArchetype ?? '');
  }, [open, profile]);
  const { send, saving } = useSend(onClose, 'profileEditor.identity.identityUpdated', 'profileEditor.identity.identityUpdatedDesc');

  const save = () => {
    if (!displayName.trim()) {
      notifyError('profileEditor.identity.displayName', 'toasts.profile.displayNameRequired');
      return;
    }
    send(buildIdentityUpdate(profile.userId, { displayName, handle, longevityArchetype: archetype }, profile));
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t('profileEditor.identity.editIdentity')} testID="identity-sheet">
      <Text variant="caption" muted>
        {t('profileEditor.identity.description')}
      </Text>
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
      <SheetActions onCancel={onClose} onSave={save} saving={saving} testID="identity-sheet" />
    </BottomSheet>
  );
}

export function AboutSheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: MyProfile }): ReactElement {
  const { t } = useI18n();
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  useEffect(() => {
    if (!open) return;
    setBio(profile.bio ?? '');
    setLocation(profile.location ?? '');
  }, [open, profile]);
  const { send, saving } = useSend(onClose, 'profileEditor.profileUpdated', 'profileEditor.profileUpdatedDesc');

  // Links and languages are carried unchanged (their editors are a later FEAT); the
  // web payload always includes them, so the update never wipes them.
  const save = () => send(buildAboutUpdate(profile.userId, { bio, location, links: profile.links, languages: profile.languages }));

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
});
