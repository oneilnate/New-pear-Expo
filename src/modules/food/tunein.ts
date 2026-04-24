/**
 * useTuneIn — hook managing the Tune In modal state for a given pod.
 *
 * Derives isUnlocked from PodStateResponse, and tracks per-pod
 * hasShownTuneIn using expo-secure-store (persists across app restarts).
 *
 * Architecture:
 * - No fetch() calls — client-only state + secure storage.
 * - No `any` types.
 * - Named exports only.
 *
 * F3-E3: UNLOCKED state + Tune In modal.
 */

import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import type { PodStateResponse } from '@/services/food.service';

/** SecureStore key for tracking per-pod tune-in dismissal. */
function tuneInKey(podId: string): string {
  return `tune_in_dismissed_${podId}`;
}

export type UseTuneInResult = {
  /** True when pod.status === 'ready' and episode is non-null */
  isUnlocked: boolean;
  /** True when the user has previously dismissed the Tune In modal for this pod */
  hasShownTuneIn: boolean;
  /** Whether the Tune In modal should be visible right now */
  showModal: boolean;
  /** Open the Tune In modal manually (e.g. "Tune In" re-open button) */
  openModal: () => void;
  /** Dismiss the modal and persist the flag so it doesn't auto-show again */
  dismissModal: () => Promise<void>;
};

/**
 * Manages the Tune In modal lifecycle for a given pod.
 *
 * @param podId  - the pod being tracked
 * @param podState - live pod state from usePodState (may be undefined while loading)
 */
export function useTuneIn(podId: string, podState: PodStateResponse | undefined): UseTuneInResult {
  const isUnlocked = podState?.status === 'ready' && podState.episode != null;

  const [hasShownTuneIn, setHasShownTuneIn] = useState(false);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  // Load persisted flag from SecureStore on mount (and when podId changes)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const stored = SecureStore.getItem(tuneInKey(podId));
        if (!cancelled) {
          setHasShownTuneIn(stored === 'true');
          setStorageLoaded(true);
        }
      } catch {
        // SecureStore unavailable (web/test env) — fall back to not-shown
        if (!cancelled) {
          setHasShownTuneIn(false);
          setStorageLoaded(true);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [podId]);

  const dismissModal = useCallback(async () => {
    setHasShownTuneIn(true);
    setManualOpen(false);
    try {
      SecureStore.setItem(tuneInKey(podId), 'true');
    } catch {
      // SecureStore unavailable (web/test env) — in-memory only
    }
  }, [podId]);

  const openModal = useCallback(() => {
    setManualOpen(true);
  }, []);

  // Auto-show when unlocked, storage is loaded, and not yet dismissed
  const showModal = storageLoaded && isUnlocked && (!hasShownTuneIn || manualOpen);

  return { isUnlocked, hasShownTuneIn, showModal, openModal, dismissModal };
}
