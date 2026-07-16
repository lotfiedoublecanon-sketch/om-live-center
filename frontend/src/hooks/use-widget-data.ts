import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectionState, WidgetPayload } from '../types';
import { readStoredPayload, reconcilePayload, refreshDelay, storePayload } from '../lib/widget';

const API_URL = '/api/om/widget';

function validPayload(value: unknown): value is WidgetPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<WidgetPayload>;
  return Boolean(payload.hero && Array.isArray(payload.sources) && Array.isArray(payload.squad));
}

export function useWidgetData() {
  const [payload, setPayload] = useState<WidgetPayload | null>(() => readStoredPayload());
  const [connection, setConnection] = useState<ConnectionState>(payload ? 'cached' : 'connecting');
  const [initialLoading, setInitialLoading] = useState(!payload);
  const [manualLoading, setManualLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const payloadRef = useRef(payload);
  const busyRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const mountedRef = useRef(true);

  const refresh = useCallback(async (manual = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (manual) setManualLoading(true);
    window.clearTimeout(timerRef.current);
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 9_000);
    try {
      const response = await fetch(API_URL, { cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: unknown = await response.json();
      if (!validPayload(data)) throw new Error('Payload invalide');
      const next = reconcilePayload(payloadRef.current, data);
      payloadRef.current = next;
      storePayload(next);
      if (mountedRef.current) {
        setPayload(next);
        setConnection(next.sources.some((source) => source.status === 'STALE') ? 'cached' : 'online');
        if (manual) setMessage('Données actualisées');
      }
    } catch {
      if (mountedRef.current) {
        setConnection(payloadRef.current ? 'cached' : 'offline');
        if (manual) setMessage(payloadRef.current ? 'Serveur indisponible, dernières données conservées' : 'Serveur temporairement indisponible');
      }
    } finally {
      window.clearTimeout(timeout);
      controllerRef.current = null;
      busyRef.current = false;
      if (mountedRef.current) {
        setInitialLoading(false);
        setManualLoading(false);
        timerRef.current = window.setTimeout(() => void refresh(false), refreshDelay(payloadRef.current));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh(false);
    const online = () => void refresh(false);
    const offline = () => setConnection(payloadRef.current ? 'cached' : 'offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(timerRef.current);
      controllerRef.current?.abort();
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [refresh]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 3_000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  return { payload, connection, initialLoading, manualLoading, message, refresh };
}
