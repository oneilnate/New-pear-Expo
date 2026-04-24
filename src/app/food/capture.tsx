/**
 * Capture screen — /food/capture
 *
 * Flow:
 * 1. On mount, request camera permission via expo-image-picker.
 * 2. If denied → show "Camera access required" message + Settings deep link.
 * 3. If granted → immediately launch ImagePicker.launchCameraAsync().
 * 4. On capture → show preview + "Use this photo" / "Retake" buttons.
 * 5. On "Use this photo" → uploadMeal mutation → router.replace('/food') on success.
 * 6. On error → show error banner + Retry button.
 * 7. On "Retake" → relaunch camera.
 *
 * Architecture contract:
 * - JSX + local state only. No fetch() calls.
 * - All upload logic via useUploadMeal from @/modules/food.
 * - Navigation via expo-router useRouter.
 *
 * F3-E2 — Camera capture flow (expo-image-picker → upload)
 */

import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useCurrentPod, useUploadMeal } from '@/modules/food';

type ScreenState =
  | { phase: 'requesting' } // awaiting permission result
  | { phase: 'denied' } // permission denied
  | { phase: 'camera' } // camera is opening / waiting
  | { phase: 'preview'; uri: string } // photo taken, showing preview
  | { phase: 'uploading'; uri: string } // upload in progress
  | { phase: 'error'; uri: string; message: string }; // upload failed

export default function CaptureScreen() {
  const router = useRouter();
  const [state, setState] = useState<ScreenState>({ phase: 'requesting' });
  // F7 (exe_VKuAAzpN): podId from useCurrentPod() instead of hardcoded DEMO_POD_ID
  const { data: currentPod } = useCurrentPod();
  const podId = currentPod?.id ?? '';
  const { mutateAsync: upload } = useUploadMeal(podId);


  // ── Camera launcher ──────────────────────────────────────────────────────
  const launchCamera = useCallback(async () => {
    setState({ phase: 'camera' });
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        mediaTypes: 'images',
        allowsEditing: false,
      });
      if (result.canceled || !result.assets[0]) {
        // User pressed cancel — go back to food home
        router.replace('/food');
        return;
      }
      const asset = result.assets[0];
      setState({ phase: 'preview', uri: asset.uri });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera failed to open';
      setState({ phase: 'error', uri: '', message });
    }
  }, [router]);

  // Stable ref so the mount-only useEffect can call the latest launchCamera
  // without needing it as a dependency (avoids infinite re-trigger).
  const launchCameraRef = React.useRef(launchCamera);
  launchCameraRef.current = launchCamera;

  // ── Permission request on mount ───────────────────────────────────────────
  // Empty deps array is intentional: runs once on mount.
  // launchCameraRef.current always holds the latest version (ref pattern).
  useEffect(() => {
    let cancelled = false;
    async function requestPermission() {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (cancelled) return;
      if (status === 'granted') {
        await launchCameraRef.current();
      } else {
        setState({ phase: 'denied' });
      }
    }
    void requestPermission();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Upload handler ────────────────────────────────────────────────────────
  async function handleUsePhoto(uri: string) {
    setState({ phase: 'uploading', uri });
    try {
      await upload({ uri });
      router.replace('/food');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setState({ phase: 'error', uri, message });
    }
  }

  // ── Open settings deep link ───────────────────────────────────────────────
  async function openSettings() {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (state.phase === 'requesting' || state.phase === 'camera') {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#15803D" accessibilityLabel="Opening camera" />
      </SafeAreaView>
    );
  }

  if (state.phase === 'denied') {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.iconText} accessibilityElementsHidden>
          📷
        </Text>
        <Text style={styles.headingText}>Camera access required</Text>
        <Text style={styles.bodyText}>Please enable camera access in Settings to snap a meal.</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => void openSettings()}
          accessibilityLabel="Open Settings to enable camera"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Open Settings</Text>
        </Pressable>
        <Pressable
          style={styles.ghostButton}
          onPress={() => router.replace('/food')}
          accessibilityLabel="Go back to Food home"
          accessibilityRole="button"
        >
          <Text style={styles.ghostButtonText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (state.phase === 'preview' || state.phase === 'uploading' || state.phase === 'error') {
    const { uri } = state;
    const isUploading = state.phase === 'uploading';
    const errorMessage = state.phase === 'error' ? state.message : null;

    return (
      <SafeAreaView style={styles.container}>
        {/* Preview image */}
        <Image
          source={{ uri }}
          style={styles.preview}
          resizeMode="cover"
          accessibilityLabel="Captured meal photo preview"
        />

        {/* Error banner */}
        {errorMessage !== null && (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionBar}>
          {/* Retake */}
          <Pressable
            style={[styles.secondaryButton, isUploading && styles.buttonDisabled]}
            onPress={() => void launchCamera()}
            disabled={isUploading}
            accessibilityLabel="Retake photo"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Retake</Text>
          </Pressable>

          {/* Use this photo / Retry */}
          <Pressable
            style={[
              styles.primaryButton,
              styles.primaryButtonFlex,
              isUploading && styles.buttonDisabled,
            ]}
            onPress={() => void handleUsePhoto(uri)}
            disabled={isUploading}
            accessibilityLabel={errorMessage !== null ? 'Retry upload' : 'Use this photo'}
            accessibilityRole="button"
          >
            {isUploading ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
                accessibilityLabel="Uploading photo"
              />
            ) : (
              <Text style={styles.primaryButtonText}>
                {errorMessage !== null ? 'Retry' : 'Use this photo'}
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Unreachable fallback — TypeScript exhaustiveness
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  preview: {
    flex: 1,
    width: '100%',
  },
  iconText: {
    fontSize: 48,
  },
  headingText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  bodyText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#000000',
  },
  primaryButton: {
    backgroundColor: '#15803D',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonFlex: {
    flex: 1,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  ghostButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
