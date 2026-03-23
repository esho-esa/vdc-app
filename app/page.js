'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Modal from '../components/Modal';
import { getStatusBadge } from '../lib/data';
import PatientPicker from '../components/PatientPicker';

function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const [hour, min] = timeStr.split(':');
  const h = parseInt(hour);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}

function StatCard({ icon, iconClass, value, label, change, positive }) {
  return (
    <div className="glass-card stat-card">
      <div className={`stat-icon ${iconClass}`}>{icon}</div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {change && <div className={`stat-change ${positive ? 'positive' : 'negative'}`}>{positive ? '↑' : '↓'} {change}</div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newAppt, setNewAppt] = useState({ patientId: '', patientName: '', date: '', time: '', type: 'checkup', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ revenue: 0, statusCounts: {}, totalPatients: 0 });
  const [activityFeed, setActivityFeed] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const [pData, aData, sData, actData, nData] = await Promise.all([
        fetch('/api/patients').then(r => r.json()),
        fetch('/api/appointments').then(r => r.json()),
        fetch('/api/dashboard/stats').then(r => r.json()),
        fetch('/api/dashboard/activity').then(r => r.json()),
        fetch('/api/notifications').then(r => r.json())
      ]);
      setPatients(pData);
      setAppointments(aData);
      setStats(sData);
      setActivityFeed(actData);
      setNotifications(nData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split('T')[0]; // Current date
  const todayAppts = appointments.filter(a => a.date === today);
  const upcomingAppts = appointments.filter(a => a.date > today).slice(0, 4);
  const recentNotifs = notifications.slice(0, 4);

  const notifIcons = { missed: '⚠️', upcoming: '📅', reminder: '💬', alert: '🔔' };
  const notifIconColors = { missed: 'var(--color-danger-light)', upcoming: 'var(--color-accent-light)', reminder: 'var(--color-success-light)', alert: 'var(--color-warning-light)' };

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
           const message = `Hello M/s ${patient.name}, 
Your Dental Appointment has been Scheduled on 🗓 ${addedAppt.date} at ⏰ ${addedAppt.time}. For enquiry please contact below number. Thanks. 

Don't forget to bring: 
1. Prescriptions given by our clinic. 
2. X-RAYS taken (if any). 
3. Your Regular Medicines (if any). 

வணக்கம் ${patient.name} , உங்கள் பல் மருத்துவ சிகிச்சைக்கான முன்பதிவு நேரம் 🗓 ${addedAppt.date} அன்று ⏰ ${addedAppt.time} மணிக்கு நியமிக்கபட்டுள்ளது. மேலும் விவரங்களுக்கு கீழ்கண்ட எண்ணிற்கு அழைக்கவும். நன்றி. 

Victoria Dental Care
Dr.S.Ezhil Ethel Selvam
9789124195`;

           fetch('/api/reminders/send', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               patientPhone: patient.phone,
               patientName: patient.name,
               clinicName: 'Victoria Dental Care',
               appointmentTime: addedAppt.time,
               appointmentDate: addedAppt.date,
               customMessage: message // Assuming the API can handle a custom message or will use these fields to build it
             })
           });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateAppointmentStatus(id, newStatus) {
    try {
      await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      setAppointments(appointments.map(a => a.id === id ? { ...a, status: newStatus } : a));
      fetchDashboardData(); // Refresh stats
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  async function handleNotificationClick(notif) {
    if (notif.read) return;
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id, read: true })
      });
      setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  const patientSelectChange = (e) => {
    const pId = e.target.value;
    const p = patients.find(p => p.id === pId);
    setNewAppt({ ...newAppt, patientId: pId, patientName: p ? p.name : '' });
  };

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading dashboard...</div>;

  return (
    <div className="stagger">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 className="page-title">Good Morning, {user?.name || 'Doctor'} 👋</h1>
          <p className="page-subtitle">Here&apos;s your clinic overview for your team at Victoria Dental Care</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Appointment
        </button>
      </div>

      {/* Stats Row */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)', gridTemplateColumns: stats.isAdmin ? 'repeat(6, 1fr)' : 'repeat(3, 1fr)' }}>
        <StatCard icon="👤" iconClass="blue" value={stats.totalPatients || 0} label="Total Patients" change="Live DB" positive />
        {stats.isAdmin && (
          <>
            <StatCard icon="💰" iconClass="purple" value={`₹${stats.revenueDetails?.total?.toLocaleString()}`} label="Total Revenue" change="Incl. fees & bills" positive={true} />
            <StatCard icon="🦷" iconClass="blue" value={`₹${stats.revenueDetails?.treatment?.toLocaleString()}`} label="Treatment Rev" change="Fees only" positive={true} />
            <StatCard icon="🔪" iconClass="orange" value={`₹${stats.revenueDetails?.surgery?.toLocaleString()}`} label="Surgery Rev" change="Fees only" positive={true} />
          </>
        )}
        <StatCard icon="📅" iconClass="green" value={stats.statusCounts?.confirmed || 0} label="Confirmed Today" change="Scheduled" positive={true} />
        <div className="glass-card stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '12px 20px' }}>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-accent)' }}>{stats.statusCounts?.checkin || 0}</div>
              <div style={{ fontSize: '0.625rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Check-in</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-warning)' }}>{stats.statusCounts?.engaged || 0}</div>
              <div style={{ fontSize: '0.625rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Engaged</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>{stats.statusCounts?.checkout || 0}</div>
              <div style={{ fontSize: '0.625rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Out</div>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '8px', textAlign: 'center' }}>Live Status Today</div>
        </div>
        {stats.isAdmin && (
           <div className="glass-card stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '12px 20px', background: 'rgba(16, 185, 129, 0.1)' }}>
             <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)', textAlign: 'center' }}>{stats.statusCounts?.confirmed || 0}</div>
             <div style={{ fontSize: '0.625rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', textAlign: 'center' }}>Confirmed Today</div>
           </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid-dashboard">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Today's Patients */}
          <div className="glass-card-flat">
            <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
              <h2 className="section-title">Today&apos;s Patients</h2>
              <Link href="/appointments" className="btn btn-ghost btn-sm">View Calendar</Link>
            </div>
            
            {todayAppts.length === 0 ? (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No appointments for today.
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Patient</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayAppts.map(appt => (
                      <tr key={appt.id}>
                        <td style={{ fontWeight: 600 }}>{formatTime12h(appt.time)}</td>
                        <td>
                          <div className="flex-gap-sm">
                            <span style={{ fontWeight: 500 }}>{appt.patient_name || appt.patientName}</span>
                          </div>
                        </td>
                        <td><span className={`badge badge-${appt.type === 'checkup' ? 'info' : appt.type === 'cleaning' ? 'confirmed' : appt.type === 'treatment' ? 'pending' : 'purple'}`} style={{ textTransform: 'capitalize' }}>{appt.type}</span></td>
                        <td>
                          <select 
                            className={`status-select ${appt.status}`}
                            value={appt.status}
                            onChange={(e) => updateAppointmentStatus(appt.id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="checkin">Checked In</option>
                            <option value="engaged">Engaged</option>
                            <option value="checkout">Checked Out</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Upcoming Schedule */}
          <div className="glass-card-flat">
            <h2 className="section-title" style={{ marginBottom: 'var(--space-md)' }}>Upcoming Schedule</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {upcomingAppts.length === 0 ? (
                <div style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>No upcoming appointments for future dates.</div>
              ) : upcomingAppts.map(appt => (
                <div key={appt.id} className="appt-mini-card-row">
                  <div className="appt-mini-time-row">
                    <span style={{ fontWeight: 700 }}>{formatTime12h(appt.time)}</span>
                    <span style={{ opacity: 0.6, fontSize: '0.75rem', marginLeft: '6px' }}>{appt.date}</span>
                  </div>
                  <div className="appt-mini-patient-row">
                    <span style={{ fontWeight: 600 }}>{appt.patient_name || appt.patientName}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>• {appt.type}</span>
                  </div>
                  <div className={`status-badge-mini ${appt.status}`}>{appt.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Activity Timeline */}
          <div className="glass-card-flat">
            <h2 className="section-title" style={{ marginBottom: 'var(--space-md)' }}>Activity View</h2>
            <div className="timeline">
              {activityFeed.map((item, i) => (
                <div key={i} className="timeline-item">
                  <div className={`timeline-dot ${item.color}`} />
                  <div className="timeline-time">{item.time}</div>
                  <div className="timeline-text">{item.text}</div>
                  <div className="timeline-subtext">{item.subtext}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="glass-card-flat">
            <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
              <h2 className="section-title">Notifications</h2>
              <Link href="/notifications" className="btn btn-ghost btn-sm">All</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentNotifs.length === 0 ? (
                <div style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>No notifications</div>
              ) : recentNotifs.map(n => (
                <div 
                  key={n.id} 
                  className={`notification-item ${!n.read ? 'unread' : ''}`} 
                  onClick={() => handleNotificationClick(n)}
                  style={{ cursor: n.read ? 'default' : 'pointer' }}
                >
                  <div className="notification-icon" style={{ background: notifIconColors[n.type] }}>{notifIcons[n.type]}</div>
                  <div className="notification-content">
                    <div className="notification-title">{n.title}</div>
                    <div className="notification-desc">{n.message}</div>
                  </div>
                  <div className="notification-time">{n.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Appointment Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Appointment" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isSubmitting}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddAppointment} disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Appointment'}</button>
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
            <input type="date" className="input-field" value={newAppt.date} onChange={e => setNewAppt({...newAppt, date: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Time</label>
            <input type="time" className="input-field" value={newAppt.time} onChange={e => setNewAppt({...newAppt, time: e.target.value})} />
          </div>
        </div>
        <div className="input-group">
          <label>Appointment Type</label>
          <select className="input-field" value={newAppt.type} onChange={e => setNewAppt({...newAppt, type: e.target.value})}>
            <option value="checkup">Checkup</option>
            <option value="cleaning">Cleaning</option>
            <option value="treatment">Treatment</option>
            <option value="surgery">Surgery</option>
            <option value="consultation">Consultation</option>
          </select>
        </div>
        <div className="input-group">
          <label>Notes</label>
          <textarea className="input-field" placeholder="Add notes..." rows={3} value={newAppt.notes} onChange={e => setNewAppt({...newAppt, notes: e.target.value})} />
        </div>
      </Modal>
      <style jsx global>{`
        .status-select {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: var(--color-text);
          cursor: pointer;
          outline: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          background-size: 12px;
          padding-right: 28px;
        }
        .status-select:hover {
          background-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .status-select.pending { border-color: rgba(255, 255, 255, 0.2); }
        .status-select.confirmed { border-color: var(--color-success); color: var(--color-success); background: rgba(16, 185, 129, 0.1); }
        .status-select.checkin { border-color: var(--color-accent); color: var(--color-accent); background: rgba(59, 130, 246, 0.1); }
        .status-select.engaged { border-color: var(--color-warning); color: var(--color-warning); background: rgba(245, 158, 11, 0.1); }
        .status-select.checkout { border-color: var(--color-success); color: var(--color-success); background: rgba(16, 185, 129, 0.2); }
        .status-select.cancelled { border-color: var(--color-danger); color: var(--color-danger); background: rgba(239, 68, 68, 0.1); }

        .appt-mini-card-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          gap: 12px;
        }
        .appt-mini-time-row { display: flex; align-items: center; gap: 4px; min-width: 150px; }
        .appt-mini-patient-row { flex: 1; display: flex; align-items: center; gap: 4px; }
        .status-badge-mini {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 700;
          text-transform: uppercase;
          background: var(--color-bg-tertiary);
        }
        .status-badge-mini.checkin { color: var(--color-accent); background: var(--color-accent-light); }
        .status-badge-mini.engaged { color: var(--color-warning); background: var(--color-warning-light); }
        .status-badge-mini.checkout { color: var(--color-success); background: var(--color-success-light); }
        .status-badge-mini.confirmed { color: var(--color-success); background: var(--color-success-light); }
        .status-badge-mini.pending { color: var(--color-text-secondary); background: var(--color-bg-tertiary); }
        .status-badge-mini.cancelled { color: var(--color-danger); background: var(--color-danger-light); }
      `}</style>
    </div>
  );
}
