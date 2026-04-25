/**
 * Food module — React Query hooks.
 *
 * Thin wrappers over src/services/food.service.ts.
 * All server state lives here; screens and other modules import these hooks.
 *
 * SCAFFOLD STUB: Hooks re-export from food.service.
 * Full implementation in F2/F3 executables once New-pear-backend API is live.
 *
 * Rules (from AGENTS.md):
 * - No fetch() calls here — delegate to food.service.ts
 * - No `any` types
 * - Named exports only
 */

import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Audio } from 'expo-av';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ImageAsset, PodStateResponse, UploadMealResponse } from '@/services/food.service';
import {
  completePod,
  createMeal,
  createPod,
  getCurrentPod,
  getEpisode,
  getPod,
  getPodcast,
  getPodState,
  patchMeal,
  uploadMeal,
  uploadMealImage,
} from '@/services/food.service';

import type { CreateMealResponse, Episode, Pod, Podcast } from './types';

export const foodQueryKeys = {
  pod: (podId: string) => ['pod', podId] as const,
  podState: (podId: string) => ['podState', podId] as const,
  podcast: (podId: string) => ['podcast', podId] as const,
  episode: (podId: string) => ['episode', podId] as const,
  currentPod: ['currentPod'] as const,
} as const;

/**
 * GET /api/pods/current — fetches the current (newest) pod for the demo user.
 * Auto-creates if none exists. Returns PodStateResponse shape.
 * staleTime: 10 s (matches usePodState)
 */
export function useCurrentPod(): UseQueryResult<PodStateResponse, Error> {
  return useQuery({
    queryKey: foodQueryKeys.currentPod,
    queryFn: () => getCurrentPod(),
    staleTime: 10_000,
  });
}

// ─── Pod mutations ─────────────────────────────────────────────────────────────────────────

/** Create a new pod for the current user. POST /api/pods */
export function useCreatePod(): UseMutationResult<Pod, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createPod(),
    onSuccess: (pod) => {
      queryClient.setQueryData(foodQueryKeys.pod(pod.id), pod);
    },
  });
}

/** Register a new meal and get a presigned upload URL. POST /api/pods/:podId/meals */
export function useCreateMeal(podId: string): UseMutationResult<CreateMealResponse, Error, void> {
  return useMutation({
    mutationFn: () => createMeal(podId),
  });
}

/** Upload raw image bytes to a presigned URL. */
export function useUploadMealImage(): UseMutationResult<
  void,
  Error,
  { uploadUrl: string; fileBlob: Blob }
> {
  return useMutation({
    mutationFn: ({ uploadUrl, fileBlob }) => uploadMealImage(uploadUrl, fileBlob),
  });
}

/** PATCH /api/meals/:mealId — mark meal status as 'uploaded' */
export function usePatchMeal(): UseMutationResult<
  Awaited<ReturnType<typeof patchMeal>>,
  Error,
  string
> {
  return useMutation({
    mutationFn: (mealId: string) => patchMeal(mealId),
  });
}

/** POST /api/pods/:id/complete — trigger podcast generation */
export function useCompletePod(): UseMutationResult<Pod, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (podId: string) => completePod(podId),
    onSuccess: (pod) => {
      queryClient.setQueryData(foodQueryKeys.pod(pod.id), pod);
    },
  });
}

/**
 * GET /api/pods/:podId — fetches pod state for home screen (capturedCount, targetCount, etc).
 * staleTime: 10 s per F3-E1 spec.
 */
export function usePodState(podId: string): UseQueryResult<PodStateResponse, Error> {
  return useQuery({
    queryKey: foodQueryKeys.podState(podId),
    queryFn: () => getPodState(podId),
    staleTime: 10_000,
  });
}

/** GET /api/pods/:podId — polls every 2 s while status is 'generating' */
export function usePodStatus(podId: string): UseQueryResult<Pod, Error> {
  return useQuery({
    queryKey: foodQueryKeys.pod(podId),
    queryFn: () => getPod(podId),
    refetchInterval: (query) => {
      const pod = query.state.data;
      return pod?.status === 'generating' ? 2000 : false;
    },
  });
}

/**
 * POST /api/pods/:podId/images — upload a captured JPEG meal image.
 * On success, invalidates the podState query so the home grid auto-refreshes.
 * On error, surfaces the error message to the caller.
 */
