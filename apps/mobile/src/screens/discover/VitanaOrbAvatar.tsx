/**
 * VTID-05510 — the Vitana avatar the "Recommended for you" header shows: the
 * web asset `public/vitana-orb-clean.svg` (VITANA_BOT_AVATAR_URL,
 * src/lib/vitanaBotIdentity.ts:16) drawn with react-native-svg. The stops are
 * the asset's own (an image, not UI colours), copied verbatim.
 */
import type { ReactElement } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

export function VitanaOrbAvatar({ size = 20, accessibilityLabel }: { size?: number; accessibilityLabel: string }): ReactElement {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={{ width: size, height: size }} testID="vitana-orb-avatar">
      <Svg width={size} height={size} viewBox="0 0 128 128">
        <Defs>
          <RadialGradient id="vitanaOrbBody" cx="38%" cy="32%" r="75%">
            <Stop offset="0%" stopColor="#eef4ff" />
            <Stop offset="18%" stopColor="#c3d6f7" />
            <Stop offset="45%" stopColor="#7f9fdc" />
            <Stop offset="72%" stopColor="#5677b8" />
            <Stop offset="100%" stopColor="#3a5390" />
          </RadialGradient>
          <RadialGradient id="vitanaOrbHighlight" cx="34%" cy="26%" r="30%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={64} cy={64} r={60} fill="url(#vitanaOrbBody)" />
        <Circle cx={64} cy={64} r={60} fill="url(#vitanaOrbHighlight)" />
      </Svg>
    </View>
  );
}
