import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { PwaUpdateEventDetail } from '../../pwa/registerServiceWorker';

export const PwaOfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(
    typeof window !== 'undefined' ? !window.navigator.onLine : false
  );
  const [updateDetail, setUpdateDetail] = useState<PwaUpdateEventDetail | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<PwaUpdateEventDetail>;
      if (customEvent.detail) {
        setUpdateDetail(customEvent.detail);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pwa-update-available', handleUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pwa-update-available', handleUpdate);
    };
  }, []);

  return (
    <>
      {/* 1. Offline Toast Alert */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="pwa-offline-indicator"
        >
          <WifiOff size={14} />
          <span>Offline Mode — Changes will sync when reconnected</span>
        </div>
      )}

      {/* 2. New App Version Available Notification */}
      {updateDetail && (
        <div className="pwa-update-banner" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={16} style={{ color: '#BF935A' }} />
            <span>A new version of A&F Design is ready.</span>
          </div>
          <button
            onClick={() => updateDetail.reload()}
            className="pwa-update-btn"
          >
            Update
          </button>
        </div>
      )}
    </>
  );
};
