import { CircleOff } from 'lucide-react';
export function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="empty-state" role="status"><CircleOff aria-hidden="true" /><strong>{title}</strong><p>{message}</p></div>;
}
