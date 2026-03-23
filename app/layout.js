import '../styles/globals.css';
import AppShell from '../components/AppShell';

export const metadata = {
  title: 'Victoria Dental — Clinic Management System',
  description: 'Premium dental clinic management with Apple-inspired design. Manage patients, appointments, reminders, and more.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
