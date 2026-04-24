/**
 * CaptureScreen integration tests.
 *
 * Verifies three paths:
 *   1. Permission denied → "Camera access required" + Settings + go-back buttons
 *   2. Permission granted → capture → "Use this photo" → upload → navigate to /food
 *   3. Upload error → error banner + "Retry upload" button label
 *
 * Mock strategy:
 *   - expo-image-picker: vi.mock
 *   - expo-router: vi.mock
 *   - Network: MSW intercepts POST /api/pods/:podId/images (proven pattern from food.service.test.ts)
 *
 * F3-E2 — src/app/food/__tests__/capture.test.tsx
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
// biome-ignore lint/correctness/noUnusedImports: vitest-native requires React in scope for JSX transform
import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Hoisted mock functions ───────────────────────────────────────────────────

const { mockRouterReplace, mockLaunchCameraAsync, mockRequestCameraPermissionsAsync } = vi.hoisted(
  () => ({
    mockRouterReplace: vi.fn(),
    mockLaunchCameraAsync: vi.fn(),
    mockRequestCameraPermissionsAsync: vi.fn(),
  }),
);

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockRouterReplace,
    back: vi.fn(),
  }),
  Redirect: () => null,
  Stack: () => null,
  Link: () => null,
}));

vi.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: mockRequestCameraPermissionsAsync,
  launchCameraAsync: mockLaunchCameraAsync,
  MediaTypeOptions: { Images: 'Images' },
}));

// expo-secure-store depends on expo-modules-core native globals not available
// in the Node/vitest test environment. Provide an in-memory shim.
vi.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    getItemAsync: async (key: string) => store[key] ?? null,
    setItemAsync: async (key: string, value: string) => {
      store[key] = value;
    },
    deleteItemAsync: async (key: string) => {
      delete store[key];
    },
    isAvailableAsync: async () => true,
  };
});

// ─── Environment ─────────────────────────────────────────────────────────────

const BASE_URL = 'https://test-capture-screen.example.com';
process.env.EXPO_PUBLIC_API_BASE_URL = BASE_URL;
process.env.EXPO_PUBLIC_DEMO_BEARER_TOKEN = 'test-token-capture-screen';

// ─── Screen under test ────────────────────────────────────────────────────────

import CaptureScreen from '../capture';

// ─── MSW server ───────────────────────────────────────────────────────────────

const server = setupServer(
  http.post(`${BASE_URL}/api/pods/:podId/images`, () =>
    HttpResponse.json({ imageId: 'img-new', sequenceNumber: 4, capturedCount: 4 }, { status: 201 }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CaptureScreen />
    </QueryClientProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CaptureScreen — permission denied path', () => {
  beforeEach(() => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' });
  });

  it('shows "Camera access required" heading', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Camera access required')).toBeTruthy());
  });

  it('shows "Open Settings to enable camera" button', async () => {
    const { getByLabelText } = renderScreen();
    await waitFor(() => expect(getByLabelText('Open Settings to enable camera')).toBeTruthy());
  });

  it('"Go back" button calls router.replace("/food")', async () => {
    const { getByLabelText } = renderScreen();
    await waitFor(() => expect(getByLabelText('Go back to Food home')).toBeTruthy());
    fireEvent.press(getByLabelText('Go back to Food home'));
    expect(mockRouterReplace).toHaveBeenCalledWith('/food');
  });
});

describe('CaptureScreen — capture + upload + navigate path', () => {
  const PHOTO_URI = 'file:///tmp/meal-snap-001.jpg';

  beforeEach(() => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockLaunchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: PHOTO_URI, width: 1280, height: 960, type: 'image' }],
    });
  });

  it('shows ActivityIndicator while camera is opening', () => {
    // Camera never resolves → spinner stays visible on first sync render
    mockLaunchCameraAsync.mockImplementation(() => new Promise(() => {}));
    const { getByLabelText } = renderScreen();
    expect(getByLabelText('Opening camera')).toBeTruthy();
  });

  it('shows "Captured meal photo preview" after capture', async () => {
    const { getByLabelText } = renderScreen();
    await waitFor(() => expect(getByLabelText('Captured meal photo preview')).toBeTruthy());
  });

  it('shows "Use this photo" button in preview state', async () => {
    const { getByLabelText } = renderScreen();
    await waitFor(() => expect(getByLabelText('Use this photo')).toBeTruthy());
  });

  it('shows "Retake photo" button in preview state', async () => {
    const { getByLabelText } = renderScreen();
    await waitFor(() => expect(getByLabelText('Retake photo')).toBeTruthy());
  });

  it('navigates to /food after upload succeeds', async () => {
    const { getByLabelText } = renderScreen();
    await waitFor(() => expect(getByLabelText('Use this photo')).toBeTruthy());

    fireEvent.press(getByLabelText('Use this photo'));

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/food'));
  });

  it('"Retake" button relaunches the camera', async () => {
    const { getByLabelText } = renderScreen();
    await waitFor(() => expect(getByLabelText('Retake photo')).toBeTruthy());
    expect(mockLaunchCameraAsync).toHaveBeenCalledTimes(1);

    fireEvent.press(getByLabelText('Retake photo'));

    await waitFor(() => expect(mockLaunchCameraAsync).toHaveBeenCalledTimes(2));
  });
});

describe('CaptureScreen — upload error path', () => {
  const PHOTO_URI = 'file:///tmp/meal-snap-error.jpg';

  beforeEach(() => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockLaunchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: PHOTO_URI, width: 1280, height: 960, type: 'image' }],
    });
    server.use(
      http.post(`${BASE_URL}/api/pods/:podId/images`, () =>
        HttpResponse.json({ error: 'Server Error' }, { status: 500 }),
      ),
    );
  });

  it('shows "Retry upload" accessibility label on button after error', async () => {
    const { getByLabelText } = renderScreen();
    await waitFor(() => expect(getByLabelText('Use this photo')).toBeTruthy());

    fireEvent.press(getByLabelText('Use this photo'));

    await waitFor(() => expect(getByLabelText('Retry upload')).toBeTruthy());
  });

  it('shows error message text in the banner after upload fails', async () => {
    const { getByLabelText, getByText } = renderScreen();
    await waitFor(() => expect(getByLabelText('Use this photo')).toBeTruthy());

    fireEvent.press(getByLabelText('Use this photo'));

    await waitFor(() => expect(getByLabelText('Retry upload')).toBeTruthy());
    // Error message starts with "HTTP 500"
    expect(getByText(/HTTP 500/)).toBeTruthy();
  });

  it('shows the error banner View in the render tree', async () => {
    const { getByLabelText, UNSAFE_getByProps } = renderScreen();
    await waitFor(() => expect(getByLabelText('Use this photo')).toBeTruthy());

    fireEvent.press(getByLabelText('Use this photo'));

    await waitFor(() => expect(getByLabelText('Retry upload')).toBeTruthy());
    // Verify the errorBanner View is rendered
    expect(UNSAFE_getByProps({ accessibilityRole: 'alert' })).toBeTruthy();
  });
});
