/**
 * VTID-05176 — Avatar (web avatar.tsx): `Image` with onLoad/onError →
 * `AvatarFallback` (after `delayMs`). The web's DiceBear / resize URL rewriting
 * (avatar.tsx:90-100) is web `lib` logic that arrives through `@vitana/core`
 * (N1); the native kit renders the URL it is given.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Image, StyleSheet, View, type ImageProps, type ViewProps } from 'react-native';
import { useTheme } from './provider/context';
import { Text } from './foundation/Text';

export type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

type Ctx = { status: ImageLoadingStatus; setStatus: (s: ImageLoadingStatus) => void };
const AvatarContext = createContext<Ctx | null>(null);

function useAvatar(): Ctx {
  const ctx = useContext(AvatarContext);
  if (!ctx) throw new Error('Avatar parts must be used inside <Avatar>');
  return ctx;
}

export function Avatar({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  const [status, setStatus] = useState<ImageLoadingStatus>('idle');
  const ctx = useMemo(() => ({ status, setStatus }), [status]);
  return (
    <AvatarContext.Provider value={ctx}>
      <View {...rest} style={[styles.root, { borderRadius: theme.radius.full }, style]} />
    </AvatarContext.Provider>
  );
}

export type AvatarImageProps = Omit<ImageProps, 'source'> & {
  src?: string | null;
  alt?: string;
  onLoadingStatusChange?: (status: ImageLoadingStatus) => void;
};

export function AvatarImage({ src, alt, onLoadingStatusChange, style, ...rest }: AvatarImageProps) {
  const { status, setStatus } = useAvatar();
  useEffect(() => {
    const next: ImageLoadingStatus = src ? 'loading' : 'error';
    setStatus(next);
    onLoadingStatusChange?.(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  if (!src) return null;
  const done = (s: ImageLoadingStatus) => {
    setStatus(s);
    onLoadingStatusChange?.(s);
  };
  return (
    <Image
      accessibilityLabel={alt}
      accessibilityIgnoresInvertColors
      {...rest}
      source={{ uri: src }}
      onLoad={(e) => {
        done('loaded');
        rest.onLoad?.(e);
      }}
      onError={(e) => {
        done('error');
        rest.onError?.(e);
      }}
      style={[StyleSheet.absoluteFill, status !== 'loaded' && styles.invisible, style]}
    />
  );
}

export function AvatarFallback({ delayMs, style, children, ...rest }: ViewProps & { delayMs?: number; children?: ReactNode }) {
  const { status } = useAvatar();
  const theme = useTheme();
  const [ready, setReady] = useState(delayMs === undefined);
  useEffect(() => {
    if (delayMs === undefined) return undefined;
    const timer = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);
  if (status === 'loaded' || !ready) return null;
  return (
    <View {...rest} style={[styles.fallback, { backgroundColor: theme.colors.muted, borderRadius: theme.radius.full }, style]}>
      {typeof children === 'string' ? (
        <Text size="sm" weight="500">
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: 40, height: 40, overflow: 'hidden', flexShrink: 0 },
  invisible: { opacity: 0 },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
