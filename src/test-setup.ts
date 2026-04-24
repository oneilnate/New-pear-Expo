/**
 * Global test setup for vitest-native.
 * MSW server lifecycle is managed per-test file via beforeAll/afterAll.
 */

// Polyfill fetch if not available (Node 22 has it natively)
// MSW v2 uses native fetch; no explicit polyfill needed on Node 22.

// Auto-mock expo-av globally — expo-av imports expo-modules-core which requires
// native globals (ExpoGlobal.EventEmitter) not available in the Node/vitest
// environment. The manual mock at __mocks__/expo-av.ts provides a no-op shim.
// This must be in the global setup (not per-test) because hooks.ts imports
// expo-av at module load time.
//
// Auto-mock expo-router globally for the same reason: hooks.ts imports
// useFocusEffect from expo-router, and expo-router's Stack.tsx (TSX) causes
// a SyntaxError when loaded without the babel JSX transform. Per-test files
// that need customized expo-router behavior call vi.mock('expo-router', () => ...)
// inline, which overrides this global mock.
import { vi } from 'vitest';

vi.mock('expo-av');
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: vi.fn(),
  Redirect: () => null,
  Stack: () => null,
  Link: () => null,
}));
