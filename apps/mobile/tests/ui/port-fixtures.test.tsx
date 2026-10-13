/**
 * VTID-05176 — port fixtures: real web call sites rewritten with the prop map
 * (README "Vitana Native UI") must typecheck and render. These prove "same props".
 */
import { useState } from 'react';
import { View } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { useI18n } from '../../src/i18n/I18nProvider';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  notify,
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Text,
} from '../../src/ui';
import { getToasts } from '../../src/ui/toast/store';
import { renderUI, resetKit } from './helpers';

beforeEach(resetKit);

const AGE_BOUNDS = { min: 18, max: 99 };

/** src/components/intents/FindMatchFilterSheet.tsx:142-155 (age range), className → style. */
function AgeRange() {
  const { t } = useI18n();
  const [draft, setDraft] = useState({ ageMin: 25, ageMax: 40 });
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Label>{t('screens.community.filterAge')}</Label>
        <Text size="sm" muted testID="age-value">
          {t('screens.community.filterAgeValue', { min: draft.ageMin, max: draft.ageMax })}
        </Text>
      </View>
      <Slider
        style={{ marginTop: 12 }}
        min={AGE_BOUNDS.min}
        max={AGE_BOUNDS.max}
        step={1}
        value={[draft.ageMin, draft.ageMax]}
        onValueChange={([min, max]) => setDraft((d) => ({ ...d, ageMin: min, ageMax: max }))}
      />
    </View>
  );
}

it('FindMatchFilterSheet age range: both values of [min, max] are draggable natively', () => {
  renderUI(<AgeRange />);
  expect(screen.getByTestId('slider-thumb-0')).toBeTruthy();
  expect(screen.getByTestId('slider-thumb-1')).toBeTruthy();
  fireEvent(screen.getByTestId('slider-track'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 324, height: 8 } } });
  act(() =>
    fireGestureHandler(getByGestureTestId('slider-thumb-1-pan'), [
      { state: State.BEGAN, translationX: 0 },
      { state: State.ACTIVE, translationX: 20 },
      { state: State.ACTIVE, translationX: 40 },
      { state: State.END, translationX: 40 },
    ]),
  );
  expect(screen.getByTestId('slider-thumb-1').props.accessibilityValue.now).toBe(50);
  expect(screen.getByTestId('slider-thumb-0').props.accessibilityValue.now).toBe(25);
});

it('ResponsiveDialog with header / body / footer (web structure, onOpenChange)', () => {
  function Fixture() {
    const [open, setOpen] = useState(true);
    return (
      <ResponsiveDialog open={open} onOpenChange={setOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody>
            <Text>Body</Text>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button onPress={() => setOpen(false)} testID="done">
              Done
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
  }
  renderUI(<Fixture />);
  expect(screen.getByText('Body')).toBeTruthy();
  fireEvent.press(screen.getByTestId('done'));
  expect(screen.queryByText('Body')).toBeNull();
});

it('Select with a placeholder (MediaUploadPopup.tsx:189)', () => {
  function Fixture() {
    const { t } = useI18n();
    const [mediaType, setMediaType] = useState('');
    return (
      <Select value={mediaType} onValueChange={setMediaType}>
        <SelectTrigger testID="trigger">
          <SelectValue placeholder={t('screens.common.selectMediaType')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="video">Video</SelectItem>
          <SelectItem value="audio">Audio</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  renderUI(<Fixture />);
  fireEvent.press(screen.getByTestId('trigger'));
  fireEvent.press(screen.getByText('Audio'));
  expect(screen.getByText('Audio')).toBeTruthy();
});

it('DialogTrigger asChild around a Button', () => {
  renderUI(
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inside</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>,
  );
  fireEvent.press(screen.getByText('Open'));
  expect(screen.getByText('Inside')).toBeTruthy();
});

it('a notify() call with the web signature (PodcastCard.tsx:96)', () => {
  renderUI(<Text>app</Text>);
  act(() => notify('toasts.crossover.linkCopied', 'toasts.crossover.podcastLinkCopiedClipboard'));
  expect(getToasts()[0]).toMatchObject({ titleKey: 'toasts.crossover.linkCopied', descKey: 'toasts.crossover.podcastLinkCopiedClipboard' });
});
