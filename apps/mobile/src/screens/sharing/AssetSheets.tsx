/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — the three "Create asset" sheets of the
 * Distribution screen, native twins of the web `TemplateDialog` (saves a template), `AutomationRuleDialog`
 * (saves a rule) and `BrandGuidelineDialog` (the web only confirms with a toast; nothing is stored).
 */
import { useEffect, useState, type ReactElement } from 'react';
import { BottomSheet, Button, Text, TextInput, Textarea, notify, notifyError } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { Chip, ChipRow, Field, SheetActions, SheetScroll } from './components';
import { useCreateRule, useCreateTemplate } from './data/assets';

type SheetProps = { open: boolean; onClose: () => void };

export function TemplateSheet({ open, onClose }: SheetProps): ReactElement | null {
  const { t } = useI18n();
  const create = useCreateTemplate();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  useEffect(() => {
    if (open) {
      setName('');
      setContent('');
      setCategory('general');
    }
  }, [open]);
  if (!open) return null;
  const submit = async () => {
    if (!name.trim() || !content.trim()) {
      notifyError('toasts.sharing.missingFields', 'toasts.sharing.pleaseFillTitleDescription');
      return;
    }
    try {
      await create.mutateAsync({ name, content, category });
      onClose();
    } catch {
      // The mutation already raised its error toast.
    }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={t('screens.sharing.saveAsTemplate')} testID="template-sheet">
      <SheetScroll>
        <Field label={t('screens.sharing.templateName')}>
          <TextInput value={name} onChangeText={setName} placeholder={t('screens.sharing.eGProductLaunchPost')} accessibilityLabel={t('screens.sharing.templateName')} testID="template-name" />
        </Field>
        <Field label={t('screens.sharing.content')}>
          <Textarea value={content} onChangeText={setContent} rows={4} placeholder={t('screens.sharing.enterYourTemplateContent')} accessibilityLabel={t('screens.sharing.content')} testID="template-content" />
        </Field>
        <Field label={t('screens.sharing.category')}>
          <TextInput value={category} onChangeText={setCategory} placeholder={t('screens.sharing.general')} accessibilityLabel={t('screens.sharing.category')} testID="template-category" />
        </Field>
      </SheetScroll>
      <SheetActions>
        <Button variant="outline" onPress={onClose} testID="template-cancel">
          {t('screens.sharing.cancel')}
        </Button>
        <Button onPress={() => void submit()} disabled={create.isPending} testID="template-submit">
          {t('sharingNative.assets.saveTemplate')}
        </Button>
      </SheetActions>
    </BottomSheet>
  );
}

const TRIGGERS = [
  ['schedule', 'screens.sharing.schedule'],
  ['event', 'screens.sharing.event'],
  ['condition', 'screens.sharing.condition'],
] as const;
const ACTIONS = [
  ['publish', 'screens.sharing.publishPost'],
  ['notify', 'screens.sharing.sendNotification'],
  ['update', 'screens.sharing.updateStatus'],
] as const;

