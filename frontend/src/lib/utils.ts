import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) { return clsx(inputs); }

export function formatDateTime(value?: string): string {
  if (!value) return 'Horaire à confirmer';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Horaire à confirmer';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export function formatTime(value?: string): string {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? 'inconnue' : date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function relativeDate(value?: string): string {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.round((date.getTime() - Date.now()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  return Math.abs(hours) < 24 ? formatter.format(hours, 'hour') : formatter.format(Math.round(hours / 24), 'day');
}

export function safeUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export const statusLabel = (status?: string) => ({
  LIVE: 'En direct', HALF_TIME: 'Mi-temps', SCHEDULED: 'À venir', FINISHED: 'Terminé', POSTPONED: 'Reporté', SUSPENDED: 'Suspendu', UNAVAILABLE: 'En attente',
}[status || ''] || 'En attente');

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'OM';
}
