/**
 * Manual mock for expo-av.
 *
 * expo-av depends on expo-modules-core which requires
 * ExpoGlobal.EventEmitter — a native global not available in the
 * Node/vitest test environment. This mock provides a minimal shim
 * that satisfies the Audio.Sound lifecycle used by useAudioPlayer.
 *
 * Vitest picks this up automatically because the file lives in
 * __mocks__/ at the project root for node_modules packages.
 */

import { vi } from 'vitest';

export const Audio = {
  setAudioModeAsync: vi.fn().mockResolvedValue(undefined),
  Sound: {
    createAsync: vi.fn().mockResolvedValue({
      sound: {
        playAsync: vi.fn().mockResolvedValue(undefined),
        pauseAsync: vi.fn().mockResolvedValue(undefined),
        setPositionAsync: vi.fn().mockResolvedValue(undefined),
        unloadAsync: vi.fn().mockResolvedValue(undefined),
        setOnPlaybackStatusUpdate: vi.fn(),
      },
      status: {
        isLoaded: true,
        isPlaying: false,
        positionMillis: 0,
        durationMillis: 183000, // 3:03
        didJustFinish: false,
      },
    }),
  },
};

export const Video = {};

export const AVPlaybackStatus = {};

export const InterruptionModeAndroid = {
  DoNotMix: 1,
  DuckOthers: 2,
};

export const InterruptionModeIOS = {
  DoNotMix: 0,
  DuckOthers: 1,
  MixWithOthers: 2,
};
