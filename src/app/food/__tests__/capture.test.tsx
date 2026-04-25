/**
 * CaptureScreen integration tests.
 *
 * Tests the new embedded expo-camera CameraView state machine.
 * Phases: camera → shutter → preview → upload → router.back()
 *        camera → shutter → preview → retake → camera
 *        upload error → error banner + retry
 *        permission denied → permission prompt
 *
 * exe_EEE0f1rK — src/app/food/__tests__/capture.test.tsx
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import React from 'react'; // used for React.forwardRef + React.useImperativeHandle in expo-camera mock
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Hoisted mock functions ──────────────────────────────────────────────────────────────────────

const { mockRouterBack, mockTakePictureAsync, mockRequestPermission, mockPermissionGranted } =
  vi.hoisted(() => ({
    mockRouterBack: vi.fn(),
    mockTakePictureAsync: vi.fn(),
    mockRequestPermission: vi.fn(),
    mockPermissionGranted: { current: true },
  }));

// ─── Mocks ───────────────────────────────────────────────────────────────────────────────

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: mockRouterBack,
  }),
  useFocusEffect: (_cb: () => () => void) => {
    // No-op in tests: cameraActive starts true; focus/blur lifecycle not under test
  },
  Redirect: () => null,
  Stack: () => null,
  Link: () => null,
}));

vi.mock('expo-camera', () => ({
  CameraView: React.forwardRef(
    (
      _props: Record<string, unknown>,
      ref: React.Ref<{ takePictureAsync: typeof mockTakePictureAsync }>,
    ) => {
      // Expose takePictureAsync via ref so tests can trigger shutter
      React.useImperativeHandle(ref, () => ({
        takePictureAsync: mockTakePictureAsync,
      }));
      return null;
    },
  ),
  useCameraPermissions: () => [
    {
      granted: mockPermissionGranted.current,
      status: mockPermissionGranted.current ? 'granted' : 'denied',
    },
    mockRequestPermission,
  ],
}));

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

// ─── Environment ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://test-capture-screen.example.com';
process.env.EXPO_PUBLIC_API_BASE_URL = BASE_URL;
process.env.EXPO_PUBLIC_DEMO_BEARER_TOKEN = 'test-token-capture-screen';

// ─── Screen under test ───────────────────────────────────────────────────────────────────────────

import CaptureScreen from '../capture';

// ─── MSW server ─────────────────────────────────────────────────────────────────────────────

const server = setupServer(
  // GET /api/pods/current — required by useCurrentPod() in CaptureScreen
  http.get(`${BASE_URL}/api/pods/current`, () =>
    HttpResponse.json({
      id: 'pod_demo_01',
      status: 'draft',
      targetCount: 7,
      capturedCount: 3,
      recentSnaps: [],
      episode: null,
    }),
  ),
  http.post(`${BASE_URL}/api/pods/:podId/images`, () =>
    HttpResponse.json({ imageId: 'img-new', sequenceNumber: 4, capturedCount: 4 }, { status: 201 }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
  mockPermissionGranted.current = true;
});
afterAll(() => server.close());

// ─── Helpers ─────────────────────────────────────────────────────────────────────────────────

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

// ─── Tests ─────────────────────────────────────────────────────────────────────────────────

describe('CaptureScreen — permission denied path', () => {
  beforeEach(() => {
    mockPermissionGranted.current = false;
  });

  it('shows "Camera access required" heading', () => {
    const { getByText } = renderScreen();
    expect(getByText('Camera access required')).toBeTruthy();
  });

  it('shows "Allow camera access" button', () => {
    const { getByLabelText } = renderScreen();
    expect(getByLabelText('Allow camera access')).toBeTruthy();
  });

  it('"Go back" button calls router.back()', () => {
    const { getByLabelText } = renderScreen();
    expect(getByLabelText('Go back to Food home')).toBeTruthy();
    fireEvent.press(getByLabelText('Go back to Food home'));
    expect(mockRouterBack).toHaveBeenCalled();
  });
});

describe('CaptureScreen — camera phase (permission granted)', () => {
  beforeEach(() => {
    mockPermissionGranted.current = true;
  });

  it('shows the camera viewfinder (Take photo button visible)', () => {
    const { getByLabelText } = renderScreen();
    expect(getByLabelText('Take photo')).toBeTruthy();
  });

  it('shows back button in camera phase', () => {
    const { getAllByLabelText } = renderScreen();
    // Both camera overlay and standard back have "Go back" label
    expect(getAllByLabelText('Go back').length).toBeGreaterThanOrEqual(1);
  });
});

describe('CaptureScreen — capture + upload + navigate path', () => {
  const PHOTO_URI = 'file:///tmp/meal-snap-001.jpg';

  beforeEach(() => {
    mockPermissionGranted.current = true;
    mockTakePictureAsync.mockResolvedValue({ uri: PHOTO_URI, width: 1280, height: 960 });
  });

  it('shows "Captured meal photo preview" after shutter tap', async () => {
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Take photo'));
    await waitFor(() => expect(getByLabelText('Captured meal photo preview')).toBeTruthy());
  });

  it('shows "Use this photo" button in preview state', async () => {
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Take photo'));
    await waitFor(() => expect(getByLabelText('Use this photo')).toBeTruthy());
  });

  it('shows "Retake photo" button in preview state', async () => {
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Take photo'));
    await waitFor(() => expect(getByLabelText('Retake photo')).toBeTruthy());
  });

  it('navigates via router.back() after upload succeeds', async () => {
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Take photo'));
    await waitFor(() => expect(getByLabelText('Use this photo')).toBeTruthy());
    fireEvent.press(getByLabelText('Use this photo'));
    await waitFor(() => expect(mockRouterBack).toHaveBeenCalled());
  });

  it('"Retake" button returns to camera phase', async () => {
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Take photo'));
    await waitFor(() => expect(getByLabelText('Retake photo')).toBeTruthy());
    fireEvent.press(getByLabelText('Retake photo'));
    await waitFor(() => expect(getByLabelText('Take photo')).toBeTruthy());
  });
});

describe('CaptureScreen — upload error path', () => {
  const PHOTO_URI = 'file:///tmp/meal-snap-error.jpg';

  beforeEach(() => {
    mockPermissionGranted.current = true;
    mockTakePictureAsync.mockResolvedValue({ uri: PHOTO_URI, width: 1280, height: 960 });
    server.use(
      http.post(`${BASE_URL}/api/pods/:podId/images`, () =>
        HttpResponse.json({ error: 'Server Error' }, { status: 500 }),
      ),
    );
  });

  it('shows "Retry upload" accessibility label on button after error', async () => {
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Take photo'));
    await waitFor(() => expect(getByLabelText('Use this photo')).toBeTruthy());
    fireEvent.press(getByLabelText('Use this photo'));
    await waitFor(() => expect(getByLabelText('Retry upload')).toBeTruthy());
  });

  it('shows error message text in the banner after upload fails', async () => {
    const { getByLabelText, getByText } = renderScreen();
    fireEvent.press(getByLabelText('Take photo'));
    await waitFor(() => expect(getByLabelText('Use this photo')).toBeTruthy());
    fireEvent.press(getByLabelText('Use this photo'));
    await waitFor(() => expect(getByLabelText('Retry upload')).toBeTruthy());
    // Error message contains HTTP 500
    expect(getByText(/HTTP 500/)).toBeTruthy();
  });

  it('shows the error banner View in the render tree', async () => {
    const { getByLabelText, UNSAFE_getByProps } = renderScreen();
    fireEvent.press(getByLabelText('Take photo'));
    await waitFor(() => expect(getByLabelText('Use this photo')).toBeTruthy());
    fireEvent.press(getByLabelText('Use this photo'));
    await waitFor(() => expect(getByLabelText('Retry upload')).toBeTruthy());
    expect(UNSAFE_getByProps({ accessibilityRole: 'alert' })).toBeTruthy();
  });
});
