'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/', icon: '📊' },
  { label: 'Patients', href: '/patients', icon: '👤' },
  { label: 'Appointments', href: '/appointments', icon: '📅' },
  { label: 'Inventory', href: '/inventory', icon: '📦' },
  { label: 'Expenses', href: '/expenses', icon: '💸' },
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
  const role = userRole ? userRole.toLowerCase() : null;

  if (role === 'admin' || role === 'super_admin') {
    fullNav.splice(1, 0, { label: 'Revenue', href: '/dashboard/revenue', icon: '💰' });
    fullNav.splice(3, 0, { label: 'Outstanding Payments', href: '/reports/outstanding', icon: '📋' });
    fullNav.splice(4, 0, { label: 'Follow-Ups & Insights', href: '/reports/follow-ups', icon: '📈' });
    fullNav.push({ label: 'Staff Management', href: '/staff', icon: '👥' });
  } else if (role === 'accountant') {
    fullNav.splice(1, 0, { label: 'Revenue', href: '/dashboard/revenue', icon: '💰' });
    fullNav.splice(3, 0, { label: 'Outstanding Payments', href: '/reports/outstanding', icon: '📋' });
  }

  // Filter based on role restrictions
  const filteredNav = fullNav.filter((item) => {
    if (!role) return true; // Show all until role loads

    if (role === 'admin' || role === 'super_admin') return true;

    if (role === 'receptionist') {
      return ['Dashboard', 'Patients', 'Appointments', 'Notifications'].includes(item.label);
    }
    if (role === 'dentist') {
      return ['Dashboard', 'Patients', 'Expenses', 'Notifications'].includes(item.label);
    }
    if (role === 'accountant') {
      return ['Dashboard', 'Patients', 'Revenue', 'Outstanding Payments', 'Expenses', 'Reports', 'Notifications'].includes(item.label);
    }
    if (role === 'assistant') {
      return ['Dashboard', 'Patients', 'Appointments', 'Notifications'].includes(item.label);
    }
    
    return false;
  });


  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ padding: '24px 12px', display: 'flex', justifyContent: 'center' }}>
          <img src="/assets/logo.png" alt="Victoria Dental Care" style={{ height: '70px', width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
        </div>

        <div className="sidebar-section-label">Menu</div>
        <nav className="sidebar-nav">
          {filteredNav.map((item) => {
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
