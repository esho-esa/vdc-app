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

  // New multi-treatment state variables
  const [showTreatModal, setShowTreatModal] = useState(false);
  const [treatmentsList, setTreatmentsList] = useState([{ description: '', notes: '', treatmentFee: '', surgeryFee: '', consultationFee: '' }]);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitDentist, setVisitDentist] = useState('Dr. Anand');
  const [isTreatSaving, setIsTreatSaving] = useState(false);

  // Edit / Details treatment state variables
  const [showEditTreatModal, setShowEditTreatModal] = useState(false);
  const [showTreatDetailsModal, setShowTreatDetailsModal] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [editTreatFormData, setEditTreatFormData] = useState({ description: '', notes: '', treatmentFee: '', surgeryFee: '', consultationFee: '', dentist: 'Dr. Anand', date: new Date().toISOString().split('T')[0] });

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

  // Multi-treatment dynamic row handlers
  function handleAddTreatmentRow() {
    setTreatmentsList([...treatmentsList, { description: '', notes: '', treatmentFee: '', surgeryFee: '', consultationFee: '' }]);
  }

  function handleRemoveTreatmentRow(index) {
    setTreatmentsList(treatmentsList.filter((_, i) => i !== index));
  }

  function handleTreatmentRowChange(index, field, value) {
    const newList = [...treatmentsList];
    newList[index][field] = value;
    setTreatmentsList(newList);
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
        const errorData = await res.json().catch(() => ({}));
        console.error('Prescription API Error:', errorData);
        alert(`Failed to generate prescription: ${errorData.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Prescription Network Error:', e);
      alert('Error creating prescription (Network or Server Issue). Check console for details.');
    } finally {
      setIsRxSaving(false);
    }
  }

  async function handleAddTreatment() {
    // Validation: prevent empty treatments or empty fields
    const emptyFields = treatmentsList.some(t => !t.description);
    if (emptyFields || !visitDate) {
      alert('Treatment Name and Date are required for all rows.');
      return;
    }

    setIsTreatSaving(true);
    try {
      const payload = treatmentsList.map(item => ({
        description: item.description,
        notes: item.notes,
        treatmentFee: item.treatmentFee || '0',
        surgeryFee: item.surgeryFee || '0',
        consultationFee: item.consultationFee || '0',
        dentist: visitDentist,
        date: visitDate
      }));

      const res = await fetch(`/api/patients/${id}/treatments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newTreats = await res.json();
        const treatsArray = Array.isArray(newTreats) ? newTreats : [newTreats];
        setData({
          ...data,
          treatments: [...treatsArray, ...(data.treatments || [])]
        });
        setShowTreatModal(false);
        // Reset list and details
        setTreatmentsList([{ description: '', notes: '', treatmentFee: '', surgeryFee: '', consultationFee: '' }]);
        setVisitDate(new Date().toISOString().split('T')[0]);
      } else {
        alert('Failed to record treatments');
      }
    } catch (e) {
      console.error(e);
      alert('Error creating treatments');
    } finally {
      setIsTreatSaving(false);
    }
  }

  async function handleSaveTreatment() {
    if (!editTreatFormData.description || !editTreatFormData.date) {
      alert('Treatment Name and Date are required');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/patients/${id}/treatments/${selectedTreatment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editTreatFormData.description,
          notes: editTreatFormData.notes,
          treatmentFee: editTreatFormData.treatmentFee,
          surgeryFee: editTreatFormData.surgeryFee,
          consultationFee: editTreatFormData.consultationFee,
          dentist: editTreatFormData.dentist,
          date: editTreatFormData.date
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setData({
          ...data,
          treatments: data.treatments.map(t => t.id === selectedTreatment.id ? updated : t)
        });
        setShowEditTreatModal(false);
        setSelectedTreatment(null);
      } else {
        alert('Failed to update treatment');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving treatment');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTreatment(txId) {
    if (!confirm('Are you sure you want to delete this treatment? This will automatically update clinic revenue stats.')) return;
    try {
      const res = await fetch(`/api/patients/${id}/treatments/${txId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setData({
          ...data,
          treatments: data.treatments.filter(t => t.id !== txId)
        });
        if (selectedTreatment?.id === txId) {
          setShowTreatDetailsModal(false);
          setSelectedTreatment(null);
        }
      } else {
        alert('Failed to delete treatment');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting treatment');
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

  function openEditTreatModal(e, t, parsed) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedTreatment(t);
    setEditTreatFormData({
      description: parsed.name || parsed.description || t.description,
      notes: parsed.notes || '',
      treatmentFee: t.treatment_fee.toString(),
      surgeryFee: t.surgery_fee.toString(),
      consultationFee: t.consultation_fee.toString(),
      dentist: t.dentist || 'Dr. Anand',
      date: t.date
    });
    setShowEditTreatModal(true);
  }

  function openTreatDetailsModal(t, parsed) {
    setSelectedTreatment({
      ...t,
      parsed
    });
    setShowTreatDetailsModal(true);
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
  // Sort patient treatments: newest date first, then by ID descending to preserve batch insertion ordering
  const patientTreatments = [...(data.treatments || [])].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.id.localeCompare(a.id);
  });
  const patientPrescriptions = data.prescriptions || [];
  const totalSpent = patientTreatments.reduce((s, t) => s + t.cost, 0);
  const avatar = patient.name ? patient.name.substring(0, 2).toUpperCase() : 'U';

  const totalTreatmentFee = treatmentsList.reduce((sum, item) => sum + (parseFloat(item.treatmentFee) || 0), 0);
  const totalSurgeryFee = treatmentsList.reduce((sum, item) => sum + (parseFloat(item.surgeryFee) || 0), 0);
  const totalConsultationFee = treatmentsList.reduce((sum, item) => sum + (parseFloat(item.consultationFee) || 0), 0);
  const grandTotalRevenue = totalTreatmentFee + totalSurgeryFee + totalConsultationFee;

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
              {patientTreatments.map(t => {
                let parsed = { name: t.description, notes: '' };
                try {
                  if (t.description && t.description.startsWith('{')) {
                    parsed = JSON.parse(t.description);
                  }
                } catch (e) { /* fallback to plain text */ }

                const treatmentName = parsed.name || parsed.description || t.description;
                const notesStr = parsed.notes;

                return (
                  <div 
                    key={t.id} 
                    className="treatment-card" 
                    onClick={() => openTreatDetailsModal(t, parsed)}
                  >
                    <div className="timeline-dot green" style={{ left: '-26px', top: '20px' }} />
                    <div className="treatment-card-header">
                      <div>
                        <div className="treatment-card-date">{t.date}</div>
                        <div className="treatment-card-title">{treatmentName}</div>
                      </div>
                      <div className="treatment-card-actions" onClick={e => e.stopPropagation()}>
                        <button 
                          className="treatment-card-action-btn edit" 
                          title="Edit Treatment"
                          onClick={(e) => openEditTreatModal(e, t, parsed)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/>
                          </svg>
                        </button>
                        <button 
                          className="treatment-card-action-btn delete" 
                          title="Delete Treatment"
                          onClick={(e) => handleDeleteTreatment(t.id)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    {notesStr && (
                      <div className="treatment-card-notes">
                        {notesStr}
                      </div>
                    )}
                    <div className="treatment-card-footer">
                      <span className="treatment-card-dentist">👨‍⚕️ {t.dentist}</span>
                      {user?.role === 'admin' && (
                        <span className="treatment-card-cost">₹{t.cost}</span>
                      )}
                    </div>
                  </div>
                );
              })}
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
              <button className="btn btn-secondary btn-sm" onClick={() => setShowTreatModal(true)} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}>+ New Visit / Treatments</button>
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
                  let total = rx.total_amount || 0;
                  try {
                    parsedMeds = JSON.parse(rx.medications);
                    if (!total) {
                      const medsTotal = parsedMeds.reduce((s, m) => s + (parseFloat(m.price) || 0), 0);
                      total = medsTotal + (parseFloat(rx.surgeon_fee) || 0);
                    }
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
                             href={`https://wa.me/${patient.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello, this is your dental invoice from Victoria Dental Care.\n\nInvoice Number: RX-${rx.id.substring(0, 8).toUpperCase()}\nTotal Amount: ₹${total.toFixed(2)}\n\nDownload your E-Bill here: ${typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')}${rx.pdf_url}`)}`}
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

      {/* New Dynamic Multi-Treatment Modal */}
      <Modal isOpen={showTreatModal} onClose={() => setShowTreatModal(false)} title="Record New Patient Visit / Treatments" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setShowTreatModal(false)} disabled={isTreatSaving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddTreatment} disabled={isTreatSaving}>{isTreatSaving ? 'Saving Visit...' : 'Save Treatments'}</button>
        </>
      }>
        <div className="grid-2" style={{ marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <div className="input-group">
            <label>Visit Date</label>
            <input type="date" className="input-field" value={visitDate} onChange={e => setVisitDate(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Dentist In Charge</label>
            <input type="text" className="input-field" value={visitDentist} onChange={e => setVisitDentist(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
          {treatmentsList.map((item, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)', position: 'relative' }}>
              {treatmentsList.length > 1 && (
                <button 
                  type="button" 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => handleRemoveTreatmentRow(idx)}
                  style={{ position: 'absolute', top: 8, right: 8, color: 'var(--color-danger)', padding: '4px 8px' }}
                >
                  ✕ Remove
                </button>
              )}
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px', color: 'var(--color-accent)' }}>Treatment #{idx + 1}</h4>
              
              <div className="input-group" style={{ marginBottom: '8px' }}>
                <label>Treatment Name / Description (Required)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Scaling, Extraction, Root Canal" 
                  value={item.description} 
                  onChange={e => handleTreatmentRowChange(idx, 'description', e.target.value)} 
                />
              </div>

              <div className="grid-3" style={{ marginTop: '8px' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.75rem' }}>Treatment Fee (₹)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="0" 
                    value={item.treatmentFee} 
                    onChange={e => handleTreatmentRowChange(idx, 'treatmentFee', e.target.value)} 
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.75rem' }}>Surgery Fee (₹)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="0" 
                    value={item.surgeryFee} 
                    onChange={e => handleTreatmentRowChange(idx, 'surgeryFee', e.target.value)} 
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.75rem' }}>Consultation Fee (₹)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="0" 
                    value={item.consultationFee} 
                    onChange={e => handleTreatmentRowChange(idx, 'consultationFee', e.target.value)} 
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '0.75rem' }}>Treatment Notes</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Notes..." 
                  value={item.notes} 
                  onChange={e => handleTreatmentRowChange(idx, 'notes', e.target.value)} 
                />
              </div>

              <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.8125rem', marginTop: '8px', color: 'var(--color-text-secondary)' }}>
                Sub Total: ₹{(parseFloat(item.treatmentFee) || 0) + (parseFloat(item.surgeryFee) || 0) + (parseFloat(item.consultationFee) || 0)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddTreatmentRow}>+ Add Another Treatment</button>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)', marginTop: '16px' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px', color: 'var(--color-accent)', borderBottom: '1px solid var(--color-divider)', paddingBottom: '6px' }}>Visit Revenue Breakdown</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
            <div className="flex-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Total Treatment Fee:</span>
              <span style={{ fontWeight: 500 }}>₹{totalTreatmentFee}</span>
            </div>
            <div className="flex-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Total Surgery Fee:</span>
              <span style={{ fontWeight: 500 }}>₹{totalSurgeryFee}</span>
            </div>
            <div className="flex-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Total Consultation Fee:</span>
              <span style={{ fontWeight: 500 }}>₹{totalConsultationFee}</span>
            </div>
            <div className="flex-between" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px', fontWeight: 700, color: 'var(--color-success)', fontSize: '1.05rem' }}>
              <span>Grand Total Revenue:</span>
              <span>₹{grandTotalRevenue}</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Treatment Modal */}
      <Modal isOpen={showEditTreatModal} onClose={() => { setShowEditTreatModal(false); setSelectedTreatment(null); }} title="Edit Treatment Details" footer={
        <>
          <button className="btn btn-secondary" onClick={() => { setShowEditTreatModal(false); setSelectedTreatment(null); }} disabled={isSaving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveTreatment} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
        </>
      }>
        <div className="input-group">
          <label>Treatment Name / Description</label>
          <input type="text" className="input-field" placeholder="e.g. Scaling" value={editTreatFormData.description} onChange={e => setEditTreatFormData({...editTreatFormData, description: e.target.value})} />
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label>Dentist</label>
            <input type="text" className="input-field" value={editTreatFormData.dentist} onChange={e => setEditTreatFormData({...editTreatFormData, dentist: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Date</label>
            <input type="date" className="input-field" value={editTreatFormData.date} onChange={e => setEditTreatFormData({...editTreatFormData, date: e.target.value})} />
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '0.875rem', marginBottom: '12px', opacity: 0.8 }}>Fee Breakdown (₹)</h3>
          <div className="grid-3">
            <div className="input-group">
              <label style={{ fontSize: '0.75rem' }}>Treatment Fee</label>
              <input type="number" className="input-field" value={editTreatFormData.treatmentFee} onChange={e => setEditTreatFormData({...editTreatFormData, treatmentFee: e.target.value})} />
            </div>
            <div className="input-group">
              <label style={{ fontSize: '0.75rem' }}>Surgery Fee</label>
              <input type="number" className="input-field" value={editTreatFormData.surgeryFee} onChange={e => setEditTreatFormData({...editTreatFormData, surgeryFee: e.target.value})} />
            </div>
            <div className="input-group">
              <label style={{ fontSize: '0.75rem' }}>Consultation Fee</label>
              <input type="number" className="input-field" value={editTreatFormData.consultationFee} onChange={e => setEditTreatFormData({...editTreatFormData, consultationFee: e.target.value})} />
            </div>
          </div>
          <div style={{ marginTop: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-accent)' }}>
            Total: ₹{(parseFloat(editTreatFormData.treatmentFee) || 0) + (parseFloat(editTreatFormData.surgeryFee) || 0) + (parseFloat(editTreatFormData.consultationFee) || 0)}
          </div>
        </div>
        <div className="input-group" style={{ marginTop: '12px' }}>
          <label>Clinical Notes (Optional)</label>
          <textarea className="input-field" placeholder="Add diagnosis details or notes..." rows={3} value={editTreatFormData.notes} onChange={e => setEditTreatFormData({...editTreatFormData, notes: e.target.value})} />
        </div>
      </Modal>

      {/* Treatment Details Modal */}
      <Modal isOpen={showTreatDetailsModal} onClose={() => { setShowTreatDetailsModal(false); setSelectedTreatment(null); }} title="Treatment Details" footer={
        <div className="flex-between" style={{ width: '100%' }}>
          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTreatment(selectedTreatment.id)}>Delete Treatment</button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setShowTreatDetailsModal(false); setSelectedTreatment(null); }}>Close</button>
        </div>
      }>
        {selectedTreatment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-text)' }}>{selectedTreatment.parsed?.name}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Date: {selectedTreatment.date} · Recorded by {selectedTreatment.dentist}</p>
            </div>
            {selectedTreatment.parsed?.notes && (
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Clinical Notes:</span>
                <p style={{ marginTop: '4px', fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  {selectedTreatment.parsed?.notes}
                </p>
              </div>
            )}
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '10px', opacity: 0.8 }}>Fee Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
                <div className="flex-between"><span>Treatment Fee:</span><span>₹{selectedTreatment.treatment_fee}</span></div>
                <div className="flex-between"><span>Surgery Fee:</span><span>₹{selectedTreatment.surgery_fee}</span></div>
                <div className="flex-between"><span>Consultation Fee:</span><span>₹{selectedTreatment.consultation_fee}</span></div>
                <div className="flex-between" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px', fontWeight: 700, color: 'var(--color-success)', fontSize: '1rem' }}>
                  <span>Total Cost:</span><span>₹{selectedTreatment.cost}</span>
                </div>
              </div>
            </div>
            {selectedTreatment.parsed?.last_modified_by && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textAlign: 'right', marginTop: '10px' }}>
                Last Modified By: {selectedTreatment.parsed?.last_modified_by} on {new Date(selectedTreatment.parsed?.last_modified_at).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
