/**
 * useUploadMeal hook tests.
 *
 * Verifies:
 *   - Calls uploadMeal service on mutate
 *   - Invalidates podState query on success so home grid auto-refreshes
 *   - Surfaces error message to caller on failure
 *
 * F3-E2 — src/modules/food/__tests__/hooks.uploadMeal.test.tsx
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
// biome-ignore lint/correctness/noUnusedImports: React value import required for JSX transform in vitest-native
import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { useUploadMeal } from '../hooks';

// ─── Environment ─────────────────────────────────────────────────────────────

const BASE_URL = 'https://test-api-hooks.example.com';
process.env.EXPO_PUBLIC_API_BASE_URL = BASE_URL;
process.env.EXPO_PUBLIC_DEMO_BEARER_TOKEN = 'test-token-hooks';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUploadResponse = {
  imageId: 'img-abc',
  sequenceNumber: 5,
  capturedCount: 5,
};

const testAsset = { uri: 'file:///tmp/snap.jpg' };

// ─── MSW server ───────────────────────────────────────────────────────────────

const server = setupServer(
  http.post(`${BASE_URL}/api/pods/:podId/images`, () =>
    HttpResponse.json(mockUploadResponse, { status: 201 }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ─── Helper ───────────────────────────────────────────────────────────────────

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useUploadMeal', () => {
  it('calls uploadMeal service and returns imageId on success', async () => {
    const queryClient = makeQueryClient();
    const { result } = renderHook(() => useUploadMeal('pod_demo_01'), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(testAsset);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      imageId: 'img-abc',
      sequenceNumber: 5,
      capturedCount: 5,
    });
  });

  it('invalidates podState query on success so home grid refetches', async () => {
    const queryClient = makeQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUploadMeal('pod_demo_01'), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(testAsset);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['podState', 'pod_demo_01'],
      }),
    );
  });

  it('surfaces error message when upload fails', async () => {
    server.use(
      http.post(`${BASE_URL}/api/pods/:podId/images`, () =>
        HttpResponse.json({ error: 'Server Error' }, { status: 500 }),
      ),
    );

    const queryClient = makeQueryClient();
    const { result } = renderHook(() => useUploadMeal('pod_demo_01'), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(testAsset);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('500');
  });
});
