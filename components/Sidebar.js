'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/', icon: '📊' },
  { label: 'Patients', href: '/patients', icon: '👤' },
  { label: 'Appointments', href: '/appointments', icon: '📅' },
  { label: 'Notifications', href: '/notifications', icon: '🔔' },
  { label: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUserRole(parsed.role);
      } catch (e) { /* ignore */ }
    }
  }, []);

  // Build the full nav list, injecting Revenue after Dashboard for admins
  const fullNav = [...navItems];
  if (userRole === 'admin') {
    fullNav.splice(1, 0, { label: 'Revenue', href: '/dashboard/revenue', icon: '💰' });
  }

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ padding: '24px 12px', display: 'flex', justifyContent: 'center' }}>
          <img src="/assets/logo.png" alt="Victoria Dental Care" style={{ height: '70px', width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
        </div>

        <div className="sidebar-section-label">Menu</div>
        <nav className="sidebar-nav">
          {fullNav.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />
        <div className="sidebar-section-label">Clinic Hours</div>
        <div style={{ padding: '8px 12px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          <div>Mon – Sat: 9:00 AM – 9:00 PM</div>
          <div>Sunday: By appt</div>
        </div>
      </aside>
      <style jsx>{`
        .sidebar-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.3);
          z-index: 99;
        }
        @media (max-width: 1024px) {
          .sidebar-backdrop { display: block; }
        }
      `}</style>
    </>
  );
}
