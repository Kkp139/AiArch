import { useState, useEffect } from 'react';

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  is4K: boolean;
  width: number;
  height: number;
}

export function getResponsiveState(width: number, height: number): ResponsiveState {
  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    isLargeDesktop: width >= 1440,
    is4K: width >= 1920,
    width,
    height,
  };
}

export function useResponsive(options?: { debounceMs?: number }): ResponsiveState {
  const debounceMs = options?.debounceMs ?? 0;

  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window !== 'undefined') {
      return getResponsiveState(window.innerWidth, window.innerHeight);
    }
    return getResponsiveState(1200, 800);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      const update = () => {
        setState(getResponsiveState(window.innerWidth, window.innerHeight));
      };

      if (debounceMs > 0) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(update, debounceMs);
      } else {
        update();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [debounceMs]);

  return state;
}