export function RuleSheet({ open, onClose }: SheetProps): ReactElement | null {
  const { t } = useI18n();
  const create = useCreateRule();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<string>('schedule');
  const [action, setAction] = useState<string>('publish');
  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setTrigger('schedule');
      setAction('publish');
    }
  }, [open]);
  if (!open) return null;
  const submit = async () => {
    if (!name.trim()) {
      notifyError('toasts.sharing.missingFields', 'toasts.sharing.pleaseFillTitleDescription');
      return;
    }
    try {
      await create.mutateAsync({ name, description, trigger_type: trigger, action_type: action });
      onClose();
    } catch {
      // The mutation already raised its error toast.
    }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={t('screens.sharing.createAutomationRule')} testID="rule-sheet">
      <SheetScroll>
        <Field label={t('screens.sharing.ruleName')}>
          <TextInput value={name} onChangeText={setName} placeholder={t('screens.sharing.eGAutopublishSchedule')} accessibilityLabel={t('screens.sharing.ruleName')} testID="rule-name" />
        </Field>
        <Field label={t('screens.sharing.description')}>
          <Textarea value={description} onChangeText={setDescription} rows={2} placeholder={t('screens.sharing.describeWhatThisRuleDoes')} accessibilityLabel={t('screens.sharing.description')} testID="rule-description" />
        </Field>
        <Field label={t('screens.sharing.triggerType')}>
          <ChipRow>
            {TRIGGERS.map(([value, key]) => (
              <Chip key={value} role="radio" label={t(key)} selected={trigger === value} onPress={() => setTrigger(value)} testID={`rule-trigger-${value}`} />
            ))}
          </ChipRow>
        </Field>
        <Field label={t('screens.sharing.actionType')}>
          <ChipRow>
            {ACTIONS.map(([value, key]) => (
              <Chip key={value} role="radio" label={t(key)} selected={action === value} onPress={() => setAction(value)} testID={`rule-action-${value}`} />
            ))}
          </ChipRow>
        </Field>
      </SheetScroll>
      <SheetActions>
        <Button variant="outline" onPress={onClose} testID="rule-cancel">
          {t('screens.sharing.cancel')}
        </Button>
        <Button onPress={() => void submit()} disabled={create.isPending} testID="rule-submit">
          {t('sharingNative.assets.createRule')}
        </Button>
      </SheetActions>
    </BottomSheet>
  );
}

const GUIDELINE_CHANNELS = [
  ['instagram', 'screens.sharing.instagram'],
  ['linkedin', 'screens.sharing.linkedin'],
  ['twitter', 'screens.sharing.twitterx'],
  ['facebook', 'screens.sharing.facebook'],
  ['tiktok', 'screens.sharing.tiktok'],
] as const;

export function GuidelineSheet({ open, onClose }: SheetProps): ReactElement | null {
  const { t } = useI18n();
  const [channel, setChannel] = useState('');
  const [imageSpecs, setImageSpecs] = useState('');
  const [bestTimes, setBestTimes] = useState('');
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (open) {
      setChannel('');
      setImageSpecs('');
      setBestTimes('');
      setNotes('');
    }
  }, [open]);
  if (!open) return null;
  return (
    <BottomSheet open={open} onClose={onClose} title={t('screens.sharing.createBrandGuideline')} testID="guideline-sheet">
      <SheetScroll>
        <Text muted>{t('screens.sharing.defineChannelspecificRulesBestPractices')}</Text>
        <Field label={t('screens.sharing.channel')}>
          <ChipRow>
            {GUIDELINE_CHANNELS.map(([value, key]) => (
              <Chip key={value} role="radio" label={t(key)} selected={channel === value} onPress={() => setChannel(value)} testID={`guideline-channel-${value}`} />
            ))}
          </ChipRow>
        </Field>
        <Field label={t('screens.sharing.imageSpecifications')}>
          <TextInput value={imageSpecs} onChangeText={setImageSpecs} placeholder={t('screens.sharing.eG1080x1080pxJpgpng')} accessibilityLabel={t('screens.sharing.imageSpecifications')} testID="guideline-specs" />
        </Field>
        <Field label={t('screens.sharing.bestPostingTimes')}>
          <TextInput value={bestTimes} onChangeText={setBestTimes} placeholder={t('screens.sharing.eGTuethu911amEst')} accessibilityLabel={t('screens.sharing.bestPostingTimes')} testID="guideline-times" />
        </Field>
        <Field label={t('screens.sharing.guidelinesNotes')}>
          <Textarea value={notes} onChangeText={setNotes} rows={4} placeholder={t('screens.sharing.addHashtagRulesToneVoiceCharacter')} accessibilityLabel={t('screens.sharing.guidelinesNotes')} testID="guideline-notes" />
        </Field>
      </SheetScroll>
      <SheetActions>
        <Button variant="outline" onPress={onClose} testID="guideline-cancel">
          {t('screens.sharing.cancel')}
        </Button>
        <Button
          onPress={() => {
            notify('toasts.sharing.brandGuidelineCreated');
            onClose();
          }}
          testID="guideline-submit"
        >
          {t('screens.sharing.saveGuideline')}
        </Button>
      </SheetActions>
    </BottomSheet>
  );
}
