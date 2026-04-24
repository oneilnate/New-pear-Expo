/**
 * PlayerControls — audio playback controls for the FoodPod player screen.
 *
 * Renders:
 *   - Back-15s / Forward-15s skip buttons flanking the play/pause button
 *   - Large circular play/pause button (72px, #15803D)
 *   - Scrubable progress bar (touch target ≥ 44pt)
 *   - Elapsed / remaining time labels in MM:SS format
 *
 * WCAG AA: all controls have accessibilityLabel + accessibilityRole.
 * Touch targets: min-height 44pt on all interactive elements.
 *
 * Architecture: pure presentational component — no hooks, no fetch.
 */

// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/** Format milliseconds to MM:SS string */
export function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export type PlayerControlsProps = {
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (ms: number) => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
};

export function PlayerControls({
  isPlaying,
  positionMillis,
  durationMillis,
  onPlay,
  onPause,
  onSeek,
  onSkipBack,
  onSkipForward,
}: PlayerControlsProps) {
  const elapsed = formatMs(positionMillis);
  const remaining = durationMillis > 0 ? `-${formatMs(durationMillis - positionMillis)}` : '--:--';
  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;
  const [barWidth, setBarWidth] = useState(300);

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View
        style={styles.progressBarOuter}
        accessibilityLabel={`Playback progress: ${elapsed} of ${formatMs(durationMillis)}`}
        accessibilityRole="progressbar"
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        <View style={[styles.progressBarInner, { flex: progress }]} />
        <View style={[styles.progressBarRemainder, { flex: 1 - progress }]} />
        {/* Full-width invisible 44pt touch target for scrubbing */}
        <Pressable
          style={styles.progressTouchTarget}
          accessibilityLabel="Seek audio position"
          accessibilityRole="adjustable"
          onPress={(e) => {
            if (durationMillis <= 0 || barWidth <= 0) return;
            const x = e.nativeEvent.locationX;
            const ratio = Math.min(1, Math.max(0, x / barWidth));
            onSeek(Math.floor(ratio * durationMillis));
          }}
        />
      </View>

      {/* Time labels */}
      <View style={styles.timeRow}>
        <Text style={styles.timeLabel} accessibilityLabel={`Elapsed time ${elapsed}`}>
          {elapsed}
        </Text>
        <Text style={styles.timeLabel} accessibilityLabel={`Remaining time ${remaining}`}>
          {remaining}
        </Text>
      </View>

      {/* Controls row */}
      <View style={styles.controlsRow}>
        {/* Back 15s */}
        <Pressable
          style={styles.skipButton}
          onPress={onSkipBack}
          accessibilityLabel="Skip back 15 seconds"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.skipIcon}>↺</Text>
          <Text style={styles.skipLabel}>15</Text>
        </Pressable>

        {/* Play / Pause */}
        <Pressable
          style={styles.playButton}
          onPress={isPlaying ? onPause : onPlay}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          accessibilityRole="button"
        >
          <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        </Pressable>

        {/* Forward 15s */}
        <Pressable
          style={styles.skipButton}
          onPress={onSkipForward}
          accessibilityLabel="Skip forward 15 seconds"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.skipIcon}>↻</Text>
          <Text style={styles.skipLabel}>15</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PLAY_BUTTON_SIZE = 72;
const SKIP_BUTTON_SIZE = 48;
const GREEN = '#15803D';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  progressBarOuter: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 8,
  },
  progressBarInner: {
    height: 6,
    backgroundColor: GREEN,
    borderRadius: 3,
  },
  progressBarRemainder: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressTouchTarget: {
    position: 'absolute',
    top: -19, // expand to 44pt (6 bar + 19 above + 19 below)
    bottom: -19,
    left: 0,
    right: 0,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 4,
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    marginTop: 8,
  },
  skipButton: {
    width: SKIP_BUTTON_SIZE,
    height: SKIP_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipIcon: {
    color: '#FFFFFF',
    fontSize: 22,
  },
  skipLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: -2,
  },
  playButton: {
    width: PLAY_BUTTON_SIZE,
    height: PLAY_BUTTON_SIZE,
    borderRadius: PLAY_BUTTON_SIZE / 2,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 28,
  },
});
