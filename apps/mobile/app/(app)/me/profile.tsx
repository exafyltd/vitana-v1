/**
 * VTID-05429 (Native Wave 2, profile lane) — `/me/profile` (PROFILE.ME), the
 * member's own profile with its edit sheets. The `card` search param selects
 * the ID-card segment (web `?card=`); MyProfileScreen reads it.
 */
import { MyProfileScreen } from '../../../src/screens/profile/MyProfileScreen';

export default function MyProfileRoute() {
  return <MyProfileScreen />;
}
