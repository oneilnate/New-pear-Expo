/**
 * Food Pod player screen — /food/player
 *
 * Pixel-matches IMG_5119:
 *   - Black background with large "FoodPod" title centered
 *   - Rounded dark pill showing MM:SS timer at bottom of black area
 *   - White bottom sheet with episode title, date, summary text, and controls
 *
 * States:
 *   - Loading: ActivityIndicator + "Tuning in..." (while episode fetch is pending)
 *   - No episode (404): "Your FoodPod isn't ready yet" + back button
 *   - Error (other): error message + retry button
 *   - Success: full player with audio controls
 *
 * Architecture contract:
 * - JSX + local state only — no business logic, no fetch() calls.
 * - All server state via useEpisode + useAudioPlayer from @/modules/food.
 * - All navigation via expo-router useRouter.
 *
 * F3-E4 — Player screen with expo-av playback.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PlayerControls, useAudioPlayer, useEpisode } from '@/modules/food';

/** Hardcoded demo pod ID matching F3-E1 spec */
const DEMO_POD_ID = 'pod_demo_01';

const SKIP_MS = 15_000;

export default function FoodPlayerScreen() {
  const router = useRouter();
  // podId can be passed as a search param; fallback to demo pod
  const params = useLocalSearchParams<{ podId?: string }>();
  const podId = params.podId ?? DEMO_POD_ID;

  const { data: episode, isLoading, isError, error, refetch } = useEpisode(podId);

  const { isLoaded, isPlaying, positionMillis, durationMillis, play, pause, seek } = useAudioPlayer(
    episode?.audioUrl,
  );

  const is404 = isError && (error?.message ?? '').startsWith('HTTP 404');

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.centeredContainer} accessibilityLabel="Loading player">
        <ActivityIndicator size="large" color="#FFFFFF" accessibilityLabel="Tuning in" />
        <Text style={styles.loadingText}>Tuning in...</Text>
      </SafeAreaView>
    );
  }

  // ── No episode (404) ─────────────────────────────────────────────────────
  if (is404) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Text style={styles.notReadyTitle}>Your FoodPod{'\n'}isn't ready yet</Text>
        <Text style={styles.notReadyBody}>
          Keep logging meals — your personalized nutrition podcast will be ready once you hit the
          target.
        </Text>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back to Food home"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Other error ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error?.message ?? 'Something went wrong'}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => void refetch()}
          accessibilityLabel="Retry loading episode"
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
        <Pressable
          style={[styles.backButton, { marginTop: 12 }]}
          onPress={() => router.back()}
          accessibilityLabel="Go back to Food home"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  const displayDuration = durationMillis > 0 ? durationMillis : (episode?.durationSec ?? 0) * 1000;

  function formatTimer(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  const timerDisplay = isLoaded
    ? formatTimer(durationMillis - positionMillis)
    : formatTimer(displayDuration);

  const createdDate = episode?.createdAt
    ? new Date(episode.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <View style={styles.screenContainer}>
      {/* ── Black upper area ────────────────────────────────────────────── */}
      <SafeAreaView style={styles.blackArea}>
        <Pressable
          style={styles.topBackButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back to Food home"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.topBackText}>‹</Text>
        </Pressable>

        {/* Large FoodPod title — pixel matches IMG_5119 */}
        <View style={styles.titleArea}>
          <Text style={styles.bigTitle} accessibilityRole="header">
            FoodPod
          </Text>
        </View>

        {/* Timer pill */}
        <View style={styles.timerPillContainer}>
          <View style={styles.timerPill} accessibilityLabel={`Time remaining ${timerDisplay}`}>
            <Text style={styles.timerText}>{timerDisplay}</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* ── White bottom sheet ──────────────────────────────────────────── */}
      <View style={styles.sheet}>
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Episode title + date */}
          <Text style={styles.episodeTitle} accessibilityRole="header">
            {episode?.title ?? 'FoodPod'}
          </Text>
          {createdDate ? <Text style={styles.episodeDate}>{createdDate}</Text> : null}

          {/* Summary text */}
          <Text style={styles.episodeSummary}>{episode?.summary ?? ''}</Text>

          {/* Audio controls — rendered below summary */}
          <PlayerControls
            isPlaying={isPlaying}
            positionMillis={positionMillis}
            durationMillis={displayDuration}
            onPlay={() => void play()}
            onPause={() => void pause()}
            onSeek={(ms) => void seek(ms)}
            onSkipBack={() => void seek(Math.max(0, positionMillis - SKIP_MS))}
            onSkipForward={() => void seek(Math.min(displayDuration, positionMillis + SKIP_MS))}
          />
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Centered states (loading / error / no episode)
  centeredContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginTop: 12,
  },
  notReadyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 32,
  },
  notReadyBody: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 15,
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#15803D',
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Full-screen layout
  screenContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  blackArea: {
    flex: 1,
  },
  topBackButton: {
    position: 'absolute',
    top: 16,
    left: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  topBackText: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 36,
  },
  titleArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigTitle: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  timerPillContainer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  timerPill: {
    backgroundColor: 'rgba(30,30,30,0.9)',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 1,
  },

  // Bottom sheet
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '55%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 6,
  },
  episodeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A0A0A',
    marginTop: 12,
  },
  episodeDate: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 8,
  },
  episodeSummary: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 22,
    marginBottom: 16,
  },
});
