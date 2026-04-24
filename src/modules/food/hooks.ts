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
import type { ImageAsset, PodStateResponse, UploadMealResponse } from '@/services/food.service';
import {
  completePod,
  createMeal,
  createPod,
  getPod,
  getPodcast,
  getPodState,
  patchMeal,
  uploadMeal,
  uploadMealImage,
} from '@/services/food.service';
import type { CreateMealResponse, Pod, Podcast } from './types';

// ─── Query keys ────────────────────────────────────────────────────────────────────────────────

export const foodQueryKeys = {
  pod: (podId: string) => ['pod', podId] as const,
  podState: (podId: string) => ['podState', podId] as const,
  podcast: (podId: string) => ['podcast', podId] as const,
} as const;

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
      // Invalidate podState so home grid dot count increments automatically
      void queryClient.invalidateQueries({ queryKey: foodQueryKeys.podState(podId) });
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
