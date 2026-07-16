import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwa() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let refreshing = false;
    const controllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', controllerChange);
    const register = () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).then((current) => {
        setRegistration(current);
        if (current.waiting) setUpdateReady(true);
        current.addEventListener('updatefound', () => {
          current.installing?.addEventListener('statechange', () => {
            if (current.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
          });
        });
      }).catch(() => undefined);
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', controllerChange);
      window.removeEventListener('load', register);
    };
  }, []);

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', beforeInstall);
  }, []);

  const update = () => registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };
  return { updateReady, installAvailable: Boolean(installPrompt), update, install };
}
