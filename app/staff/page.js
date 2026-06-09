'use client';
import { useState, useEffect } from 'react';
import Modal from '../../components/Modal';

export default function StaffManagementPage() {
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' or 'permissions'
  const [staff, setStaff] = useState([]);
  const [activities, setActivities] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = import('next/navigation').then(m => m.useRouter()).catch(() => null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.role !== 'admin' && parsed.role !== 'super_admin') {
          window.location.href = '/';
        }
      } catch (e) {
        window.location.href = '/';
      }
    } else {
      window.location.href = '/login';
    }
  }, []);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [staffForm, setStaffForm] = useState({
    id: '',
    name: '',
    username: '',
    email: '',
    phone: '',
    role: 'assistant',
    joining_date: new Date().toISOString().split('T')[0],
    status: 'Active',
    profile_photo: '',
    password: ''
  });

  const rolesList = [
    { id: 'super_admin', name: 'Super Admin' },
    { id: 'admin', name: 'Admin' },
    { id: 'dentist', name: 'Dentist' },
    { id: 'receptionist', name: 'Receptionist' },
    { id: 'accountant', name: 'Accountant' },
    { id: 'assistant', name: 'Assistant' }
  ];

  const modulesList = [
    { id: 'dashboard', name: 'Dashboard', actions: ['view', 'edit'] },
    { id: 'patients', name: 'Patients', actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'appointments', name: 'Appointments', actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'treatments', name: 'Treatments', actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'prescriptions', name: 'Prescriptions', actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'clinical_records', name: 'Clinical Records', actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'billing', name: 'Billing', actions: ['view', 'create', 'refund'] },
    { id: 'inventory', name: 'Inventory', actions: ['view', 'manage'] },
    { id: 'reports', name: 'Reports', actions: ['view', 'export'] }
  ];

  const fetchData = async () => {
    try {
      const [staffRes, actRes, permRes] = await Promise.all([
        fetch('/api/staff').then(res => res.json()),
        fetch('/api/staff/activity').then(res => res.json()),
        fetch('/api/staff/permissions').then(res => res.json())
      ]);

      setStaff(Array.isArray(staffRes) ? staffRes : []);
      setActivities(Array.isArray(actRes) ? actRes : []);
      setPermissions(Array.isArray(permRes) ? permRes : []);
      setLoading(false);
    } catch (err) {
      console.error('[Staff Management] Load failed:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // refresh every 15s to keep online status / logs fresh
    return () => clearInterval(interval);
  }, []);

  // Check if a staff member is online (last_seen_at within 2 minutes)
  const isOnline = (lastSeenStr) => {
    if (!lastSeenStr) return false;
    const lastSeen = new Date(lastSeenStr);
    const diffMs = new Date() - lastSeen;
    return diffMs < 120000; // 2 minutes
  };

  const handleAddStaff = () => {
    setStaffForm({
      id: '',
      name: '',
      username: '',
      email: '',
      phone: '',
      role: 'assistant',
      joining_date: new Date().toISOString().split('T')[0],
      status: 'Active',
      profile_photo: '',
      password: ''
    });
    setShowModal(true);
  };

  const handleEditStaff = (member) => {
    setStaffForm({
      id: member.id,
      name: member.name,
      username: member.username,
      email: member.email || '',
      phone: member.phone || '',
      role: member.role,
      joining_date: member.joining_date || new Date().toISOString().split('T')[0],
      status: member.status || 'Active',
      profile_photo: member.profile_photo || '',
      password: '' // blank means don't change password
    });
    setShowModal(true);
  };

  const handleSaveStaff = async () => {
    if (!staffForm.name || !staffForm.username || (!staffForm.id && !staffForm.password)) {
      alert('Name, Username, and Password (for new staff) are required.');
      return;
    }

    setIsSaving(true);
    const method = staffForm.id ? 'PUT' : 'POST';
    const url = staffForm.id ? `/api/staff/${staffForm.id}` : '/api/staff';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm)
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert('Error saving: ' + (err.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to connect to API');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/staff/${staffForm.id}`, { method: 'DELETE' });
      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        alert('Failed to delete staff member.');
      }
    } catch (err) {
      alert('Failed to delete staff member.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStaffForm({ ...staffForm, profile_photo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // Permissions Matrix Handling
  const getPermissionVal = (roleId, module, action) => {
    const row = permissions.find(p => p.role_id === roleId && p.module === module);
    if (!row) return false;
    const key = `can_${action}`;
    return !!row[key];
  };

  const handleTogglePermission = async (roleId, module, action) => {
    const currentVal = getPermissionVal(roleId, module, action);
    const newVal = !currentVal;

    // Optimistically update UI
    const updatedPermissions = [...permissions];
    const rowIdx = updatedPermissions.findIndex(p => p.role_id === roleId && p.module === module);
    const key = `can_${action}`;

    if (rowIdx >= 0) {
      updatedPermissions[rowIdx][key] = newVal;
    } else {
      updatedPermissions.push({
        role_id: roleId,
        module,
        [key]: newVal
      });
    }
    setPermissions(updatedPermissions);

    // Save to server
    try {
      const matchRow = updatedPermissions.find(p => p.role_id === roleId && p.module === module) || {};
      await fetch('/api/staff/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId,
          module,
          canView: matchRow.can_view,
          canCreate: matchRow.can_create,
          canEdit: matchRow.can_edit,
          canDelete: matchRow.can_delete,
          canRefund: matchRow.can_refund,
          canManage: matchRow.can_manage,
          canExport: matchRow.can_export
        })
      });
    } catch (e) {
      console.error('Failed to save permissions change:', e);
      // Rollback on fail
      fetchData();
    }
  };

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading Staff Dashboard...</div>;

  const activeCount = staff.filter(s => s.status === 'Active').length;
  const onlineCount = staff.filter(s => isOnline(s.last_seen_at)).length;

  return (
    <div className="stagger">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">Configure clinic roles, check activity audits, and set system RBAC policies.</p>
        </div>
        <button className="btn btn-primary" onClick={handleAddStaff}>+ Add Staff Member</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-lg)' }}>
        <button 
          onClick={() => setActiveTab('directory')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'directory' ? '3px solid var(--color-accent)' : '3px solid transparent',
            color: activeTab === 'directory' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'directory' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          👥 Staff Dashboard & Directory
        </button>
        <button 
          onClick={() => setActiveTab('permissions')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'permissions' ? '3px solid var(--color-accent)' : '3px solid transparent',
            color: activeTab === 'permissions' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'permissions' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          🔐 Role Permissions Matrix
        </button>
      </div>

      {activeTab === 'directory' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 'var(--space-lg)' }}>
          {/* Main Directory Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* KPI Cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div className="glass-card stat-card">
                <div className="stat-icon green">👥</div>
                <div className="stat-info">
                  <div className="stat-value">{activeCount}</div>
                  <div className="stat-label">Active Staff Members</div>
                </div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-icon blue">🟢</div>
                <div className="stat-info">
                  <div className="stat-value">{onlineCount}</div>
                  <div className="stat-label">Staff Members Online</div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="glass-card-flat" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Active Staff Directory</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      <th style={{ padding: '12px 20px' }}>Staff Member</th>
                      <th style={{ padding: '12px 20px' }}>Username</th>
                      <th style={{ padding: '12px 20px' }}>Role</th>
                      <th style={{ padding: '12px 20px' }}>Contact</th>
                      <th style={{ padding: '12px 20px' }}>Joined</th>
                      <th style={{ padding: '12px 20px' }}>Status</th>
                      <th style={{ padding: '12px 20px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(s => {
                      const online = isOnline(s.last_seen_at);
                      const roleObj = rolesList.find(r => r.id === s.role) || { name: s.role };
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '0.9rem' }}>
                          <td style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ position: 'relative' }}>
                              {s.profile_photo ? (
                                <img src={s.profile_photo} alt={s.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-accent-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                  {s.name.substring(0,2).toUpperCase()}
                                </div>
                              )}
                              <span style={{ 
                                position: 'absolute', bottom: 0, right: 0, 
                                width: 12, height: 12, borderRadius: '50%', 
                                background: online ? '#34c759' : '#8e8e93', 
                                border: '2px solid var(--color-bg)' 
                              }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{s.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                {online ? 'Online' : s.last_seen_at ? `Active ${new Date(s.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Never seen'}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)' }}>@{s.username}</td>
                          <td style={{ padding: '16px 20px' }}>
                            <span className="badge badge-info">{roleObj.name}</span>
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: '0.8rem' }}>
                            <div>{s.email}</div>
                            <div style={{ color: 'var(--color-text-secondary)' }}>{s.phone || '-'}</div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>{s.joining_date}</td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ 
                              padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                              background: s.status === 'Active' ? 'rgba(52,199,89,0.1)' : 'rgba(255,59,48,0.1)',
                              color: s.status === 'Active' ? '#34c759' : '#ff3b30'
                            }}>{s.status || 'Active'}</span>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleEditStaff(s)}>Edit</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Activity Log sidebar */}
          <div className="glass-card-flat" style={{ padding: '20px', height: 'fit-content' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🕒</span> Recent Staff Activity
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
              {activities.length === 0 ? (
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>No recent activity logged.</div>
              ) : (
                activities.map(log => {
                  const date = new Date(log.created_at);
                  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  let color = 'var(--color-primary)';
                  if (log.action === 'Login') color = '#34c759';
                  if (log.action === 'Logout') color = '#8e8e93';
                  if (log.action === 'Billing Actions') color = '#af52de';
                  if (log.action === 'Inventory Changes') color = '#ff9f0a';

                  return (
                    <div key={log.id} style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
                      <div style={{ width: 4, background: color, borderRadius: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{log.action}: {log.details}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                          {log.staff_name} · {time}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="glass-card-flat" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>Role Permissions matrix</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Configure default granular action permissions for different clinic roles. Changes are saved dynamically.
          </p>

          <div style={{ overflowX: 'auto' }}>
            {rolesList.filter(r => r.id !== 'super_admin').map(role => (
              <div key={role.id} style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-accent)', marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                  🔑 {role.name} Permissions
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '16px' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      <th style={{ padding: '10px 16px', width: '250px' }}>Module / Resource</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center' }}>View</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center' }}>Create</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center' }}>Edit</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center' }}>Delete / Refund / Manage / Export</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modulesList.map(mod => {
                      const hasView = mod.actions.includes('view');
                      const hasCreate = mod.actions.includes('create');
                      const hasEdit = mod.actions.includes('edit');
                      const extraAction = mod.actions.find(a => ['delete', 'refund', 'manage', 'export'].includes(a));

                      return (
                        <tr key={mod.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 500 }}>{mod.name}</td>
                          {/* View Checkbox */}
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {hasView ? (
                              <input 
                                type="checkbox" 
                                checked={getPermissionVal(role.id, mod.id, 'view')} 
                                onChange={() => handleTogglePermission(role.id, mod.id, 'view')}
                                style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                              />
                            ) : '-'}
                          </td>
                          {/* Create Checkbox */}
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {hasCreate ? (
                              <input 
                                type="checkbox" 
                                checked={getPermissionVal(role.id, mod.id, 'create')} 
                                onChange={() => handleTogglePermission(role.id, mod.id, 'create')}
                                style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                              />
                            ) : '-'}
                          </td>
                          {/* Edit Checkbox */}
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {hasEdit ? (
                              <input 
                                type="checkbox" 
                                checked={getPermissionVal(role.id, mod.id, 'edit')} 
                                onChange={() => handleTogglePermission(role.id, mod.id, 'edit')}
                                style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                              />
                            ) : '-'}
                          </td>
                          {/* Delete/Refund/Manage/Export Checkbox */}
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {extraAction ? (
                              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input 
                                  type="checkbox" 
                                  checked={getPermissionVal(role.id, mod.id, extraAction)} 
                                  onChange={() => handleTogglePermission(role.id, mod.id, extraAction)}
                                  style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                                  ({extraAction})
                                </span>
                              </label>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={staffForm.id ? "Edit Staff Account" : "Add New Staff Account"} 
        footer={
          <>
            {staffForm.id && (
              <button className="btn btn-ghost" onClick={handleDeleteStaff} disabled={isSaving} style={{ color: 'var(--color-danger)', marginRight: 'auto' }}>
                Delete Account
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveStaff} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Account'}</button>
          </>
        }
      >
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          {/* Photo upload view */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', marginBottom: 'var(--space-sm)' }}>
            {staffForm.profile_photo ? (
              <img src={staffForm.profile_photo} alt="Profile preview" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-border)' }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '2px dashed var(--color-border)' }}>
                👤
              </div>
            )}
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              Upload Photo
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="grid-2" style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="input-group">
              <label>Full Name</label>
              <input type="text" className="input-field" placeholder="Dr. Sarah Jenkins" value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Username</label>
              <input type="text" className="input-field" placeholder="sjenkins" value={staffForm.username} onChange={e => setStaffForm({ ...staffForm, username: e.target.value })} />
            </div>
          </div>

          <div className="grid-2" style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="input-group">
              <label>Email Address</label>
              <input type="email" className="input-field" placeholder="sarah@clinic.com" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Phone Number</label>
              <input type="tel" className="input-field" placeholder="+91 98765 43210" value={staffForm.phone} onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })} />
            </div>
          </div>

          <div className="grid-2" style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="input-group">
              <label>Role</label>
              <select 
                className="input-field" 
                value={staffForm.role} 
                onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
              >
                {rolesList.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>Status</label>
              <select 
                className="input-field" 
                value={staffForm.status} 
                onChange={e => setStaffForm({ ...staffForm, status: e.target.value })}
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="input-group">
              <label>Joining Date</label>
              <input type="date" className="input-field" value={staffForm.joining_date} onChange={e => setStaffForm({ ...staffForm, joining_date: e.target.value })} />
            </div>
            <div className="input-group">
              <label>{staffForm.id ? "New Password (leave blank to keep)" : "Password"}</label>
              <input type="password" className="input-field" placeholder="••••••••" value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
