import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { PwaOfflineBanner } from '../src/components/pwa/PwaOfflineBanner';
import { PwaInstallPrompt } from '../src/components/pwa/PwaInstallPrompt';
import { purgePwaSessionCache } from '../src/pwa/registerServiceWorker';

describe('PWA Architecture & Specification Suite', () => {
  const publicDir = path.resolve(__dirname, '../public');

  beforeEach(() => {
    window.matchMedia = window.matchMedia || vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  describe('1. Web App Manifest Validation', () => {
    it('manifest.json and manifest.webmanifest exist and have valid JSON schema', () => {
      const manifestPath = path.join(publicDir, 'manifest.json');
      const webmanifestPath = path.join(publicDir, 'manifest.webmanifest');

      expect(fs.existsSync(manifestPath)).toBe(true);
      expect(fs.existsSync(webmanifestPath)).toBe(true);

      const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const webmanifestContent = JSON.parse(fs.readFileSync(webmanifestPath, 'utf8'));

      expect(manifestContent).toEqual(webmanifestContent);

      // Identity & Scope
      expect(manifestContent.name).toBe('A&F Design Studio Portal');
      expect(manifestContent.short_name).toBe('A&F Design');
      expect(manifestContent.start_url).toBe('/?source=pwa');
      expect(manifestContent.scope).toBe('/');
      expect(manifestContent.display).toBe('standalone');
      expect(manifestContent.orientation).toBe('any');

      // Luxury Branding Theme
      expect(manifestContent.theme_color).toBe('#BF935A');
      expect(manifestContent.background_color).toBe('#0C0C0D');

      // Icons Array
      expect(Array.isArray(manifestContent.icons)).toBe(true);
      expect(manifestContent.icons.length).toBeGreaterThanOrEqual(4);

      // Check standard 192 and 512
      const icon192 = manifestContent.icons.find((i: any) => i.sizes === '192x192' && i.purpose !== 'maskable');
      const icon512 = manifestContent.icons.find((i: any) => i.sizes === '512x512' && i.purpose !== 'maskable');
      const maskable192 = manifestContent.icons.find((i: any) => i.sizes === '192x192' && i.purpose?.includes('maskable'));
      const maskable512 = manifestContent.icons.find((i: any) => i.sizes === '512x512' && i.purpose?.includes('maskable'));

      expect(icon192).toBeDefined();
      expect(icon512).toBeDefined();
      expect(maskable192).toBeDefined();
      expect(maskable512).toBeDefined();

      // Check shortcuts
      expect(Array.isArray(manifestContent.shortcuts)).toBe(true);
      expect(manifestContent.shortcuts.length).toBeGreaterThanOrEqual(2);
    });

    it('all referenced icon assets exist on filesystem with non-zero size', () => {
      const manifestPath = path.join(publicDir, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      manifest.icons.forEach((icon: any) => {
        const relativeSrc = icon.src.startsWith('/') ? icon.src.slice(1) : icon.src;
        const iconDiskPath = path.join(publicDir, relativeSrc);
        expect(fs.existsSync(iconDiskPath), `Icon missing: ${icon.src}`).toBe(true);
        const stats = fs.statSync(iconDiskPath);
        expect(stats.size).toBeGreaterThan(500); // Valid image asset
      });

      // Apple Touch Icon
      const appleTouchPath = path.join(publicDir, 'apple-touch-icon.png');
      expect(fs.existsSync(appleTouchPath)).toBe(true);
    });
  });

  describe('2. Service Worker Security & Caching Architecture', () => {
    const swPath = path.join(publicDir, 'sw.js');

    it('sw.js exists and implements strict cache bypass for API and sensitive tokens', () => {
      expect(fs.existsSync(swPath)).toBe(true);
      const swCode = fs.readFileSync(swPath, 'utf8');

      // Static assets precache
      expect(swCode).toContain('PRECACHE_ASSETS');
      expect(swCode).toContain('/offline.html');
      expect(swCode).toContain('/manifest.webmanifest');

      // Security: Strictly bypasses API requests and never caches them in shared SW caches
      expect(swCode).toContain("pathname.startsWith('/api/')");
      expect(swCode).toContain("pathname.startsWith('/socket.io/')");
      expect(swCode).toContain("pathname.includes('auth')");
      expect(swCode).toContain("pathname.includes('otp')");
      expect(swCode).toContain("pathname.includes('token')");

      // Session clearance listener on logout
      expect(swCode).toContain('CLEAR_SESSION');
      expect(swCode).toContain('caches.delete');

      // Offline Navigation fallback
      expect(swCode).toContain("caches.match('/offline.html')");
    });

    it('purgePwaSessionCache handles SW message dispatch safely', async () => {
      // Mock navigator.serviceWorker
      const postMessageMock = vi.fn();
      const originalSW = navigator.serviceWorker;

      // @ts-ignore
      delete window.navigator.serviceWorker;
      // @ts-ignore
      window.navigator.serviceWorker = {
        controller: {
          postMessage: postMessageMock,
        },
      };

      await purgePwaSessionCache();
      expect(postMessageMock).toHaveBeenCalledWith({ type: 'CLEAR_SESSION' });

      // Restore
      // @ts-ignore
      window.navigator.serviceWorker = originalSW;
    });
  });

  describe('3. Offline Fallback & Brand Consistency', () => {
    it('offline.html provides studio branding, dark palette, and reconnect logic', () => {
      const offlinePath = path.join(publicDir, 'offline.html');
      expect(fs.existsSync(offlinePath)).toBe(true);

      const html = fs.readFileSync(offlinePath, 'utf8');

      // Branding
      expect(html).toContain('A&F Design');
      expect(html).toContain('Workspace Offline');
      expect(html).toContain('#0C0C0D'); // Dark studio background
      expect(html).toContain('#BF935A'); // Luxury bronze accent

      // Auto-reconnect logic
      expect(html).toContain('window.addEventListener');
      expect(html).toContain("'online'");
    });
  });

  describe('4. PWA UI Components', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('PwaOfflineBanner renders warning when offline and disappears when online', () => {
      // Mock navigator.onLine = false
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      const { rerender } = render(<PwaOfflineBanner />);
      expect(screen.getByText(/Offline Mode/i)).toBeInTheDocument();

      // Go online
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      rerender(<PwaOfflineBanner />);
      expect(screen.queryByText(/Offline Mode/i)).not.toBeInTheDocument();
    });

    it('PwaInstallPrompt renders when beforeinstallprompt fires on desktop/android', () => {
      render(<PwaInstallPrompt />);

      // Initially null
      expect(screen.queryByText(/Install App/i)).not.toBeInTheDocument();

      // Dispatch simulated beforeinstallprompt event
      const event = new Event('beforeinstallprompt');
      Object.assign(event, {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue({ outcome: 'accepted' }),
      });

      act(() => {
        window.dispatchEvent(event);
      });

      expect(screen.getByText(/Install A&F Design App/i)).toBeInTheDocument();
    });
  });
});
