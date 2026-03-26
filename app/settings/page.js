'use client';
import { useState, useEffect } from 'react';
import Modal from '../../components/Modal';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    clinicName: '', tagline: '', phone: '', email: '', 
    address: '', accentColor: '#007aff', whatsappEnabled: true, whatsappNumber: '',
    reminderTemplate: ''
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({ id: '', name: '', username: '', email: '', role: '', password: '' });
  const [isStaffSaving, setIsStaffSaving] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    
    Promise.all([
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/staff').then(res => res.json())
    ]).then(([settingsData, staffData]) => {
      if (!settingsData.error) {
        setSettings({
          clinicName: settingsData.clinic_name || '',
          tagline: settingsData.tagline || '',
          phone: settingsData.phone || '',
          email: settingsData.email || '',
          address: settingsData.address || '',
          accentColor: settingsData.accent_color || '#007aff',
          whatsappEnabled: Boolean(settingsData.whatsapp_enabled),
          whatsappNumber: settingsData.whatsapp_business_number || settingsData.whatsapp_number || '',
          reminderTemplate: settingsData.whatsapp_template || settingsData.reminder_template || ''
        });
      }
      setStaff(staffData.error ? [] : staffData);
      setLoading(false);
    }).catch(console.error);
  }, []);

  async function handleSaveSettings() {
    setIsSaving(true);
    try {
      const payload = {
        clinic_name: settings.clinicName,
        tagline: settings.tagline,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        accent_color: settings.accentColor,
        whatsapp_enabled: settings.whatsappEnabled,
        whatsapp_business_number: settings.whatsappNumber,
        whatsapp_template: settings.reminderTemplate,
      };

      console.log('[Settings] Saving:', payload);

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      console.log('[Settings] Response:', result);

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        console.error('[Settings] Save failed:', result);
        alert('Failed to save settings: ' + (result.error || 'Unknown error'));
      }
    } catch(err) {
      console.error('[Settings] Network error:', err);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }

  function handleAddStaff() {
    if (currentUser?.role !== 'admin') {
      alert('Only administrators can add staff accounts.');
      return;
    }
    setStaffForm({ id: '', name: '', username: '', email: '', role: 'Dentist', password: '' });
    setShowStaffModal(true);
  }

  function handleEditStaff(s) {
    if (currentUser?.role !== 'admin') {
      alert('Only administrators can edit staff accounts.');
      return;
    }
    setStaffForm({ id: s.id, name: s.name, username: s.username || '', email: s.email, role: s.role, password: '' });
    setShowStaffModal(true);
  }

  async function handleSaveStaff() {
    setIsStaffSaving(true);
    const method = staffForm.id ? 'PUT' : 'POST';
    const url = staffForm.id ? `/api/staff/${staffForm.id}` : '/api/staff';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm)
      });
      if (res.ok) {
        const savedStaff = await res.json();
        if (staffForm.id) {
          setStaff(staff.map(s => s.id === staffForm.id ? savedStaff : s));
        } else {
          setStaff([...staff, savedStaff]);
        }
        setShowStaffModal(false);
      }
    } catch(err) {
      alert('Error saving staff');
    } finally {
      setIsStaffSaving(false);
    }
  }

  async function handleDeleteStaff() {
    if (!staffForm.id) return;
    if (!confirm('Are you sure you want to delete this staff account?')) return;
    setIsStaffSaving(true);
    try {
      const res = await fetch(`/api/staff/${staffForm.id}`, { method: 'DELETE' });
      if (res.ok) {
        setStaff(staff.filter(s => s.id !== staffForm.id));
        setShowStaffModal(false);
      }
    } catch(err) {
      alert('Error deleting');
    } finally {
      setIsStaffSaving(false);
    }
  }

  const accentColors = [
    { name: 'Blue', value: '#007aff' },
    { name: 'Purple', value: '#af52de' },
    { name: 'Green', value: '#34c759' },
    { name: 'Orange', value: '#ff9f0a' },
    { name: 'Pink', value: '#ff2d55' },
    { name: 'Teal', value: '#5ac8fa' },
  ];

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading Settings...</div>;

  return (
    <div className="stagger">
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your clinic preferences</p>
        </div>
        <button className="btn btn-primary" onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', maxWidth: 800 }}>
        {/* Clinic Information */}
        <div className="glass-card-flat">
          <h2 className="section-title" style={{ marginBottom: 'var(--space-lg)' }}>Clinic Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="grid-2">
              <div className="input-group">
                <label>Clinic Name</label>
                <input type="text" className="input-field" value={settings.clinicName} onChange={e => setSettings({...settings, clinicName: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Tagline</label>
                <input type="text" className="input-field" value={settings.tagline} onChange={e => setSettings({...settings, tagline: e.target.value})} />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Phone</label>
                <input type="tel" className="input-field" value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Email</label>
                <input type="email" className="input-field" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} />
              </div>
            </div>
            <div className="input-group">
              <label>Address</label>
              <input type="text" className="input-field" value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Theme & Appearance */}
        <div className="glass-card-flat">
          <h2 className="section-title" style={{ marginBottom: 'var(--space-lg)' }}>Theme & Appearance</h2>
          <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
            <label>Accent Color</label>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 4 }}>
              {accentColors.map(c => (
                <button
                  key={c.value}
                  onClick={() => setSettings({...settings, accentColor: c.value})}
                  style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-md)',
                    background: c.value, border: settings.accentColor === c.value ? '3px solid var(--color-text-primary)' : '3px solid transparent',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    boxShadow: settings.accentColor === c.value ? '0 0 0 2px var(--color-bg)' : 'none',
                  }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* WhatsApp Integration */}
        <div className="glass-card-flat">
          <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
            <h2 className="section-title">WhatsApp Reminders</h2>
            <label className="toggle">
              <input type="checkbox" checked={settings.whatsappEnabled} onChange={e => setSettings({...settings, whatsappEnabled: e.target.checked})} />
              <span className="toggle-slider" />
            </label>
          </div>
          {settings.whatsappEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label>WhatsApp Business Number</label>
                <input type="tel" className="input-field" value={settings.whatsappNumber} onChange={e => setSettings({...settings, whatsappNumber: e.target.value})} />
              </div>
              <div style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', fontSize: '0.875rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--color-accent)', marginBottom: 12 }}>💬 Reminder Template</div>
                <textarea 
                  className="input-field" 
                  rows={8} 
                  style={{ fontFamily: 'monospace', fontSize: '0.8125rem', background: 'rgba(0,0,0,0.2)' }}
                  value={settings.reminderTemplate} 
                  onChange={e => setSettings({...settings, reminderTemplate: e.target.value})}
                  placeholder="Enter your WhatsApp message template..."
                />
                <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Use <b>[Name]</b>, <b>[Date]</b>, and <b>[Time]</b> as placeholders for patient details.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Data & Backup */}
        <div className="glass-card-flat">
          <h2 className="section-title" style={{ marginBottom: 'var(--space-lg)' }}>Data & Backup</h2>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => window.location.href = '/api/backup/export'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              Download Full Database Backup
            </button>
          </div>
        </div>

        {/* Staff */}
        <div className="glass-card-flat">
          <h2 className="section-title" style={{ marginBottom: 'var(--space-lg)' }}>Staff Accounts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {staff.length === 0 ? (
              <div style={{ padding: 'var(--space-md)', color: 'var(--color-text-secondary)' }}>No staff members found.</div>
            ) : (
              staff.map(s => {
                const initials = s.name ? s.name.substring(0, 2).toUpperCase() : 'U';
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-secondary)' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 'var(--radius-md)',
                      background: 'var(--color-accent-gradient)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 600, fontSize: '0.8125rem', flexShrink: 0,
                    }}>{initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{s.name}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{s.role} · {s.email}</div>
                    </div>
                    {currentUser?.role === 'admin' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEditStaff(s)}>Edit</button>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {currentUser?.role === 'admin' && (
            <button className="btn btn-secondary" style={{ marginTop: 'var(--space-md)' }} onClick={handleAddStaff}>+ Add Staff Member</button>
          )}
        </div>
      </div>

      {/* Staff Modal */}
      <Modal isOpen={showStaffModal} onClose={() => setShowStaffModal(false)} title={staffForm.id ? "Edit Staff Account" : "New Staff Account"} footer={
        <>
          {staffForm.id && (
            <button className="btn btn-ghost" onClick={handleDeleteStaff} disabled={isStaffSaving} style={{ color: 'var(--color-danger)', marginRight: 'auto' }}>Delete</button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowStaffModal(false)} disabled={isStaffSaving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveStaff} disabled={isStaffSaving}>{isStaffSaving ? 'Saving...' : 'Save Account'}</button>
        </>
      }>
        <div className="input-group">
          <label>Full Name</label>
          <input type="text" className="input-field" placeholder="Dr. Sarah Johnson" value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} />
        </div>
        <div className="input-group">
          <label>Email Address</label>
          <input type="email" className="input-field" placeholder="sarah@clinic.com" value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} />
        </div>
        <div className="input-group">
          <label>Username</label>
          <input type="text" className="input-field" placeholder="sjohnson" value={staffForm.username} onChange={e => setStaffForm({...staffForm, username: e.target.value})} />
        </div>
        <div className="input-group">
          <label>Role</label>
          <input type="text" className="input-field" placeholder="Dentist, Hygienist, Reception..." value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})} />
        </div>
        <div className="input-group">
          <label>{staffForm.id ? "New Password (leave blank to keep current)" : "Password"}</label>
          <input type="password" className="input-field" placeholder="••••••••" value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})} />
        </div>
      </Modal>
    </div>
  );
}
