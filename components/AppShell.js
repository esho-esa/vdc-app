'use client';
import { useState, useEffect } from 'react';
import { ThemeProvider } from './ThemeProvider';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { usePathname, useRouter } from 'next/navigation';

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (isLoginPage) return;

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // Call heartbeat immediately and then every 30 seconds
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/auth/heartbeat', { method: 'POST' });
      } catch (e) {
        console.warn('[Heartbeat] Polling failed:', e.message);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [isLoginPage]);

  if (isLoginPage) {
    return (
      <ThemeProvider>
        {children}
      </ThemeProvider>
    );
  }

  const role = user?.role ? user.role.toLowerCase() : null;

  // Route-based checks matching user permissions
  const isAuthorized = () => {
    if (!role) return true; // Allow rendering during role loading transition

    if (role === 'admin' || role === 'super_admin') return true;

    if (pathname.startsWith('/staff')) {
      return false;
    }

    if (pathname.startsWith('/inventory')) {
      return false;
    }

    if (pathname.startsWith('/settings')) {
      return false;
    }

    if (pathname.startsWith('/reports')) {
      return role === 'accountant';
    }

    if (pathname.startsWith('/appointments')) {
      return role === 'receptionist' || role === 'assistant';
    }

    return true;
  };

  const authorized = isAuthorized();

  return (
    <ThemeProvider>
      <div className="app-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="main-content">
          <div className="page-container">
            {authorized ? (
              children
            ) : (
              <div className="glass-card stagger" style={{ 
                padding: 'var(--space-2xl)', 
                textAlign: 'center', 
                maxWidth: '600px', 
                margin: '100px auto',
                borderRadius: '16px',
                border: '1px solid rgba(255,59,48,0.2)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🚫</div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: 'var(--space-sm)' }}>Access Denied</h1>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                  You do not have the required permissions to view this section ({pathname}). If you believe this is an error, please contact your clinic administrator.
                </p>
                <button className="btn btn-primary" onClick={() => router.push('/')}>Go to Dashboard</button>
              </div>
            )}
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}

