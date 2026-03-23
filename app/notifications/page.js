'use client';
import { useState, useEffect } from 'react';

const tabs = ['All', 'Missed', 'Upcoming', 'Reminders', 'Alerts'];
const typeMap = { Missed: 'missed', Upcoming: 'upcoming', Reminders: 'reminder', Alerts: 'alert' };
const icons = { missed: '⚠️', upcoming: '📅', reminder: '💬', alert: '🔔' };
const iconBgs = { missed: 'var(--color-danger-light)', upcoming: 'var(--color-accent-light)', reminder: 'var(--color-success-light)', alert: 'var(--color-warning-light)' };

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifs();
  }, []);

  async function fetchNotifs() {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = activeTab === 'All' ? notifs : notifs.filter(n => n.type === typeMap[activeTab]);

  async function markAllRead() {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      setNotifs(notifs.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  }

  async function clearAll() {
    if (!confirm('Are you sure you want to clear all notifications?')) return;
    try {
      await fetch('/api/notifications?all=true', {
        method: 'DELETE'
      });
      setNotifs([]);
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteNotif(e, id) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE'
      });
      setNotifs(notifs.filter(n => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  async function markRead(id) {
    const notif = notifs.find(n => n.id === id);
    if (notif.read) return;

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: true })
      });
      setNotifs(notifs.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error(e);
    }
  }

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <div className="stagger">
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          {notifs.length > 0 && (
            <button className="btn btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={clearAll}>Clear All</button>
          )}
          {unreadCount > 0 && (
            <button className="btn btn-ghost" onClick={markAllRead}>Mark All Read</button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="tabs">
          {tabs.map(tab => (
            <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </div>
      </div>

      <div className="glass-card-flat">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-title">No notifications</div>
            <div className="empty-state-desc">You&apos;re all caught up!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map(n => (
              <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`} onClick={() => markRead(n.id)}>
                <div className="notification-icon" style={{ background: iconBgs[n.type] }}>
                  {icons[n.type]}
                </div>
                <div className="notification-content">
                  <div className="notification-title">
                    {n.title}
                    {!n.read && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)', marginLeft: 8, verticalAlign: 'middle' }} />}
                  </div>
                  <div className="notification-desc">{n.message}</div>
                </div>
                <div className="notification-time">
                  {n.time}
                  <button 
                    className="delete-btn" 
                    onClick={(e) => deleteNotif(e, n.id)}
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style jsx global>{`
        .notification-time {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }
        .delete-btn {
          opacity: 0;
          padding: 4px;
          border-radius: 4px;
          color: var(--color-text-tertiary);
          transition: all 0.2s;
        }
        .notification-item:hover .delete-btn {
          opacity: 1;
        }
        .delete-btn:hover {
          background: var(--color-danger-light);
          color: var(--color-danger);
        }
      `}</style>
    </div>
  );
}
