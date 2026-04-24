/**
 * Food Pod player screen — /food/player
 *
 * Stub screen for F3-E4. Navigated to from TuneInModal "Tune In" button.
 * Full expo-av MP3 playback + scrollable summary implemented in F3-E4.
 *
 * Architecture contract:
 * - JSX + local state only — no business logic, no fetch() calls.
 */

import { useRouter } from 'expo-router';
// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text } from 'react-native';

export default function FoodPlayerScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Your FoodPod</Text>
      <Text style={styles.subtitle}>Full player coming in F3-E4</Text>
      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
        accessibilityLabel="Back to Food Snap"
        accessibilityRole="button"
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
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
});
