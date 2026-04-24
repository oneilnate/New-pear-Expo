/**
 * TuneInModal — full-screen modal shown when pod status transitions to 'ready'.
 *
 * Pixel-matches IMG_5118:
 * - Black full-screen overlay (rgba(0,0,0,0.85))
 * - Dark-brown circle with white fork icon (emoji 🍴, 48px)
 * - "Your FoodPod" 32pt bold white headline
 * - Two subtitle lines in gray
 * - "Tune In" white rounded button (black text)
 * - "Not Now" underlined white text link
 *
 * WCAG AA: white #FFFFFF on rgba(0,0,0,0.85) ≈ 19:1 contrast ratio.
 *
 * Architecture:
 * - Display-only; no fetch, no business logic.
 * - Calls onTuneIn / onNotNow from parent.
 */

// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';

export type TuneInModalProps = {
  /** Whether the modal is visible */
  visible: boolean;
  /** Called when user taps "Tune In" */
  onTuneIn: () => void;
  /** Called when user taps "Not Now" */
  onNotNow: () => void;
};

export function TuneInModal({ visible, onTuneIn, onNotNow }: TuneInModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      accessibilityViewIsModal
      onRequestClose={onNotNow}
    >
      {/* Backdrop — intercepts taps outside the content card */}
      <TouchableWithoutFeedback onPress={onNotNow} accessibilityLabel="Dismiss Tune In modal">
        <View style={styles.overlay}>
          {/* Card — stopPropagation so inner taps don't dismiss */}
          <TouchableWithoutFeedback>
            <View style={styles.card} accessibilityLabel="Tune In" accessibilityRole="none">
              {/* Fork icon circle */}
              <View style={styles.iconCircle} accessibilityElementsHidden>
                <Text style={styles.forkIcon}>🍴</Text>
              </View>

              {/* Headline */}
              <Text style={styles.headline}>Your FoodPod</Text>

              {/* Subtitle lines */}
              <Text style={styles.subtitle}>
                Get personalized nutrition insights from your{' '}
                <Text style={styles.subtitleBold}>past 7 days of meals!</Text>
              </Text>
              <Text style={styles.subtitleMuted}>
                {"A new FoodPod will be ready every Monday at midnight — we'll notify you!"}
              </Text>

              {/* Spacer */}
              <View style={styles.spacer} />

              {/* Tune In button */}
              <Pressable
                style={({ pressed }) => [
                  styles.tuneInButton,
                  pressed && styles.tuneInButtonPressed,
                ]}
                onPress={onTuneIn}
                accessibilityLabel="Tune In to your FoodPod"
                accessibilityRole="button"
              >
                <Text style={styles.tuneInButtonText}>Tune In</Text>
              </Pressable>

              {/* Not Now link */}
              <Pressable
                style={({ pressed }) => [
                  styles.notNowButton,
                  pressed && styles.notNowButtonPressed,
                ]}
                onPress={onNotNow}
                accessibilityLabel="Not Now — dismiss Tune In modal"
                accessibilityRole="button"
              >
                <Text style={styles.notNowText}>Not Now</Text>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 64,
    paddingHorizontal: 24,
  },
  card: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(90,30,20,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  forkIcon: {
    fontSize: 48,
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 32,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
    opacity: 0.9,
    paddingHorizontal: 8,
  },
  subtitleBold: {
    fontWeight: '700',
  },
  subtitleMuted: {
    fontSize: 15,
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  tuneInButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tuneInButtonPressed: {
    opacity: 0.9,
  },
  tuneInButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A0A0A',
  },
  notNowButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notNowButtonPressed: {
    opacity: 0.7,
  },
  notNowText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
});
