/**
 * Food Pod home screen — /food
 *
 * Pixel-matches IMG_5116 (29/30) and IMG_5117 (30/30 UNLOCKED).
 * Shows TuneInModal (IMG_5118) when pod.status === 'ready' && episode != null.
 * Fetches pod state from backend via usePodState (React Query).
 *
 * Architecture contract:
 * - JSX + local state only — no business logic, no fetch() calls.
 * - All server state via usePodState from @/modules/food.
 * - All navigation via expo-router useRouter.
 * - TuneIn state via useTuneIn hook.
 *
 * F3-E1 — Mobile home screen (30-dot grid + counter + Food Snap card)
 * F3-E3 — UNLOCKED state + Tune In modal
 */

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  FoodSnapCard,
  foodQueryKeys,
  PodGrid,
  StartNewPodButton,
  TuneInModal,
  useCompletePod,
  useCurrentPod,
  useTuneIn,
} from '@/modules/food';

export default function FoodHomeScreen() {
  const router = useRouter();
  // F7 (exe_VKuAAzpN): podId driven by GET /api/pods/current via useCurrentPod()
  const { data: podState, isLoading, isError, error, refetch } = useCurrentPod();
  const podId = podState?.id;
  const { showModal, openModal, dismissModal } = useTuneIn(podId ?? '', podState);

  // ── Auto-trigger /complete when capturedCount === targetCount && status === 'collecting' ──
  const queryClient = useQueryClient();
  const completePod = useCompletePod();
  const completeFiredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!podId) return;
    if (podState?.status !== 'collecting') return;
    if ((podState?.capturedCount ?? 0) < (podState?.targetCount ?? 1)) return;
    // Guard: fire ONCE per podId (ref tracks which pod we already fired for)
    if (completeFiredRef.current === podId) return;
    completeFiredRef.current = podId;
    completePod.mutate(podId, {
      onError: (err) => {
        // Network timeout or transient error — backend may still be generating.
        // Do NOT show the failed banner: trust podState.status === 'failed' from polling.
        console.error('[FoodHomeScreen] /complete failed (may be timeout):', err);
        // Invalidate so polling refetches real status immediately.
        void queryClient.invalidateQueries({ queryKey: foodQueryKeys.currentPod });
        // Reset ref so retry is possible when status flips back to 'collecting'.
        completeFiredRef.current = null;
      },
    });
  }, [
    podId,
    podState?.status,
    podState?.capturedCount,
    podState?.targetCount,
    completePod.mutate,
    queryClient,
  ]);

  function handleSnapPress() {
    router.push('/food/capture');
  }

  function handleTuneIn() {
    void dismissModal();
    router.push('/food/player');
  }

  function handleNotNow() {
    void dismissModal();
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#22C55E" accessibilityLabel="Loading Food Pod" />
      </SafeAreaView>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError || !podState) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Text style={styles.errorText}>
          {error?.message ?? 'Failed to load Food Pod. Please try again.'}
        </Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => void refetch()}
          accessibilityLabel="Retry loading Food Pod"
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  const { capturedCount, targetCount, status } = podState;
  // Grid UNLOCKED: capturedCount >= targetCount (visual state on home screen)
  const isGridUnlocked = capturedCount >= targetCount;
  // Suppress the Unlocked banner + Tune-In CTA when the pod failed — only the
  // inline "Generation failed — Retry" Pressable should be visible below the divider.
  const showUnlockedBanner = isGridUnlocked && status !== 'failed';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Tune In modal — auto-shown on first unlock, re-openable via button */}
      {/* Guard: do not auto-open modal when pod failed (useTuneIn also requires
          status==='ready', but explicit here for clarity). */}
      <TuneInModal
        visible={showModal && status !== 'failed'}
        onTuneIn={handleTuneIn}
        onNotNow={handleNotNow}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={Platform.OS === 'ios'}
      >
        {/* Card */}
        <View style={styles.card}>
          {/* Card header */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../../assets/images/food-snap-wordmark.png')}
                style={styles.foodSnapWordmark}
                resizeMode="contain"
                accessibilityLabel="Food Snap"
                accessibilityRole="image"
              />
            </View>
            <Text style={styles.counterText}>
              {isGridUnlocked ? `${targetCount}/${targetCount}` : `${capturedCount}/${targetCount}`}
            </Text>
          </View>

          {/* Description */}
          {!isGridUnlocked && (
            <Text style={styles.description}>
              Snap {targetCount} meals to unlock your personalized{' '}
              <Text style={styles.descriptionBold}>FoodPod</Text> with nutrition insights and meal
              ideas.
            </Text>
          )}

          {/* Dot grid */}
          <View style={styles.gridWrapper}>
            <PodGrid capturedCount={capturedCount} targetCount={targetCount} />
          </View>

          <View style={styles.divider} />

          {/* Generating indicator — shown while backend pipeline is running */}
          {isGridUnlocked && status === 'generating' && (
            <View style={styles.generatingRow} accessibilityLabel="Generating your FoodPod">
              <ActivityIndicator size="small" color="#22C55E" />
              <Text style={styles.generatingText}>Generating your FoodPod…</Text>
            </View>
          )}

          {/* Generation failed — shown ONLY when backend sets status to 'failed' */}
          {status === 'failed' && (
            <Pressable
              onPress={() => {
                if (!podId) return;
                completeFiredRef.current = null;
                completePod.mutate(podId, {
                  onError: (err) => {
                    console.error('[FoodHomeScreen] /complete retry failed (may be timeout):', err);
                    void queryClient.invalidateQueries({ queryKey: foodQueryKeys.currentPod });
                  },
                });
              }}
              accessibilityLabel="Retry generating your FoodPod"
              accessibilityRole="button"
            >
              <Text style={styles.generationFailedText}>Generation failed — Retry</Text>
            </Pressable>
          )}

          {/* Unlocked banner (30/30 state) — hidden when pod.status === 'failed' */}
          {showUnlockedBanner ? (
            <View
              style={styles.unlockedBanner}
              accessibilityLabel="Food Pod unlocked"
              accessibilityRole="none"
            >
              <View style={styles.unlockedBadge}>
                <Text style={styles.unlockedBadgeText}>UNLOCKED</Text>
              </View>
              <View style={styles.unlockedTextRow}>
                <View style={styles.unlockedTextBlock}>
                  <Text style={styles.unlockedTitle}>Your FoodPod is Ready!</Text>
                  <Text style={styles.unlockedSubtitle}>
                    View your personalized nutrition insights
                  </Text>
                </View>
                {/* Re-open Tune In modal */}
                <Pressable
                  style={styles.unlockedArrowBtn}
                  onPress={openModal}
                  accessibilityLabel="Tune In to your FoodPod"
                  accessibilityRole="button"
                >
                  <Text style={styles.unlockedArrow}>›</Text>
                </Pressable>
              </View>

              {/* Explicit Tune In CTA below the row */}
              <Pressable
                style={styles.tuneInCta}
                onPress={openModal}
                accessibilityLabel="Open Tune In for your FoodPod"
                accessibilityRole="button"
              >
                <Text style={styles.tuneInCtaText}>Tune In</Text>
              </Pressable>
            </View>
          ) : !isGridUnlocked ? (
            <Text style={styles.recentSnapsLabel}>RECENT SNAPS</Text>
          ) : null}
        </View>

        {/* Food Snap CTA */}
        {!isGridUnlocked && (
          <View style={styles.snapCardWrapper}>
            <FoodSnapCard onPress={handleSnapPress} />
          </View>
        )}

        {/* Start a new FoodPod — always visible, secondary style */}
        <View style={styles.startNewWrapper}>
          <StartNewPodButton />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  foodSnapWordmark: {
    width: 169,
    height: 42,
  },
  counterText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  descriptionBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  gridWrapper: {
    alignSelf: 'flex-start',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  recentSnapsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  // Unlocked banner
  unlockedBanner: {
    gap: 8,
  },
  unlockedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#22C55E',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unlockedBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  unlockedTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unlockedTextBlock: {
    flex: 1,
    gap: 4,
  },
  unlockedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  unlockedSubtitle: {
    fontSize: 14,
    color: '#475569',
  },
  unlockedArrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockedArrow: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  tuneInCta: {
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  tuneInCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // CTA wrapper
  snapCardWrapper: {
    paddingBottom: 8,
  },
  // Start new pod wrapper — always visible below FoodSnapCard
  startNewWrapper: {
    paddingBottom: 8,
  },
  // Error state
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  generatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generatingText: {
    fontSize: 13,
    color: '#22C55E',
    fontWeight: '600',
  },
  generationFailedText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
