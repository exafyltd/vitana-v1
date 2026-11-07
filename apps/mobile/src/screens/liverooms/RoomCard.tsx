/**
 * VTID-05532 (native-wave2-events-calendar-r3/live-rooms) — one live room in the list: the cover,
 * the LIVE pillar, the title, the host, the when and length line, the count, and the one action the
 * web card shows for the room's state (join or manage, start now, or notify me). Tapping the card
 * opens the room's drawer; the action button does its own thing.
 */
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Badge, Button, Text, useUITheme } from '../../ports/ui';
import { fallbackRoomImage, type RoomView } from './data/rules';

export type RoomCardAction =
  | { kind: 'join'; label: string }
  | { kind: 'notify'; label: string; on: boolean }
  | { kind: 'none' };

export function RoomCard({
  room,
  pillar,
  whenLine,
  countLine,
  action,
  onOpen,
  onJoin,
  onNotify,
}: {
  room: RoomView;
  pillar?: string;
  whenLine?: string;
  countLine: string;
  action: RoomCardAction;
  onOpen: () => void;
  onJoin: () => void;
  onNotify: () => void;
}) {
  const { colors } = useUITheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={room.title}
      onPress={onOpen}
      testID={`room-card-${room.id}`}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Image source={{ uri: room.imageUrl || fallbackRoomImage(room.title) }} style={styles.cover} accessibilityIgnoresInvertColors />
      <View style={styles.body}>
        {pillar ? (
          <View style={styles.pillarRow}>
            <Badge variant="destructive">{pillar}</Badge>
          </View>
        ) : null}
        <Text weight="700" size="lg" numberOfLines={2}>
          {room.title}
        </Text>
        <Text variant="caption" muted numberOfLines={1}>
          {room.host.name}
        </Text>
        {whenLine ? (
          <Text variant="caption" muted>
            {whenLine}
          </Text>
        ) : null}
        <Text variant="caption" muted>
          {countLine}
        </Text>
        {action.kind !== 'none' ? (
          <View style={styles.actionRow}>
            {action.kind === 'join' ? (
              <Button size="sm" onPress={onJoin} testID={`room-join-${room.id}`}>
                {action.label}
              </Button>
            ) : (
              <Button
                size="sm"
                variant={action.on ? 'secondary' : 'outline'}
                onPress={onNotify}
                testID={`room-notify-${room.id}`}
              >
                {action.label}
              </Button>
            )}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  cover: { width: '100%', height: 160 },
  body: { padding: 16, gap: 6 },
  pillarRow: { flexDirection: 'row', marginBottom: 2 },
  actionRow: { marginTop: 10, alignSelf: 'flex-start' },
});
