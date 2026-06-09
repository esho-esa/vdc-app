'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RemindersHistory() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      let parsed = {};
      try { parsed = JSON.parse(savedUser); } catch (e) { /* corrupted */ }
      if (parsed.role !== 'admin' && parsed.role !== 'receptionist') {
        router.replace('/');
        return;
      }
    }

    fetch('/api/reminders/history')
      .then(res => res.json())
      .then(d => {
        setLogs(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch reminder history:', err);
        setLoading(false);
      });
  }, [router]);

  const filteredLogs = logs.filter(log => filter === 'all' ? true : log.status.toLowerCase() === filter);

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Reminder History 📱</h1>
        <div className="header-actions">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-field" style={{ width: '150px' }}>
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          <button className="btn btn-primary" onClick={() => fetch('/api/reminders/process', { method: 'POST' }).then(() => window.location.reload())}>
            Run Reminders Now
          </button>
        </div>
      </header>

      <div className="card">
        {loading ? (
          <div className="loading-spinner" />
        ) : filteredLogs.length === 0 ? (
          <div className="empty-state">No reminder history found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>Channel</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.reminder_date).toLocaleString()}</td>
                    <td style={{ fontWeight: 500 }}>{log.patients?.name || 'N/A'}</td>
                    <td>{log.reminder_type}</td>
                    <td>{log.channel}</td>
                    <td>
                      <span className={`badge badge-${log.status.toLowerCase() === 'sent' ? 'success' : log.status.toLowerCase() === 'failed' ? 'danger' : 'warning'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
