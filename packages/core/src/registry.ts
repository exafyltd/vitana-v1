/** VTID-05183 — the voice/navigation screen registry (src/navigation/registry), transitively class A. */
export {
  SOURCE_LOCALES,
  TRANSLATED_LOCALES,
  REGISTRY_LOCALES,
  SCREENS,
  getScreen,
  isVoiceTarget,
  screenTitle,
  localeTitles,
} from '@/navigation/registry';
export type { RegistryLocale, ScreenText, ScreenOverlay, ScreenDef, LocaleScreenText } from '@/navigation/registry';
