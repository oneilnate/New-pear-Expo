/**
 * app.config.ts — Expo dynamic config for Food Pod.
 *
 * Replaces app.json to support per-environment overrides via eas.json envs.
 * EXPO_PUBLIC_* vars are injected at build time from eas.json build profile env
 * and are accessible in the app via process.env.EXPO_PUBLIC_*.
 *
 * Key env vars:
 *   EXPO_PUBLIC_API_BASE_URL      — VM backend URL (pear-sandbox.everbetter.com)
 *   EXPO_PUBLIC_DEMO_BEARER_TOKEN — Shared single-user demo bearer token
 *
 * Pairs with: oneilnate/New-pear-backend
 */
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Food Pod',
  slug: 'food-pod',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'foodpod',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.everbetter.foodpod',
  },
  android: {
    package: 'com.everbetter.foodpod',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
    title: 'Food Pod',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        android: {
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow $(PRODUCT_NAME) to access your photos for meal capture.',
        cameraPermission: 'Allow $(PRODUCT_NAME) to use your camera to photograph meals.',
      },
    ],
    'expo-secure-store',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  owner: 'nateoutsidethebox',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/28a85fb2-e56c-4a53-a398-0080b43414ea',
  },
  extra: {
    router: {},
    eas: {
      projectId: '28a85fb2-e56c-4a53-a398-0080b43414ea',
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://pear-sandbox.everbetter.com',
      demoBearerToken: process.env.EXPO_PUBLIC_DEMO_BEARER_TOKEN ?? '',
    },
  },
};

export default config;
