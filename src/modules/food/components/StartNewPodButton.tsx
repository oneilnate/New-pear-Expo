/**
 * StartNewPodButton — secondary CTA for starting a fresh FoodPod.
 *
 * Always visible on the Home screen (not gated by pod status).
 * Tapping immediately creates a new pod (no confirmation dialog — demo-speed).
 *
 * On tap:
 *   1. useCreatePod().mutateAsync() — POST /api/pods
 *   2. Invalidate foodQueryKeys.currentPod so home screen refetches
 *   3. useFoodPodStore().reset() — clear local FoodPodProvider state
 *   4. router.replace('/food/capture')
 *
 * Architecture contract:
 * - No fetch() calls — delegates to hooks only.
 * - No `any` types.
 * - Named exports only.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useFoodPodStore } from '@/store/food-pod.store';
import { foodQueryKeys, useCreatePod } from '../hooks';

export function StartNewPodButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createPod = useCreatePod();
  const { reset: resetFoodPod } = useFoodPodStore();

  async function handlePress() {
    try {
      await createPod.mutateAsync();
      // Invalidate current pod query so home screen refetches new pod
      await queryClient.invalidateQueries({ queryKey: foodQueryKeys.currentPod });
      // Reset local FoodPodProvider state (phase, currentPodId)
      resetFoodPod();
      // Navigate to capture with the fresh pod
      router.replace('/food/capture');
    } catch {
      // Silently ignore — the home screen will remain in its current state.
    }
  }

  return (
    <Pressable
      style={styles.button}
      onPress={() => void handlePress()}
      accessibilityLabel="Start a new FoodPod"
      accessibilityRole="button"
      testID="start-new-pod-button"
    >
      <Text style={styles.label}>Start a new FoodPod</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  label: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '500',
  },
});
