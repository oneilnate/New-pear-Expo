/**
 * FoodSnapCard — CTA card for capturing a new meal snap.
 *
 * Light-gray pill, dark text, bright-green camera circle on the right.
 * Matches Simon's mock: #CBD5E1 background, #22C55E icon circle.
 *
 * Architecture: display-only, navigation triggered by onPress callback.
 */

import { Ionicons } from '@expo/vector-icons';
// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type FoodSnapCardProps = {
  onPress: () => void;
};

export function FoodSnapCard({ onPress }: FoodSnapCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityLabel="Snap food & beverages"
      accessibilityRole="button"
      accessibilityHint="Navigate to meal capture screen"
    >
      <View style={styles.textContainer}>
        <Text style={styles.label}>Snap food & beverages</Text>
        <Text style={styles.sublabel}>Capture your next food-item to progress</Text>
      </View>
      <View style={styles.iconCircle}>
        <Ionicons name="camera-outline" size={28} color="#0F172A" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CBD5E1',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
  },
  cardPressed: {
    opacity: 0.85,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sublabel: {
    fontSize: 14,
    color: '#334155',
    marginTop: 2,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
