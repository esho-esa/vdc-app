// Utility functions for the dental clinic app

export function getTypeColor(type) {
  const map = { checkup: 'blue', cleaning: 'green', treatment: 'orange', surgery: 'red', consultation: 'purple' };
  return map[type] || 'blue';
}

export function getStatusBadge(status) {
  const map = {
    confirmed: 'badge-confirmed',
    pending: 'badge-pending',
    cancelled: 'badge-cancelled',
    completed: 'badge-info',
    checkin: 'badge-info',
    engaged: 'badge-pending',
    checkout: 'badge-confirmed',
  };
  return map[status] || 'badge-info';
}
