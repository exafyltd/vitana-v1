/**
 * VTID-05176 — ScrollArea (web scroll-area.tsx): a `ScrollView` with native
 * scroll indicators; a `<ScrollBar orientation="horizontal" />` child switches
 * it to horizontal, as on the web.
 */
import { Children, isValidElement, type ReactNode } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';

export function ScrollBar(_props: { orientation?: 'vertical' | 'horizontal' }) {
  return null;
}

export function ScrollArea({ children, horizontal, ...rest }: ScrollViewProps & { children?: ReactNode }) {
  let isHorizontal = !!horizontal;
  const content = Children.toArray(children).filter((child) => {
    if (isValidElement<{ orientation?: string }>(child) && child.type === ScrollBar) {
      if (child.props.orientation === 'horizontal') isHorizontal = true;
      return false;
    }
    return true;
  });
  return (
    <ScrollView horizontal={isHorizontal} {...rest}>
      {content}
    </ScrollView>
  );
}
