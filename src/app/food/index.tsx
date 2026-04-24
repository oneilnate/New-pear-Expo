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

import { useRouter } from 'expo-router';
// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  const completePod = useCompletePod();
  const completeFiredRef = useRef<string | null>(null);
  const [completeError, setCompleteError] = useState(false);

  useEffect(() => {
    if (!podId) return;
    if (podState?.status !== 'collecting') return;
    if ((podState?.capturedCount ?? 0) < (podState?.targetCount ?? 1)) return;
    // Guard: fire ONCE per podId (ref tracks which pod we already fired for)
    if (completeFiredRef.current === podId) return;
    completeFiredRef.current = podId;
    setCompleteError(false);
    completePod.mutate(podId, {
      onError: (err) => {
        console.error('[FoodHomeScreen] /complete failed:', err);
        setCompleteError(true);
        // Reset ref so retry is possible
        completeFiredRef.current = null;
      },
    });
  }, [podId, podState?.status, podState?.capturedCount, podState?.targetCount, completePod.mutate]);

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
        <ActivityIndicator size="large" color="#15803D" accessibilityLabel="Loading Food Pod" />
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
  const { capturedCount, targetCount } = podState;
  // Grid UNLOCKED: capturedCount >= targetCount (visual state on home screen)
  const isGridUnlocked = capturedCount >= targetCount;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Tune In modal — auto-shown on first unlock, re-openable via button */}
      <TuneInModal visible={showModal} onTuneIn={handleTuneIn} onNotNow={handleNotNow} />

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
              <View style={styles.headerIconWrap}>
                <Text style={styles.headerIcon}>🍴</Text>
              </View>
              <Text style={styles.cardTitle}>Food Snap</Text>
            </View>
            <View style={styles.counterBadge}>
              <View style={styles.counterBadgeIconWrap}>
                <Text style={styles.counterBadgeIcon}>📷</Text>
              </View>
              <Text style={styles.counterBadgeText}>
                {isGridUnlocked
                  ? `${targetCount}/${targetCount}`
                  : `${capturedCount}/${targetCount}`}
              </Text>
            </View>
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

          {/* Generation failed — inline retry (only shown when /complete errors) */}
          {completeError && (
            <Pressable
              onPress={() => {
                if (!podId) return;
                setCompleteError(false);
                completePod.mutate(podId, {
                  onError: (err) => {
                    console.error('[FoodHomeScreen] /complete retry failed:', err);
                    setCompleteError(true);
                  },
                });
              }}
              accessibilityLabel="Retry generating your FoodPod"
              accessibilityRole="button"
            >
              <Text style={styles.generationFailedText}>Generation failed — Retry</Text>
            </Pressable>
          )}

          {/* Unlocked banner (30/30 state) */}
          {isGridUnlocked ? (
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
          ) : (
            <Text style={styles.recentSnapsLabel}>RECENT SNAPS</Text>
          )}
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
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  counterBadge: {
    alignItems: 'center',
    gap: 4,
  },
  counterBadgeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBadgeIcon: {
    fontSize: 24,
  },
  counterBadgeText: {
    fontSize: 13,
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
    backgroundColor: '#15803D',
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
    backgroundColor: '#15803D',
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
    backgroundColor: '#15803D',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  generationFailedText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
