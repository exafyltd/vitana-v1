/** VTID-05176 — Separator (web separator.tsx): 1 px `bg-border`, horizontal or vertical, decorative by default. */
import { View, type ViewProps } from 'react-native';
import { useTheme } from './provider/context';

export type SeparatorProps = ViewProps & { orientation?: 'horizontal' | 'vertical'; decorative?: boolean };

export function Separator({ orientation = 'horizontal', decorative = true, style, ...rest }: SeparatorProps) {
  const { colors } = useTheme();
  return (
    <View
      accessible={!decorative}
      importantForAccessibility={decorative ? 'no' : 'auto'}
      {...rest}
      style={[
        { backgroundColor: colors.border, flexShrink: 0 },
        orientation === 'horizontal' ? { height: 1, width: '100%' } : { width: 1, alignSelf: 'stretch' },
        style,
      ]}
    />
  );
}
