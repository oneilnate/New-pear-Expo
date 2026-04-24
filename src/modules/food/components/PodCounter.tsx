/**
 * PodCounter — large numeric progress display.
 *
 * Shows "X/target" when in progress, "UNLOCKED" when complete.
 * 48pt bold, color #0F172A for contrast compliance.
 *
 * Architecture: display-only component — no hooks, no fetch.
 */

// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type PodCounterProps = {
  capturedCount: number;
  targetCount: number;
};

export function PodCounter({ capturedCount, targetCount }: PodCounterProps) {
  const isUnlocked = capturedCount >= targetCount;

  return (
    <View style={styles.container}>
      <Text
        style={styles.counter}
        accessibilityRole="text"
        accessibilityLabel={
          isUnlocked ? 'Food Pod unlocked' : `${capturedCount} of ${targetCount} meals captured`
        }
      >
        {isUnlocked ? 'UNLOCKED' : `${capturedCount}/${targetCount}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  counter: {
    fontSize: 48,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -1,
  },
});
