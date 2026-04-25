/**
 * Capture screen — /food/capture
 *
 * Embedded expo-camera CameraView — single-screen branded capture.
 * Replaces expo-image-picker.launchCameraAsync() to eliminate the native
 * UIImagePickerController modal and its "Retake / Use Photo" native preview.
 *
 * Flow:
 * 1. On mount, check camera permission via useCameraPermissions().
 * 2. If !granted → show in-app PermissionPrompt (Pressable → requestPermission).
 * 3. If granted → show embedded <CameraView> with branded shutter button.
 * 4. Shutter tap → takePictureAsync() → phase='preview' (same screen, no remount).
 * 5. "Use this photo" → uploadMeal.mutateAsync() → router.back().
 * 6. "Retake" → phase='camera' (no re-permission, no remount).
 * 7. Back button → router.back() at any phase.
 *
 * Architecture contract:
 * - JSX + local state only. No fetch() calls.
 * - All upload logic via useUploadMeal from @/modules/food.
 * - Navigation via expo-router useRouter.
 *
 * exe_EEE0f1rK — Branded camera capture (replace native picker)
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
// biome-ignore lint/correctness/noUnusedImports: React needed in scope for JSX (vitest-native test environment)
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useCurrentPod, useUploadMeal } from '@/modules/food';

type Phase = 'camera' | 'preview' | 'uploading' | 'error';

interface CaptureState {
  phase: Phase;
  uri: string | null;
  errorMessage: string | null;
  cameraActive: boolean;
}

const INITIAL_STATE: CaptureState = {
  phase: 'camera',
  uri: null,
  errorMessage: null,
  cameraActive: true,
};

// ── Permission Prompt ─────────────────────────────────────────────────────────

interface PermissionPromptProps {
  onGrant: () => void;
  onBack: () => void;
}

function PermissionPrompt({ onGrant, onBack }: PermissionPromptProps) {
  return (
    <SafeAreaView style={styles.centered}>
      <Text style={styles.iconText} accessibilityElementsHidden>
        📷
      </Text>
      <Text style={styles.headingText}>Camera access required</Text>
      <Text style={styles.bodyText}>Please allow camera access to photograph your meals.</Text>
      <Pressable
        style={styles.primaryButton}
        onPress={onGrant}
        accessibilityLabel="Allow camera access"
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>Allow Camera</Text>
      </Pressable>
      <Pressable
        style={styles.ghostButton}
        onPress={onBack}
        accessibilityLabel="Go back to Food home"
        accessibilityRole="button"
      >
        <Text style={styles.ghostButtonText}>Go back</Text>
      </Pressable>
    </SafeAreaView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function CaptureScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<CaptureState>(INITIAL_STATE);
  const cameraRef = useRef<CameraView>(null);

  const { data: currentPod } = useCurrentPod();
  const podId = currentPod?.id ?? '';
  const { mutateAsync: upload } = useUploadMeal(podId);

  // Pause camera when screen loses focus (battery saving)
  useFocusEffect(
    useCallback(() => {
      setState((prev) => ({ ...prev, cameraActive: true }));
      return () => {
        setState((prev) => ({ ...prev, cameraActive: false }));
      };
    }, []),
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleShutter = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) return;
      setState((prev) => ({ ...prev, phase: 'preview', uri: photo.uri, errorMessage: null }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera failed to capture';
      setState((prev) => ({ ...prev, phase: 'error', errorMessage: msg }));
    }
  }, []);

  const handleRetake = useCallback(() => {
    setState((_prev) => ({
      phase: 'camera',
      uri: null,
      errorMessage: null,
      cameraActive: true,
    }));
  }, []);

  const handleUsePhoto = useCallback(async () => {
    if (!state.uri) return;
    const uri = state.uri;
    setState((prev) => ({ ...prev, phase: 'uploading' }));
    try {
      await upload({ uri });
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setState((prev) => ({ ...prev, phase: 'error', errorMessage: msg }));
    }
  }, [state.uri, upload, router]);

  // ── Permission not yet resolved ───────────────────────────────────────────

  if (!permission) {
    // useCameraPermissions is loading
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator
          size="large"
          color="#15803D"
          accessibilityLabel="Checking camera permission"
        />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <PermissionPrompt onGrant={() => void requestPermission()} onBack={() => router.back()} />
    );
  }

  // ── Preview / Uploading / Error phases ────────────────────────────────────

  if (state.phase === 'preview' || state.phase === 'uploading' || state.phase === 'error') {
    const isUploading = state.phase === 'uploading';
    const hasError = state.phase === 'error';

    return (
      <SafeAreaView style={styles.container}>
        {/* Back button */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>

        {/* Preview image */}
        {state.uri !== null && (
          <Image
            source={{ uri: state.uri }}
            style={styles.preview}
            resizeMode="cover"
            accessibilityLabel="Captured meal photo preview"
          />
        )}

        {/* Error banner */}
        {hasError && state.errorMessage !== null && (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Text style={styles.errorText}>{state.errorMessage}</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionBar}>
          <Pressable
            style={[styles.secondaryButton, isUploading && styles.buttonDisabled]}
            onPress={handleRetake}
            disabled={isUploading}
            accessibilityLabel="Retake photo"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Retake</Text>
          </Pressable>

          <Pressable
            style={[
              styles.primaryButton,
              styles.primaryButtonFlex,
              isUploading && styles.buttonDisabled,
            ]}
            onPress={() => void handleUsePhoto()}
            disabled={isUploading}
            accessibilityLabel={hasError ? 'Retry upload' : 'Use this photo'}
            accessibilityRole="button"
          >
            {isUploading ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
                accessibilityLabel="Uploading photo"
              />
            ) : (
              <Text style={styles.primaryButtonText}>{hasError ? 'Retry' : 'Use this photo'}</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Camera phase (default) ────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Camera viewfinder */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        active={state.cameraActive}
        accessibilityLabel="Camera viewfinder"
      />

      {/* Back button + shutter overlay */}
      <SafeAreaView style={styles.cameraOverlay} pointerEvents="box-none">
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>

        {/* Branded shutter button */}
        <View style={styles.shutterContainer}>
          <Pressable
            style={styles.shutterButton}
            onPress={() => void handleShutter()}
            accessibilityLabel="Take photo"
            accessibilityRole="button"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

// Default export required by expo-router file-based routing
export default CaptureScreen;

// ── Styles ────────────────────────────────────────────────────────────────────

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
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  backButton: {
    marginTop: 8,
    marginLeft: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  shutterContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  shutterButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 4,
    borderColor: '#FFFFFF',
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
