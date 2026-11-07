/**
 * VTID-05521 (Native Wave 2, ai-assistants lane) — the pieces the five
 * `/assistant` panels repeat on the web: the shadcn `Card` with header /
 * content (`CardHeader` + `CardTitle` + `CardDescription`, `CardContent
 * space-y-*`), a labelled field (`space-y-2`), a label + switch row
 * (`flex items-center justify-between`), the muted hint line (`text-xs
 * text-muted-foreground`), the `Alert` box and a button glyph tinted like the
 * button's text. Visual values from the kit theme (tokens); logical start/end
 * only. React 19 `ReactElement`.
 */
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Switch, Text, useUITheme } from '../../ports/ui';
import { AssistantIcon, Label, useButtonForeground, type AssistantGlyph } from '../../ports/assistant';

export function PanelCard({
  title,
  description,
  children,
  gap = 16,
  testID,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  gap?: number;
  testID?: string;
}): ReactElement {
  return (
    <Card testID={testID}>
      <CardHeader>
        <CardTitle size="lg">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent style={{ gap }}>{children}</CardContent>
    </Card>
  );
}

export function Field({ label, children, style }: { label?: string; children: ReactNode; style?: StyleProp<ViewStyle> }): ReactElement {
  return (
    <View style={[styles.field, style]}>
      {label ? <Label>{label}</Label> : null}
      {children}
    </View>
  );
}

export function SwitchField({
  label,
  description,
  checked,
  onChange,
  disabled,
  testID,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
}): ReactElement {
  return (
    <View style={styles.between}>
      <View style={styles.fill}>
        <Label>{label}</Label>
        {description ? (
          <Text size="sm" muted>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch testID={testID} checked={checked} onCheckedChange={onChange} disabled={disabled} accessibilityLabel={label} />
    </View>
  );
}

export function Hint({ children, testID }: { children: ReactNode; testID?: string }): ReactElement {
  return (
    <Text size="xs" muted testID={testID}>
      {children}
    </Text>
  );
}

export function Between({ children }: { children: ReactNode }): ReactElement {
  return <View style={styles.between}>{children}</View>;
}

/** web `Alert` (default / destructive / success) with its leading glyph. */
export function AlertBox({
  icon,
  tone = 'default',
  children,
  testID,
}: {
  icon: AssistantGlyph;
  tone?: 'default' | 'destructive' | 'success';
  children: ReactNode;
  testID?: string;
}): ReactElement {
  const { colors } = useUITheme();
  const tint = tone === 'destructive' ? colors.destructive : tone === 'success' ? colors.statusSuccess : colors.foreground;
  const border = tone === 'default' ? colors.border : tint;
  return (
    <View testID={testID} accessibilityRole="alert" style={[styles.alert, { borderColor: border, backgroundColor: colors.background }]}>
      <AssistantIcon name={icon} size={16} color={tint} />
      <View style={styles.fill}>{children}</View>
    </View>
  );
}

/** A glyph inside a kit `Button`, in the button's foreground colour (web `<Icon className="me-2 h-4 w-4" />`). */
export function ButtonGlyph({ name }: { name: AssistantGlyph }): ReactElement {
  const color = useButtonForeground();
  return (
    <View style={styles.glyph}>
      <AssistantIcon name={name} size={16} color={color ?? undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  fill: { flex: 1, minWidth: 0, gap: 2 },
  alert: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 8, padding: 16 },
  glyph: { marginEnd: 8 },
});