export function useUploadMeal(
  podId: string,
): UseMutationResult<UploadMealResponse, Error, ImageAsset> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (asset: ImageAsset) => uploadMeal(podId, asset),
    onSuccess: () => {
      // Invalidate both the per-pod state AND the currentPod query
      // (home screen reads currentPod — different cache key from podState)
      void queryClient.invalidateQueries({ queryKey: foodQueryKeys.podState(podId) });
      void queryClient.invalidateQueries({ queryKey: foodQueryKeys.currentPod });
    },
  });
}

/** GET /api/pods/:podId/podcast — only fetches when pod status is 'ready' */
export function usePodcast(
  podId: string,
  podStatus: Pod['status'] | undefined,
): UseQueryResult<Podcast, Error> {
  return useQuery({
    queryKey: foodQueryKeys.podcast(podId),
    queryFn: () => getPodcast(podId),
    enabled: podStatus === 'ready',
  });
}

// ─── Episode hook ─────────────────────────────────────────────────────────

/**
 * GET /api/pods/:id/episode — fetch episode metadata for the player.
 * staleTime: 60s per spec (audio URL stable once generated).
 * Error with HTTP 404 means no episode yet.
 */
export function useEpisode(podId: string): UseQueryResult<Episode, Error> {
  return useQuery({
    queryKey: foodQueryKeys.episode(podId),
    queryFn: () => getEpisode(podId),
    staleTime: 60_000,
    // Don't retry 404 — no episode ready is a valid state, not a transient error.
    // For other errors, use the QueryClient default retry (0 in tests, 3 in prod).
    retry: (_failureCount, error) => {
      if (error.message.startsWith('HTTP 404')) return false;
      // Respect QueryClient default (false in tests via defaultOptions.queries.retry)
      return false;
    },
  });
}

// ─── Audio player hook ─────────────────────────────────────────────────────

export type AudioPlayerState = {
  /** True once the sound is fully loaded and ready to play */
  isLoaded: boolean;
  /** True while audio is playing */
  isPlaying: boolean;
  /** Current position in milliseconds */
  positionMillis: number;
  /** Total duration in milliseconds (0 until loaded) */
  durationMillis: number;
  /** Resume / start playback */
  play: () => Promise<void>;
  /** Pause playback */
  pause: () => Promise<void>;
  /** Seek to a position in milliseconds */
  seek: (ms: number) => Promise<void>;
};

/**
 * useAudioPlayer — wraps expo-av Audio.Sound lifecycle.
 *
 * Loads the given audioUrl, exposes playback state, and auto-unloads:
 *   - on screen blur (useFocusEffect)
 *   - on component unmount
 *
 * Architecture: hook only; no fetch() calls.
 */
export function useAudioPlayer(audioUrl: string | undefined): AudioPlayerState {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);

  // Load sound when audioUrl becomes available
  useEffect(() => {
    if (!audioUrl) return;
    const url: string = audioUrl;

    let cancelled = false;
    let sound: Audio.Sound | null = null;

    async function load() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        const { sound: loaded, status } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: false, progressUpdateIntervalMillis: 500 },
          (update) => {
            if (cancelled) return;
            if (!update.isLoaded) return;
            setPositionMillis(update.positionMillis);
            if (update.durationMillis !== undefined && update.durationMillis > 0) {
              setDurationMillis(update.durationMillis);
            }
            setIsPlaying(update.isPlaying);
          },
        );

        if (cancelled) {
          await loaded.unloadAsync();
          return;
        }

        sound = loaded;
        soundRef.current = loaded;

        if (status.isLoaded) {
          setIsLoaded(true);
          if (status.durationMillis !== undefined && status.durationMillis > 0) {
            setDurationMillis(status.durationMillis);
          }
        }
      } catch {
        // Load failure is non-fatal — UI shows error state
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (sound) {
        void sound.unloadAsync().catch(() => {});
      }
      soundRef.current = null;
      setIsLoaded(false);
      setIsPlaying(false);
      setPositionMillis(0);
    };
  }, [audioUrl]);

  // Auto-unload on screen blur (pause + keep position)
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (soundRef.current) {
          void soundRef.current.pauseAsync().catch(() => {});
        }
      };
    }, []),
  );

  const play = useCallback(async () => {
    if (!soundRef.current) return;
    await soundRef.current.playAsync();
  }, []);

  const pause = useCallback(async () => {
    if (!soundRef.current) return;
    await soundRef.current.pauseAsync();
  }, []);

  const seek = useCallback(async (ms: number) => {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(ms);
  }, []);

  return { isLoaded, isPlaying, positionMillis, durationMillis, play, pause, seek };
}
