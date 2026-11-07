/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the
 * full-screen layer both chat screens draw in. On the phone the web chat is a
 * fixed full-screen layer over the app chrome (Messages.tsx:1281
 * `fixed inset-0 z-[55]`, GroupChat.tsx:839 `h-[100dvh]`), with the composer
 * docked at the bottom and the ORB hidden (Messages.tsx:590-597). The native
 * twin is a full-screen Modal over the shell (top bar, bottom bar, ORB slot)
 * with keyboard avoidance and safe areas. A Modal is its own root view, so the
 * language's direction is set here (RTL for `ar`).
 */
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';

export function ChatFrame({ onBack, children, testID }: { onBack: () => void; children: ReactNode; testID: string }) {
  const { colors } = useUITheme();
  const { rtl } = useI18n();
  const insets = useSafeAreaInsets();
  // On Android the Modal's window is laid out between the system bars already, so the
  // window's safe-area insets would pad the frame a second time: a white band above the
  // header and below the composer. Only iOS needs the padding here.
  const isAndroid = Platform.OS === 'android';
  return (
    <Modal visible animationType="none" presentationStyle="fullScreen" onRequestClose={onBack} statusBarTranslucent>
      <GestureHandlerRootView style={styles.fill}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
          <View
            testID={testID}
            style={[
              styles.fill,
              { backgroundColor: colors.background, paddingTop: isAndroid ? 0 : insets.top, paddingBottom: isAndroid ? 0 : insets.bottom, direction: rtl ? 'rtl' : 'ltr' },
            ]}
          >
            {children}
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
