/**
 * Service Worker Registration & PWA Lifecycle Manager
 *
 * Provides:
 * - Safe production registration
 * - Update detection with seamless reload triggering
 * - Session cache purge on sign-out
 * - Connectivity change dispatchers
 */

export interface PwaUpdateEventDetail {
  registration: ServiceWorkerRegistration;
  reload: () => void;
}

export function registerServiceWorker(onUpdateAvailable?: (detail: PwaUpdateEventDetail) => void) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Register only when page finishes loading to avoid delaying initial paint
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[PWA] Service Worker registered with scope:', registration.scope);

      // Check for updates periodically (every 1 hour)
      setInterval(() => {
        registration.update().catch((err) => {
          console.debug('[PWA] Background update check failed:', err);
        });
      }, 60 * 60 * 1000);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          // If a new worker is installed and waiting while an existing one is controlling
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New version of A&F Design is ready.');

            const updateDetail: PwaUpdateEventDetail = {
              registration,
              reload: () => {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              },
            };

            // Dispatch global window event
            window.dispatchEvent(
              new CustomEvent<PwaUpdateEventDetail>('pwa-update-available', {
                detail: updateDetail,
              })
            );

            if (onUpdateAvailable) {
              onUpdateAvailable(updateDetail);
            }
          }
        });
      });

      // Ensure reload occurs when new worker takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    } catch (error) {
      console.warn('[PWA] Service Worker registration failed:', error);
    }
  });
}

/**
 * Notify the Service Worker that user has logged out.
 * This purges volatile caches to prevent cross-account data leakage.
 */
export function purgePwaSessionCache() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_SESSION' });
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Opt-in Web Push Subscription with VAPID key
 */
export async function subscribeUserToPush(
  vapidPublicKey: string,
  authHeaders: Record<string, string>
): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !vapidPublicKey
  ) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    if (subscription) {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(subscription.toJSON()),
      });
      return true;
    }
  } catch (err) {
    console.debug('[PWA] Push subscription skipped or denied:', err);
  }
  return false;
}

