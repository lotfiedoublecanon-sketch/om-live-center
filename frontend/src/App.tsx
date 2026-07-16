import { lazy, Suspense, useEffect, useState } from 'react';
import { CalendarDays, Newspaper, Radio, ScrollText, Shield, UsersRound } from 'lucide-react';
import type { TabId } from './types';
import { useWidgetData } from './hooks/use-widget-data';
import { usePwa } from './hooks/use-pwa';
import { Header } from './components/header';
import { LiveView } from './components/live-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Skeleton } from './components/ui/skeleton';
import { Button } from './components/ui/button';

const SecondaryView = lazy(() => import('./components/secondary-views'));
const tabs: Array<{ id: TabId; label: string; icon: typeof Radio }> = [
  { id: 'live', label: 'Live', icon: Radio }, { id: 'news', label: 'Actus', icon: Newspaper }, { id: 'transfers', label: 'Mercato', icon: ScrollText },
  { id: 'calendar', label: 'Calendrier', icon: CalendarDays }, { id: 'standings', label: 'Classement', icon: Shield }, { id: 'squad', label: 'Effectif', icon: UsersRound },
];

function initialTab(): TabId {
  const hash = window.location.hash.slice(1) as TabId;
  return tabs.some((tab) => tab.id === hash) ? hash : 'live';
}

function InitialSkeleton() {
  return <main className="app-main" aria-label="Chargement des données OM"><div className="skeleton-layout"><Skeleton className="h-[520px]" /><Skeleton className="h-[520px]" /></div><span className="sr-only">Chargement initial</span></main>;
}

export default function App() {
  const [tab, setTab] = useState<TabId>(initialTab);
  const { payload, connection, initialLoading, manualLoading, message, refresh } = useWidgetData();
  const pwa = usePwa();

  useEffect(() => {
    const onHash = () => setTab(initialTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const selectTab = (value: string) => {
    const next = value as TabId;
    setTab(next);
    history.replaceState(null, '', `#${next}`);
  };
  const notify = async () => {
    if (!('Notification' in window)) return;
    await Notification.requestPermission();
  };

  return <div className="app-shell">
    <Header connection={connection} refreshing={manualLoading} installAvailable={pwa.installAvailable} onRefresh={() => void refresh(true)} onInstall={() => void pwa.install()} onNotify={() => void notify()} />
    <Tabs value={tab} onValueChange={selectTab} className="navigation-shell">
      <TabsList aria-label="Sections principales">{tabs.map(({ id, label, icon: Icon }) => <TabsTrigger value={id} key={id}><Icon aria-hidden="true" /><span>{label}</span></TabsTrigger>)}</TabsList>
      {tabs.map(({ id, label }) => <TabsContent className="sr-only" forceMount value={id} key={`panel-${id}`}><span>{label}</span></TabsContent>)}
    </Tabs>
    {initialLoading && !payload ? <InitialSkeleton /> : payload ? <main className="app-main" id="main-content">
      {tab === 'live' ? <LiveView payload={payload} /> : <Suspense fallback={<div className="section-skeleton"><Skeleton className="h-16" /><Skeleton className="h-64" /></div>}><SecondaryView tab={tab} payload={payload} /></Suspense>}
    </main> : <main className="app-main"><div className="fatal-state"><strong>OM Live Center est temporairement hors ligne</strong><p>La connexion sera retentée automatiquement.</p><Button onClick={() => void refresh(true)}>Réessayer</Button></div></main>}
    {message && <div className="toast" role="status" aria-live="polite">{message}</div>}
    {pwa.updateReady && <div className="update-toast" role="status"><span>Une nouvelle version est prête.</span><Button variant="primary" size="sm" onClick={pwa.update}>Mettre à jour</Button></div>}
  </div>;
}
