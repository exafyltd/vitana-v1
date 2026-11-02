/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — `/daily-diary`
 * (MEMORY.DAILY_DIARY), `/daily-diary?tab=health` (MEMORY.DIARY) and
 * `/daily-diary?tab=bugs` (MEMORY.DIARY_BUGS): one route, the `tab` search
 * param picks the mode; DailyDiaryScreen reads it.
 */
import { DailyDiaryScreen } from '../../../src/screens/diary/DailyDiaryScreen';

export default function DailyDiaryRoute() {
  return <DailyDiaryScreen />;
}
