import { getStatusBadge } from '@/lib/data';

export default function Badge({ status, text, className = '' }) {
  const badgeClass = getStatusBadge(status);
  return (
    <span className={`badge ${badgeClass} ${className}`}>
      {text || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
