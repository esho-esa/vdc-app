'use client';
import { useState } from 'react';
import { ThemeProvider } from './ThemeProvider';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { usePathname } from 'next/navigation';

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <ThemeProvider>
        {children}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="app-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="main-content">
          <div className="page-container">
            {children}
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
