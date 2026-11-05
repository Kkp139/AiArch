import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsive, getResponsiveState } from '../src/hooks/useResponsive';

function setWindowSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

describe('useResponsive Hook & Breakpoint Utility', () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;

  afterEach(() => {
    act(() => {
      setWindowSize(originalWidth, originalHeight);
    });
    vi.restoreAllMocks();
  });

  describe('Breakpoint boundary values (getResponsiveState)', () => {
    it('correctly identifies Mobile (< 768px)', () => {
      const state390 = getResponsiveState(390, 844);
      expect(state390.isMobile).toBe(true);
      expect(state390.isTablet).toBe(false);
      expect(state390.isDesktop).toBe(false);
      expect(state390.isLargeDesktop).toBe(false);
      expect(state390.is4K).toBe(false);
      expect(state390.width).toBe(390);
      expect(state390.height).toBe(844);

      const state767 = getResponsiveState(767, 1000);
      expect(state767.isMobile).toBe(true);
      expect(state767.isTablet).toBe(false);
      expect(state767.isDesktop).toBe(false);
    });

    it('correctly identifies Tablet (768px - 1023px)', () => {
      const state768 = getResponsiveState(768, 1024);
      expect(state768.isMobile).toBe(false);
      expect(state768.isTablet).toBe(true);
      expect(state768.isDesktop).toBe(false);
      expect(state768.isLargeDesktop).toBe(false);
      expect(state768.is4K).toBe(false);

      const state1023 = getResponsiveState(1023, 768);
      expect(state1023.isMobile).toBe(false);
      expect(state1023.isTablet).toBe(true);
      expect(state1023.isDesktop).toBe(false);
    });

    it('correctly identifies Standard Desktop / Laptop (1024px - 1439px)', () => {
      const state1024 = getResponsiveState(1024, 768);
      expect(state1024.isMobile).toBe(false);
      expect(state1024.isTablet).toBe(false);
      expect(state1024.isDesktop).toBe(true);
      expect(state1024.isLargeDesktop).toBe(false);
      expect(state1024.is4K).toBe(false);

      const state1439 = getResponsiveState(1439, 900);
      expect(state1439.isDesktop).toBe(true);
      expect(state1439.isLargeDesktop).toBe(false);
      expect(state1439.is4K).toBe(false);
    });

    it('correctly identifies Large Desktop (1440px - 1919px)', () => {
      const state1440 = getResponsiveState(1440, 900);
      expect(state1440.isMobile).toBe(false);
      expect(state1440.isTablet).toBe(false);
      expect(state1440.isDesktop).toBe(true);
      expect(state1440.isLargeDesktop).toBe(true);
      expect(state1440.is4K).toBe(false);

      const state1919 = getResponsiveState(1919, 1080);
      expect(state1919.isDesktop).toBe(true);
      expect(state1919.isLargeDesktop).toBe(true);
      expect(state1919.is4K).toBe(false);
    });

    it('correctly identifies 4K / Ultra-wide (>= 1920px)', () => {
      const state1920 = getResponsiveState(1920, 1080);
      expect(state1920.isDesktop).toBe(true);
      expect(state1920.isLargeDesktop).toBe(true);
      expect(state1920.is4K).toBe(true);

      const state3840 = getResponsiveState(3840, 2160);
      expect(state3840.isDesktop).toBe(true);
      expect(state3840.isLargeDesktop).toBe(true);
      expect(state3840.is4K).toBe(true);
    });
  });

  describe('useResponsive Hook dynamic lifecycle', () => {
    it('returns the current viewport dimensions on initial render', () => {
      act(() => {
        setWindowSize(1200, 800);
      });
      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(1200);
      expect(result.current.height).toBe(800);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
    });

    it('reactively updates state when window resize events occur', () => {
      act(() => {
        setWindowSize(1280, 800);
      });
      const { result } = renderHook(() => useResponsive());
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);

      act(() => {
        setWindowSize(500, 900);
      });

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.width).toBe(500);
      expect(result.current.height).toBe(900);

      act(() => {
        setWindowSize(800, 600);
      });

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);

      act(() => {
        setWindowSize(2560, 1440);
      });

      expect(result.current.is4K).toBe(true);
      expect(result.current.isLargeDesktop).toBe(true);
      expect(result.current.isDesktop).toBe(true);
    });

    it('respects debounceMs option when provided', () => {
      vi.useFakeTimers();
      act(() => {
        setWindowSize(1024, 768);
      });

      const { result } = renderHook(() => useResponsive({ debounceMs: 150 }));
      expect(result.current.width).toBe(1024);

      act(() => {
        setWindowSize(600, 800);
      });

      // Still at previous value before debounce period
      expect(result.current.width).toBe(1024);

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current.width).toBe(600);
      expect(result.current.isMobile).toBe(true);

      vi.useRealTimers();
    });

    it('cleans up resize listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useResponsive());

      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });
});
