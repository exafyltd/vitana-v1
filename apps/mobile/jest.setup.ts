/**
 * VTID-05176 — jest setup for the Vitana Native UI kit (tests/ui/**).
 * Gesture Handler and Reanimated jest setups as each library documents them
 * for the pinned versions (react-native-gesture-handler 2.32.0,
 * react-native-reanimated 4.5.1 on react-native-worklets 0.10.1).
 */
import 'react-native-gesture-handler/jestSetup';

// Worklets ships its own jest mock; Reanimated 4 runs on top of it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('react-native-reanimated').setUpTests();
