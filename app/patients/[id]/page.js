'use client';
import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { getStatusBadge } from '../../../lib/data';
import Modal from '../../../components/Modal';

export default function PatientProfile({ params }) {
  const { id } = use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', phone: '', email: '', age: '', address: '', medicalHistory: '' });
  const [isSaving, setIsSaving] = useState(false);

  const [showRxModal, setShowRxModal] = useState(false);
  const [rxFormData, setRxFormData] = useState({ date: new Date().toISOString().split('T')[0], diagnosis: '', medications: [{ name: '', price: '' }], surgeonFee: '0', notes: '' });
  const [isRxSaving, setIsRxSaving] = useState(false);

  const [showTreatModal, setShowTreatModal] = useState(false);
  const [treatFormData, setTreatFormData] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    description: '', 
    treatmentFee: '', 
    surgeryFee: '', 
    consultationFee: '',
    dentist: 'Dr. Anand' 
  });
  const [isTreatSaving, setIsTreatSaving] = useState(false);

  function handleAddMedicine() {
    setRxFormData({ ...rxFormData, medications: [...rxFormData.medications, { name: '', price: '' }] });
  }

  function handleMedicineChange(index, field, value) {
    const newMeds = [...rxFormData.medications];
    newMeds[index][field] = value;
    setRxFormData({ ...rxFormData, medications: newMeds });
  }

  function handleRemoveMedicine(index) {
    const newMeds = rxFormData.medications.filter((_, i) => i !== index);
    setRxFormData({ ...rxFormData, medications: newMeds });
  }

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));

    fetch(`/api/patients/${id}`)
      .then(res => res.json())
      .then(d => {
        setData(d.error ? null : d);
        if (!d.error) {
          setEditFormData({
            name: d.name || '',
            phone: d.phone || '',
            email: d.email || '',
            age: d.age || '',
            address: d.address || '',
            medicalHistory: d.medicalHistory || ''
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleSaveProfile() {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        const updated = await res.json();
        setData({ ...data, ...updated });
        setShowEditModal(false);
      } else {
        alert('Failed to update profile');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving profile');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddPrescription() {
    setIsRxSaving(true);
    try {
      const res = await fetch(`/api/patients/${id}/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rxFormData)
      });
      if (res.ok) {
        const newRx = await res.json();
        setData({
          ...data,
          prescriptions: [newRx, ...(data.prescriptions || [])]
        });
        setShowRxModal(false);
        setRxFormData({ date: new Date().toISOString().split('T')[0], diagnosis: '', medications: [{ name: '', price: '' }], surgeonFee: '0', notes: '' });
      } else {
        alert('Failed to generate prescription');
      }
    } catch (e) {
      console.error(e);
      alert('Error creating prescription');
    } finally {
      setIsRxSaving(false);
    }
  }

  async function handleAddTreatment() {
    if (!treatFormData.description || !treatFormData.date) {
      alert('Description and date are required');
      return;
    }
    setIsTreatSaving(true);
    try {
      const res = await fetch(`/api/patients/${id}/treatments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(treatFormData)
      });
      if (res.ok) {
        const newTreat = await res.json();
        setData({
          ...data,
          treatments: [newTreat, ...(data.treatments || [])]
        });
        setShowTreatModal(false);
        setTreatFormData({ 
          date: new Date().toISOString().split('T')[0], 
          description: '', 
          treatmentFee: '', 
          surgeryFee: '', 
          consultationFee: '',
          dentist: 'Dr. Anand' 
        });
      } else {
        alert('Failed to record treatment');
      }
    } catch (e) {
      console.error(e);
      alert('Error creating treatment');
    } finally {
      setIsTreatSaving(false);
    }
  }

  async function handleDeletePrescription(rxId) {
    if (!confirm('Are you sure you want to delete this prescription? This will also remove the E-Bill PDF.')) return;
    try {
      const res = await fetch(`/api/patients/${id}/prescriptions/${rxId}`, { method: 'DELETE' });
      if (res.ok) {
        setData({
          ...data,
          prescriptions: data.prescriptions.filter(rx => rx.id !== rxId)
        });
      } else {
        alert('Failed to delete prescription');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting prescription');
    }
  }

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading profile...</div>;

  const patient = data;
  if (!patient) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">👤</div>
        <div className="empty-state-title">Patient not found</div>
        <Link href="/patients" className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>Back to Patients</Link>
      </div>
    );
  }

  const patientAppts = data.appointments || [];
  const patientTreatments = data.treatments || [];
  const patientPrescriptions = data.prescriptions || [];
  const totalSpent = patientTreatments.reduce((s, t) => s + t.cost, 0);
  const avatar = patient.name ? patient.name.substring(0, 2).toUpperCase() : 'U';

  return (
    <div className="stagger">
      {/* Back */}
      <Link href="/patients" className="btn btn-ghost" style={{ marginBottom: 'var(--space-md)', padding: '6px 0' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Patients
      </Link>

      {/* Profile Header */}
      <div className="glass-card-flat" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="profile-header">
          <div className="profile-avatar">{avatar}</div>
          <div className="profile-info">
            <h2>{patient.name}</h2>
            <div className="profile-contact">
              <span className="profile-contact-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {patient.phone}
              </span>
              <span className="profile-contact-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                {patient.email}
              </span>
              <span className="profile-contact-item">🎂 Age {patient.age}</span>
              {patient.address && <span className="profile-contact-item">📍 {patient.address}</span>}
            </div>
          </div>
          <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>Edit Profile</button>
        </div>
      </div>

      {/* Info Cards Row */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="glass-card stat-card">
          <div className="stat-icon blue">📅</div>
          <div className="stat-info">
            <div className="stat-value">{patientAppts.length}</div>
            <div className="stat-label">Total Visits</div>
          </div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon green">🦷</div>
          <div className="stat-info">
            <div className="stat-value">{patientTreatments.length}</div>
            <div className="stat-label">Treatments</div>
          </div>
        </div>
        {user?.role === 'admin' && (
          <div className="glass-card stat-card">
            <div className="stat-icon purple">💰</div>
            <div className="stat-info">
              <div className="stat-value">₹{totalSpent}</div>
              <div className="stat-label">Total Billed</div>
            </div>
          </div>
        )}
        <div className="glass-card stat-card">
          <div className="stat-icon orange">📋</div>
          <div className="stat-info">
            <div className="stat-value" style={{ fontSize: '0.9rem', fontWeight: 500 }}>{patient.medicalHistory}</div>
            <div className="stat-label">Medical Notes</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Treatment History */}
        <div className="glass-card-flat">
          <h2 className="section-title" style={{ marginBottom: 'var(--space-md)' }}>Treatment History</h2>
          {patientTreatments.length > 0 ? (
            <div className="timeline">
              {patientTreatments.map(t => (
                <div key={t.id} className="timeline-item">
                  <div className="timeline-dot green" />
                  <div className="timeline-time">{t.date}</div>
                  <div className="timeline-text">{t.description}</div>
                  {user?.role === 'admin' && <div className="timeline-subtext">{t.dentist} · ₹{t.cost}</div>}
                  {user?.role !== 'admin' && <div className="timeline-subtext">{t.dentist}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No treatments recorded</div>
          )}
        </div>

        {/* Appointment History */}
        <div className="glass-card-flat">
          <h2 className="section-title" style={{ marginBottom: 'var(--space-md)' }}>Appointment History</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {patientAppts.map(appt => (
                  <tr key={appt.id}>
                    <td style={{ fontWeight: 500 }}>{appt.date}</td>
                    <td>{appt.time}</td>
                    <td style={{ textTransform: 'capitalize' }}>{appt.type}</td>
                    <td><span className={`badge ${getStatusBadge(appt.status)}`} style={{ textTransform: 'capitalize' }}>{appt.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Prescriptions History */}
      <div className="glass-card-flat" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
          <h2 className="section-title">E-Prescriptions / Bills</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {user?.role === 'admin' && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowTreatModal(true)} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}>+ New Treatment Entry</button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setShowRxModal(true)}>+ New Prescription</button>
          </div>
        </div>
        
        {patientPrescriptions.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Diagnosis</th>
                  <th>Medications</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {patientPrescriptions.map(rx => {
                  let parsedMeds = [];
                  let total = 0;
                  try {
                    parsedMeds = JSON.parse(rx.medications);
                    total = parsedMeds.reduce((s, m) => s + (parseFloat(m.price) || 0), 0);
                  } catch(e) { }
                  
                  return (
                    <tr key={rx.id}>
                      <td style={{ fontWeight: 500 }}>{rx.date}</td>
                      <td>{rx.diagnosis || '-'}</td>
                      <td>{parsedMeds.length > 0 ? `${parsedMeds.length} items` : '-'}</td>
                      <td style={{ fontWeight: 600 }}>₹{total.toFixed(2)}</td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        {rx.pdf_url && <a href={rx.pdf_url} target="_blank" rel="noreferrer" className="badge badge-info" style={{ cursor: 'pointer', textDecoration: 'none' }}>⬇️ PDF E-Bill</a>}
                        {rx.pdf_url && patient.phone && (
                          <a
                            href={`https://wa.me/${patient.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello, this is your dental invoice from Victoria Dental Care.\n\nInvoice Number: RX-${rx.id.substring(0, 8).toUpperCase()}\nTotal Amount: ₹${total.toFixed(2)}\n\nDownload your E-Bill here: ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}${rx.pdf_url}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="badge"
                            style={{ cursor: 'pointer', textDecoration: 'none', background: 'rgba(37, 211, 102, 0.15)', color: '#25d366', border: 'none' }}
                          >💬 WhatsApp</a>
                        )}
                        <button className="badge" style={{ cursor: 'pointer', border: 'none', background: 'var(--color-danger-light)', color: 'var(--color-danger)' }} onClick={() => handleDeletePrescription(rx.id)}>🗑️ Delete</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No prescriptions generated</div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Patient Profile" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={isSaving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveProfile} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
        </>
      }>
        <div className="grid-2">
          <div className="input-group">
            <label>Full Name</label>
            <input type="text" className="input-field" placeholder="John Doe" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Age</label>
            <input type="number" className="input-field" placeholder="35" value={editFormData.age} onChange={e => setEditFormData({...editFormData, age: e.target.value})} />
          </div>
        </div>
        <div className="input-group">
          <label>Phone Number</label>
          <input type="tel" className="input-field" placeholder="+1 (555) 000-0000" value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} />
        </div>
        <div className="input-group">
          <label>Email Address</label>
          <input type="email" className="input-field" placeholder="john@email.com" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} />
        </div>
        <div className="input-group">
          <label>Address</label>
          <textarea className="input-field" placeholder="Full address..." rows={2} value={editFormData.address} onChange={e => setEditFormData({...editFormData, address: e.target.value})} />
        </div>
        <div className="input-group">
          <label>Medical History</label>
          <textarea className="input-field" placeholder="Allergies, conditions, medications..." rows={3} value={editFormData.medicalHistory} onChange={e => setEditFormData({...editFormData, medicalHistory: e.target.value})} />
        </div>
      </Modal>

      {/* New Prescription Modal */}
      <Modal isOpen={showRxModal} onClose={() => setShowRxModal(false)} title="New E-Prescription & Bill" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setShowRxModal(false)} disabled={isRxSaving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddPrescription} disabled={isRxSaving}>{isRxSaving ? 'Generating...' : 'Generate & Send PDF'}</button>
        </>
      }>
        <div className="grid-2">
          <div className="input-group">
            <label>Date</label>
            <input type="date" className="input-field" value={rxFormData.date} onChange={e => setRxFormData({...rxFormData, date: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Diagnosis (Optional)</label>
            <input type="text" className="input-field" placeholder="e.g. Gum Infection" value={rxFormData.diagnosis} onChange={e => setRxFormData({...rxFormData, diagnosis: e.target.value})} />
          </div>
        </div>
        <div className="input-group">
          <div className="flex-between">
            <label>Medicines & Billing (Required)</label>
            <button className="btn btn-ghost btn-sm" onClick={handleAddMedicine} type="button">+ Add Item</button>
          </div>
          {rxFormData.medications.map((med, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input type="text" className="input-field" placeholder="Medicine / Service Name" value={med.name} onChange={e => handleMedicineChange(idx, 'name', e.target.value)} style={{ flex: 1 }} />
              <input type="number" className="input-field" placeholder="Price (₹)" value={med.price} onChange={e => handleMedicineChange(idx, 'price', e.target.value)} style={{ width: '100px' }} />
              {rxFormData.medications.length > 1 && (
                <button className="btn btn-ghost" onClick={() => handleRemoveMedicine(idx)} type="button" style={{ padding: '0 8px', color: 'var(--color-danger)' }}>✕</button>
              )}
            </div>
          ))}
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label>Surgeon Fee (₹)</label>
            <input type="number" className="input-field" placeholder="0" value={rxFormData.surgeonFee} onChange={e => setRxFormData({...rxFormData, surgeonFee: e.target.value})} disabled={user?.role !== 'admin'} />
          </div>
        </div>
        <div className="input-group">
          <label>Notes / Instructions (Optional)</label>
          <textarea className="input-field" placeholder="Take after food. Drink plenty of water." rows={3} value={rxFormData.notes} onChange={e => setRxFormData({...rxFormData, notes: e.target.value})} />
        </div>
      </Modal>

      {/* New Treatment Modal */}
      <Modal isOpen={showTreatModal} onClose={() => setShowTreatModal(false)} title="New Treatment Entry" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setShowTreatModal(false)} disabled={isTreatSaving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddTreatment} disabled={isTreatSaving}>{isTreatSaving ? 'Saving...' : 'Save Treatment'}</button>
        </>
      }>
        <div className="input-group">
          <label>Treatment Description</label>
          <input type="text" className="input-field" placeholder="e.g. Root Canal, Scaling" value={treatFormData.description} onChange={e => setTreatFormData({...treatFormData, description: e.target.value})} />
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label>Date</label>
            <input type="date" className="input-field" value={treatFormData.date} onChange={e => setTreatFormData({...treatFormData, date: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Dentist</label>
            <input type="text" className="input-field" value={treatFormData.dentist} onChange={e => setTreatFormData({...treatFormData, dentist: e.target.value})} />
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ fontSize: '0.875rem', marginBottom: '12px', opacity: 0.8 }}>Revenue Breakdown (₹)</h3>
          <div className="grid-2">
            <div className="input-group">
              <label style={{ fontSize: '0.75rem' }}>Treatment Fee</label>
              <input type="number" className="input-field" placeholder="0" value={treatFormData.treatmentFee} onChange={e => setTreatFormData({...treatFormData, treatmentFee: e.target.value})} />
            </div>
            <div className="input-group">
              <label style={{ fontSize: '0.75rem' }}>Surgery Fee</label>
              <input type="number" className="input-field" placeholder="0" value={treatFormData.surgeryFee} onChange={e => setTreatFormData({...treatFormData, surgeryFee: e.target.value})} />
            </div>
          </div>
          <div className="input-group" style={{ marginTop: '8px' }}>
            <label style={{ fontSize: '0.75rem' }}>Consultation Fee</label>
            <input type="number" className="input-field" placeholder="0" value={treatFormData.consultationFee} onChange={e => setTreatFormData({...treatFormData, consultationFee: e.target.value})} />
          </div>
          <div style={{ marginTop: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-accent)' }}>
            Total: ₹{(parseFloat(treatFormData.treatmentFee) || 0) + (parseFloat(treatFormData.surgeryFee) || 0) + (parseFloat(treatFormData.consultationFee) || 0)}
          </div>
        </div>
      </Modal>
    </div>
  );
}
