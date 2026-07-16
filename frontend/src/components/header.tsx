import { Bell, Download, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from './ui/button';
import type { ConnectionState } from '../types';

const labels: Record<ConnectionState, string> = { connecting: 'Connexion', online: 'Connecté', cached: 'Données en cache', offline: 'Hors ligne' };

export function Header({ connection, refreshing, installAvailable, onRefresh, onInstall, onNotify }: {
  connection: ConnectionState; refreshing: boolean; installAvailable: boolean;
  onRefresh: () => void; onInstall: () => void; onNotify: () => void;
}) {
  const online = connection === 'online';
  return <header className="topbar">
    <a className="brand" href="#live">
      <img src="./assets/logo-om-live.svg" alt="" width="46" height="46" />
      <span><strong>OM Live Center</strong><small>Marseille, sans détour</small></span>
    </a>
    <div className="topbar-actions">
      <span className={`connection is-${connection}`} role="status">{online ? <Wifi /> : <WifiOff />}<span>{labels[connection]}</span></span>
      {installAvailable && <Button size="icon" variant="ghost" onClick={onInstall} title="Installer l'application"><Download /><span className="sr-only">Installer</span></Button>}
      <Button size="icon" variant="ghost" onClick={onNotify} title="Activer les notifications"><Bell /><span className="sr-only">Notifications</span></Button>
      <Button size="icon" variant="ghost" onClick={onRefresh} disabled={refreshing} title="Rafraîchir maintenant"><RefreshCw className={refreshing ? 'spin' : ''} /><span className="sr-only">Rafraîchir</span></Button>
    </div>
  </header>;
}
