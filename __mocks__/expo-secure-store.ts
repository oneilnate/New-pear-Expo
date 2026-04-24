/**
 * Manual mock for expo-secure-store.
 *
 * expo-secure-store depends on expo-modules-core which requires
 * ExpoGlobal.EventEmitter — a native global not available in the
 * Node/vitest test environment. This mock provides an in-memory
 * key-value store that satisfies all call sites.
 *
 * Vitest picks this up automatically because the file lives in
 * src/__mocks__/ adjacent to the package root, and vi.mock() calls
 * in test files trigger manual mocks for node_modules packages.
 */

const store: Record<string, string> = {};

export function getItem(key: string): string | null {
  return store[key] ?? null;
}

export function setItem(key: string, value: string): void {
  store[key] = value;
}

export async function getItemAsync(key: string): Promise<string | null> {
  return store[key] ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  store[key] = value;
}

export async function deleteItemAsync(key: string): Promise<void> {
  delete store[key];
}

export async function isAvailableAsync(): Promise<boolean> {
  return true;
}

export function canUseBiometricAuthentication(): boolean {
  return false;
}

// Keychain accessibility constants (values only need to exist)
export const AFTER_FIRST_UNLOCK = 'AFTER_FIRST_UNLOCK';
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY';
export const ALWAYS = 'ALWAYS';
export const ALWAYS_THIS_DEVICE_ONLY = 'ALWAYS_THIS_DEVICE_ONLY';
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 'WHEN_PASSCODE_SET_THIS_DEVICE_ONLY';
export const WHEN_UNLOCKED = 'WHEN_UNLOCKED';
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'WHEN_UNLOCKED_THIS_DEVICE_ONLY';
