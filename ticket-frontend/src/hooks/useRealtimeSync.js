import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/apiConfig';

let sharedSocket = null;

/**
 * Returns a singleton Socket.IO client shared across all pages so navigation
 * never opens duplicate WebSocket connections.
 */
export function getSharedRealtimeSocket() {
  if (!sharedSocket) {
    sharedSocket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      autoConnect: true
    });
  }
  return sharedSocket;
}

/**
 * Subscribes a page or component to real-time `workspace_sync` events for the
 * given module names (e.g. ['projects', 'tickets', 'reports']). Whenever any
 * user mutates matching data on the backend, `onSync` is called automatically
 * (debounced) without requiring a page refresh.
 */
export function useRealtimeSync(modules, onSync, debounceMs = 500) {
  const onSyncRef = useRef(onSync);
  const modulesKey = Array.isArray(modules) ? modules.join(',') : String(modules || '');

  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    if (!modulesKey) return undefined;
    const subscribed = new Set(modulesKey.split(',').filter(Boolean));
    const socket = getSharedRealtimeSocket();
    let timerId = null;

    const handleSync = (payload = {}) => {
      const incoming = Array.isArray(payload.modules) ? payload.modules : ['all'];
      const matches = incoming.includes('all') || incoming.some((m) => subscribed.has(m));
      if (!matches) return;

      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        if (typeof onSyncRef.current === 'function') {
          onSyncRef.current(payload);
        }
      }, debounceMs);
    };

    socket.on('workspace_sync', handleSync);
    return () => {
      if (timerId) clearTimeout(timerId);
      socket.off('workspace_sync', handleSync);
    };
  }, [modulesKey, debounceMs]);
}
