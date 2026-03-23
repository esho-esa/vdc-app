'use client';
import { useState, useMemo, useEffect } from 'react';
import Modal from '../../components/Modal';
import PatientPicker from '../../components/PatientPicker';

function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const [hour, min] = timeStr.split(':');
  const h = parseInt(hour);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getMonthData(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  const cells = [];
  // Previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, otherMonth: true });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, otherMonth: false });
  }
  // Next month
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, otherMonth: true });
  }
  return cells;
}

function formatDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function AppointmentsPage() {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 18)); // March 18 2026
  const [showModal, setShowModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [newAppt, setNewAppt] = useState({ patientId: '', patientName: '', date: '', time: '', type: 'checkup', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, []);

  async function fetchAppointments() {
    try {
      const res = await fetch('/api/appointments');
      const data = await res.json();
      setAppointments(data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    }
  }

  async function fetchPatients() {
    try {
      const res = await fetch('/api/patients');
      const data = await res.json();
      setPatients(data);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  }

  async function handleAddAppointment() {
    if (!newAppt.patientId || !newAppt.date || !newAppt.time) {
      alert('Please fill in patient, date, and time');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAppt)
      });
      
      if (res.ok) {
        const addedAppt = await res.json();
        setAppointments([...appointments, addedAppt]);
        setShowModal(false);
        setNewAppt({ patientId: '', patientName: '', date: '', time: '', type: 'checkup', notes: '' });
        
        // Find patient phone for reminder
        const patient = patients.find(p => p.id === addedAppt.patient_id);
        if (patient && patient.phone) {
           sendReminder(patient.phone, patient.name, addedAppt.time, addedAppt.date);
        }
      } else {
        alert('Failed to create appointment');
      }
    } catch (error) {
      console.error(error);
      alert('Error saving appointment');
    } finally {
      setIsSubmitting(false);
    }
  }
  
  async function updateStatus(id, newStatus) {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setAppointments(appointments.map(a => a.id === id ? updated : a));
        setSelectedAppt(updated);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function deleteAppointment(id) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAppointments(prev => prev.filter(a => a.id !== id));
        setSelectedAppt(null);
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  }
  
  async function sendReminder(phone, name, time, date, openWhatsApp = false) {
    let message = '';
    
    try {
      const res = await fetch('/api/settings');
      const settings = await res.json();
      const template = settings?.reminder_template || `Hello [Name], your appointment is on [Date] at [Time].`;
      
      message = template
        .replace(/\[Name\]/g, name)
        .replace(/\[Date\]/g, date)
        .replace(/\[Time\]/g, formatTime12h(time));
    } catch (error) {
      console.error('Error fetching template:', error);
      message = `Hello ${name}, your dental appointment is scheduled on ${date} at ${formatTime12h(time)}.`;
    }

    if (openWhatsApp) {
      const cleanPhone = phone.replace(/\D/g, '');
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      return;
    }

    try {
      await fetch('/api/reminders/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientPhone: phone,
          patientName: name,
          clinicName: 'Victoria Dental Care',
          appointmentTime: time,
          appointmentDate: date
        })
      });
    } catch (error) {
      console.error('Failed to send reminder:', error);
    }
  }

  const patientSelectChange = (e) => {
    const pId = e.target.value;
    const p = patients.find(p => p.id === pId);
    setNewAppt({ ...newAppt, patientId: pId, patientName: p ? p.name : '' });
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = '2026-03-18';

  const monthCells = useMemo(() => getMonthData(year, month), [year, month]);

  const apptsByDate = useMemo(() => {
    const map = {};
    appointments.forEach(a => {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    });
    return map;
  }, [appointments]);

  function navigateMonth(dir) {
    setCurrentDate(new Date(year, month + dir, 1));
  }

  // Week view data
  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8 AM to 5 PM

  const typeEmoji = { checkup: '✅', cleaning: '✨', treatment: '🦷', surgery: '🔪', consultation: '💬' };

  return (
    <div className="stagger">
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">{MONTHS[month]} {year}</p>
        </div>
        <div className="flex-gap">
          <div className="tabs">
            {['day', 'week', 'month'].map(v => (
              <button key={v} className={`tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)} style={{ textTransform: 'capitalize' }}>{v}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New</button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigateMonth(-1)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Previous
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(new Date(2026, 2, 18))}>Today</button>
        <button className="btn btn-secondary btn-sm" onClick={() => navigateMonth(1)}>
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Month View */}
      {view === 'month' && (
        <div className="glass-card-flat" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="calendar-grid">
            {DAYS.map(d => (
              <div key={d} className="calendar-header-cell">{d}</div>
            ))}
            {monthCells.map((cell, i) => {
              const dateStr = cell.otherMonth ? '' : formatDateStr(year, month, cell.day);
              const cellAppts = dateStr ? (apptsByDate[dateStr] || []) : [];
              const isToday = dateStr === today;
              return (
                <div key={i} className={`calendar-cell ${cell.otherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}>
                  <div className="calendar-cell-date">{cell.day}</div>
                  {cellAppts.slice(0, 3).map(a => (
                    <div key={a.id} className={`calendar-event ${a.type}`} onClick={() => setSelectedAppt(a)} title={`${formatTime12h(a.time)} - ${a.patient_name || a.patientName}`}>
                      {formatTime12h(a.time)} {(a.patient_name || a.patientName || '').split(' ')[0]}
                    </div>
                  ))}
                  {cellAppts.length > 3 && <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', paddingLeft: 6 }}>+{cellAppts.length - 3} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="glass-card-flat" style={{ padding: 0, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', minWidth: 700 }}>
            <div style={{ borderBottom: '1px solid var(--color-divider)', padding: 8 }} />
            {weekDays.map((d, i) => {
              const ds = formatDateStr(d.getFullYear(), d.getMonth(), d.getDate());
              return (
                <div key={i} style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '1px solid var(--color-divider)', borderLeft: '1px solid var(--color-divider)', background: ds === today ? 'var(--color-accent-light)' : '' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>{DAYS[i]}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: ds === today ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>{d.getDate()}</div>
                </div>
              );
            })}
            {hours.map(h => (
              <div key={h} style={{ display: 'contents' }}>
                <div style={{ padding: '8px 4px', fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', textAlign: 'right', borderBottom: '1px solid var(--color-divider)' }}>{h > 12 ? h - 12 : h}{h >= 12 ? 'PM' : 'AM'}</div>
                {weekDays.map((d, di) => {
                  const ds = formatDateStr(d.getFullYear(), d.getMonth(), d.getDate());
                  const slotAppts = (apptsByDate[ds] || []).filter(a => parseInt(a.time.split(':')[0]) === h);
                  return (
                    <div key={di} style={{ padding: 4, minHeight: 48, borderBottom: '1px solid var(--color-divider)', borderLeft: '1px solid var(--color-divider)' }}>
                      {slotAppts.map(a => (
                      <div key={a.id} className={`calendar-event ${a.type}`} style={{ padding: '4px 6px', cursor: 'pointer' }} onClick={() => setSelectedAppt(a)}>
                        {formatTime12h(a.time)} {(a.patient_name || a.patientName || '').split(' ')[0]}
                      </div>
                    ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day View */}
      {view === 'day' && (
        <div className="glass-card-flat">
          <div style={{ marginBottom: 'var(--space-md)', fontWeight: 600 }}>
            {DAYS[currentDate.getDay()]}, {MONTHS[month]} {currentDate.getDate()}, {year}
          </div>
          {hours.map(h => {
            const dayAppts = (apptsByDate[today] || []).filter(a => parseInt(a.time.split(':')[0]) === h);
            return (
              <div key={h} style={{ display: 'flex', gap: 'var(--space-md)', minHeight: 60, borderBottom: '1px solid var(--color-divider)', padding: '8px 0' }}>
                <div style={{ width: 60, fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', textAlign: 'right', paddingRight: 12, paddingTop: 4, flexShrink: 0 }}>
                  {h > 12 ? h - 12 : h}:00 {h >= 12 ? 'PM' : 'AM'}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {dayAppts.map(a => (
                    <div key={a.id} style={{
                      padding: '10px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      background: `var(--color-${a.type === 'surgery' ? 'danger' : a.type === 'treatment' ? 'warning' : a.type === 'consultation' ? 'purple' : a.type === 'cleaning' ? 'success' : 'accent'}-light)`,
                      borderLeft: `3px solid var(--color-${a.type === 'surgery' ? 'danger' : a.type === 'treatment' ? 'warning' : a.type === 'consultation' ? 'purple' : a.type === 'cleaning' ? 'success' : 'accent'})`,
                    }} onClick={() => setSelectedAppt(a)}>
                      <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{a.patient_name || a.patientName}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{formatTime12h(a.time)} · {a.type} · {a.duration} min</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Appointment Detail Modal */}
       <Modal isOpen={!!selectedAppt} onClose={() => setSelectedAppt(null)} title="Appointment Details" footer={
        <>
          <button className="btn btn-danger btn-sm" onClick={() => deleteAppointment(selectedAppt.id)}>Cancel Appt</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedAppt(null)}>Close</button>
        </>
      }>
        {selectedAppt && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-sm) 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'var(--color-accent-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '1.1rem' }}>
                {(selectedAppt.patient_name || selectedAppt.patientName || 'U').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.0625rem' }}>{selectedAppt.patient_name || selectedAppt.patientName}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{selectedAppt.type ? selectedAppt.type.charAt(0).toUpperCase() + selectedAppt.type.slice(1) : ''}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', padding: 'var(--space-sm) 0' }}>
              <div><div className="label">Date</div><div style={{ fontWeight: 500, marginTop: 4 }}>{selectedAppt.date}</div></div>
              <div><div className="label">Time</div><div style={{ fontWeight: 500, marginTop: 4 }}>{formatTime12h(selectedAppt.time)}</div></div>
              <div><div className="label">Duration</div><div style={{ fontWeight: 500, marginTop: 4 }}>{selectedAppt.duration} minutes</div></div>
              <div>
                <div className="label">Status</div>
                <div style={{ marginTop: 4 }}>
                  <span className={`badge ${['checkin', 'engaged', 'checkout', 'confirmed'].includes(selectedAppt.status) ? 'badge-confirmed' : 'badge-pending'}`} style={{ textTransform: 'capitalize' }}>
                    {selectedAppt.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className={`btn btn-sm ${selectedAppt.status === 'checkin' ? 'btn-primary' : 'btn-secondary'}`} 
                        onClick={() => updateStatus(selectedAppt.id, 'checkin')} disabled={isUpdatingStatus}>Check In</button>
                <button className={`btn btn-sm ${selectedAppt.status === 'engaged' ? 'btn-primary' : 'btn-secondary'}`} 
                        onClick={() => updateStatus(selectedAppt.id, 'engaged')} disabled={isUpdatingStatus}>Engaged</button>
                <button className={`btn btn-sm ${selectedAppt.status === 'checkout' ? 'btn-primary' : 'btn-secondary'}`} 
                        onClick={() => updateStatus(selectedAppt.id, 'checkout')} disabled={isUpdatingStatus}>Check Out</button>
            </div>

            {selectedAppt.notes && (
              <div style={{ marginTop: '16px' }}><div className="label">Notes</div><div style={{ marginTop: 4, fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>{selectedAppt.notes}</div></div>
            )}
            
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-divider)', paddingTop: '16px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                   const p = patients.find(p => p.id === selectedAppt.patient_id);
                   if (p && p.phone) {
                     sendReminder(p.phone, p.name, selectedAppt.time, selectedAppt.date, true);
                   } else {
                     alert('Patient phone number not found.');
                   }
                }}>
                  💬 Send Reminder Now
                </button>
            </div>
          </>
        )}
      </Modal>

      {/* New Appointment Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Appointment" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isSubmitting}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddAppointment} disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create'}</button>
        </>
      }>
        <div className="input-group">
          <label>Patient</label>
          <PatientPicker 
            patients={patients} 
            value={newAppt.patientId} 
            onChange={(id, name) => setNewAppt({ ...newAppt, patientId: id, patientName: name })} 
          />
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label>Date</label>
            <input type="date" className="input-field theme-input" value={newAppt.date} onChange={e => setNewAppt({...newAppt, date: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Time</label>
            <input type="time" className="input-field theme-input" value={newAppt.time} onChange={e => setNewAppt({...newAppt, time: e.target.value})} />
          </div>
        </div>
        <div className="input-group">
          <label>Type</label>
          <select className="input-field" value={newAppt.type} onChange={e => setNewAppt({...newAppt, type: e.target.value})}>
            <option value="checkup">✅ Checkup</option>
            <option value="cleaning">✨ Cleaning</option>
            <option value="treatment">🦷 Treatment</option>
            <option value="surgery">🔪 Surgery</option>
            <option value="consultation">💬 Consultation</option>
          </select>
        </div>
        <div className="input-group">
          <label>Notes</label>
          <textarea className="input-field" placeholder="Appointment notes..." rows={3} value={newAppt.notes} onChange={e => setNewAppt({...newAppt, notes: e.target.value})} />
        </div>
        <style jsx>{`
          .theme-input {
            color-scheme: light dark;
          }
          :global([data-theme="dark"]) .theme-input {
            color-scheme: dark;
          }
        `}</style>
      </Modal>
    </div>
  );
}
