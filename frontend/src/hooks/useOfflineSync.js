// src/hooks/useOfflineSync.js
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getQueue, removeFromQueue } from '../utils/offlineStorage';
import api from '../api/index'; // assuming this is where your axios instance is

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      toast.success('Back online! Syncing data...');
      await syncData();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline. Changes will be saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncData = async () => {
    const queue = await getQueue();
    if (queue.length === 0) return;

    let successCount = 0;
    for (const item of queue) {
      try {
        await api({
          method: item.method,
          url: item.url,
          data: item.data
        });
        await removeFromQueue(item.id);
        successCount++;
      } catch (err) {
        console.error('Failed to sync item', item, err);
      }
    }
    
    if (successCount > 0) {
      toast.success(`Synced ${successCount} offline actions!`);
    }
  };

  return { isOnline, syncData };
}
