// src/hooks/useAppRating.js
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

export function useAppRating() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const checkRating = async () => {
      const rated = localStorage.getItem('app_rated');
      if (rated) return;

      const installDate = localStorage.getItem('install_date');
      const sessions = parseInt(localStorage.getItem('session_count') || '0', 10);
      
      if (!installDate) {
        localStorage.setItem('install_date', new Date().toISOString());
      } else {
        const daysSinceInstall = (new Date() - new Date(installDate)) / (1000 * 60 * 60 * 24);
        if (daysSinceInstall >= 7 && sessions >= 5) {
          // This would typically trigger a native prompt using a plugin like @capacitor/app-review
          // For now, we'll use a toast fallback, but you should install the native plugin
          toast((t) => (
            <div>
              <p>Are you enjoying Najah? Please rate us!</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button onClick={() => { localStorage.setItem('app_rated', 'true'); toast.dismiss(t.id); }} style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--primary)', color: '#fff', border: 'none' }}>Sure!</button>
                <button onClick={() => toast.dismiss(t.id)} style={{ padding: '4px 8px', borderRadius: '4px', background: 'transparent', border: '1px solid var(--border)' }}>Later</button>
              </div>
            </div>
          ), { duration: Infinity });
        }
      }
      
      localStorage.setItem('session_count', (sessions + 1).toString());
    };

    checkRating();
  }, []);
}
