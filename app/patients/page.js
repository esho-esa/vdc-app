'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Modal from '../../components/Modal';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', email: '', age: '', address: '', medicalHistory: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [view, setView] = useState('list'); // 'list' or 'bin'

  async function fetchPatients(isBin = false) {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients${isBin ? '?bin=true' : ''}`);
      const data = await res.json();
      setPatients(data);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPatients(view === 'bin');
  }, [view]);

  async function handleDeletePatient() {
    if (!patientToDelete) return;
    setIsSubmitting(true);
    const permanent = view === 'bin';
    try {
      const res = await fetch(`/api/patients/${patientToDelete.id}${permanent ? '?permanent=true' : ''}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPatients(patients.filter(p => p.id !== patientToDelete.id));
        setShowDeleteModal(false);
        setPatientToDelete(null);
      } else {
        alert('Failed to delete patient');
      }
    } catch (error) {
      console.error(error);
      alert('Error deleting patient');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRestorePatient(e, patientId) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/patients/${patientId}/restore`, {
        method: 'POST'
      });
      if (res.ok) {
        setPatients(patients.filter(p => p.id !== patientId));
      }
    } catch (error) {
      console.error('Restore failed:', error);
    }
  }

  function confirmDelete(e, patient) {
    e.preventDefault();
    e.stopPropagation();
    setPatientToDelete(patient);
    setShowDeleteModal(true);
  }

  async function handleAddPatient() {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient)
      });
      if (res.ok) {
        const addedPatient = await res.json();
        setPatients([addedPatient, ...patients]);
        setShowModal(false);
        setNewPatient({ name: '', phone: '', email: '', age: '', address: '', medicalHistory: '' });
      } else {
        alert('Failed to add patient');
      }
    } catch (error) {
      console.error(error);
      alert('Error saving patient');
    } finally {
      setIsSubmitting(false);
    }
  }

  const filtered = patients.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search)
  );

  const colors = [
    'linear-gradient(135deg, #007aff, #5ac8fa)',
    'linear-gradient(135deg, #34c759, #30d158)',
    'linear-gradient(135deg, #af52de, #5e5ce6)',
    'linear-gradient(135deg, #ff9f0a, #ff6723)',
    'linear-gradient(135deg, #ff3b30, #ff453a)',
    'linear-gradient(135deg, #5ac8fa, #007aff)',
    'linear-gradient(135deg, #ff6723, #ff9f0a)',
    'linear-gradient(135deg, #5e5ce6, #af52de)',
  ];

  return (
    <div className="stagger">
      <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
        <div>
          <h1 className="page-title">Patients {view === 'bin' && <span style={{ color: 'var(--color-danger)' }}>(Bin)</span>}</h1>
          <p className="page-subtitle">Manage your clinic&apos;s patient records and history</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <button className={`btn ${view === 'bin' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView(view === 'list' ? 'bin' : 'list')}>
            {view === 'list' ? '🗑️ View Bin' : '⬅️ Back to List'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Patient
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-lg)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
        <div className="glass-card stat-card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: '20px' }}>
          <div style={{ 
            width: 48, height: 48, borderRadius: 'var(--radius-lg)', 
            background: 'var(--color-accent-light)', color: 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
          }}>👤</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{patients.length}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {view === 'bin' ? 'Deleted Patients' : 'Active Patients'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <input
          type="text"
          className="input-field input-search"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 480 }}
        />
      </div>

      <div className="grid-3" style={{ gap: 'var(--space-md)' }}>
        {filtered.map((patient, i) => (
          <Link key={patient.id} href={`/patients/${patient.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="glass-card" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-lg)',
                  background: colors[i % colors.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 600, fontSize: '1rem', flexShrink: 0,
                }}>{patient.name ? patient.name.substring(0, 2).toUpperCase() : 'UI'}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{patient.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Age: {patient.age}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                  {view === 'bin' ? (
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={(e) => handleRestorePatient(e, patient.id)}
                      style={{ color: 'var(--color-success)', padding: '6px' }}
                      title="Restore Patient"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    </button>
                  ) : null}
                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={(e) => confirmDelete(e, patient)}
                    style={{ color: 'var(--color-danger)', padding: '6px' }}
                    title={view === 'bin' ? 'Permanent Delete' : 'Delete Patient'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {patient.phone}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {patient.email}
                </div>
              </div>
              {patient.medicalHistory !== 'None' && patient.medicalHistory !== 'No known allergies' && (
                <div style={{ marginTop: 'var(--space-sm)' }}>
                  <span className="badge badge-pending" style={{ fontSize: '0.6875rem' }}>⚕️ {patient.medicalHistory}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">{view === 'bin' ? '🗑️' : '🔍'}</div>
          <div className="empty-state-title">No patients found {view === 'bin' ? 'in bin' : ''}</div>
          <div className="empty-state-desc">{view === 'bin' ? 'The trash is empty.' : 'Try adjusting your search or add a new patient'}</div>
        </div>
      )}

      {/* Add Patient Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Patient" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isSubmitting}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddPatient} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Add Patient'}</button>
        </>
      }>
        <div className="grid-2">
          <div className="input-group">
            <label>Full Name</label>
            <input type="text" className="input-field" placeholder="John Doe" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Age</label>
            <input type="number" className="input-field" placeholder="35" value={newPatient.age} onChange={e => setNewPatient({...newPatient, age: e.target.value})} />
          </div>
        </div>
        <div className="input-group">
          <label>Phone Number</label>
          <input type="tel" className="input-field" placeholder="+1 (555) 000-0000" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} />
        </div>
        <div className="input-group">
          <label>Email Address</label>
          <input type="email" className="input-field" placeholder="john@email.com" value={newPatient.email} onChange={e => setNewPatient({...newPatient, email: e.target.value})} />
        </div>
        <div className="input-group">
          <label>Address</label>
          <textarea className="input-field" placeholder="Full address..." rows={2} value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} />
        </div>
        <div className="input-group">
          <label>Medical History</label>
          <textarea className="input-field" placeholder="Allergies, conditions, medications..." rows={3} value={newPatient.medicalHistory} onChange={e => setNewPatient({...newPatient, medicalHistory: e.target.value})} />
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
        title={view === 'bin' ? 'Permanently Delete Patient' : 'Move to Bin'} 
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={isSubmitting}>Cancel</button>
            <button className="btn btn-primary" style={{ background: 'var(--color-danger)' }} onClick={handleDeletePatient} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : view === 'bin' ? 'Delete Permanently' : 'Move to Bin'}
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: 'var(--space-md) 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>{view === 'bin' ? '⚠️' : '🗑️'}</div>
          <h3 style={{ marginBottom: 'var(--space-xs)' }}>{view === 'bin' ? 'Are you sure?' : 'Move to trash bin?'}</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
            {view === 'bin' 
              ? `This will permanently delete ${patientToDelete?.name} and all records. This cannot be undone.`
              : `${patientToDelete?.name} will be moved to the bin. You can restore them later.`}
          </p>
        </div>
      </Modal>
    </div>
  );
}
