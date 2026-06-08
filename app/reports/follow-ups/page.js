'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FollowUpsReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ completionRate: 0, missedRate: 0, returningPatientPercent: 0, counts: { Scheduled: 0, Completed: 0, Missed: 0, Cancelled: 0 } });
  const [followUpsList, setFollowUpsList] = useState([]);
  const [missedPatientsList, setMissedPatientsList] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'missed'

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed.role !== 'admin') {
        router.replace('/');
        return;
      }
    } else {
      router.replace('/login');
      return;
    }

    fetchReportData();
  }, [router]);

  function fetchReportData() {
    setLoading(true);
    fetch('/api/reports/follow-ups')
      .then((res) => res.json())
      .then((d) => {
        if (!d.error) {
          setMetrics(d.metrics);
          setFollowUpsList(d.followUpsList || []);
          setMissedPatientsList(d.missedPatientsList || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch follow-ups report:', err);
        setLoading(false);
      });
  }

  // Filter handlers
  const filteredFollowups = followUpsList.filter((item) => {
    const term = search.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(term) ||
      (item.phone && item.phone.includes(term)) ||
      (item.followupType && item.followupType.toLowerCase().includes(term)) ||
      (item.notes && item.notes.toLowerCase().includes(term));

    const matchesStatus = statusFilter ? item.status === statusFilter : true;
    const matchesStartDate = startDate ? item.followupDate >= startDate : true;
    const matchesEndDate = endDate ? item.followupDate <= endDate : true;

    return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate;
  });

  const filteredMissed = missedPatientsList.filter((item) => {
    const term = search.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(term) ||
      (item.phone && item.phone.includes(term)) ||
      (item.followupType && item.followupType.toLowerCase().includes(term)) ||
      (item.notes && item.notes.toLowerCase().includes(term));

    const matchesStartDate = startDate ? item.followupDate >= startDate : true;
    const matchesEndDate = endDate ? item.followupDate <= endDate : true;

    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  // Export CSV Handler
  const handleExportCSV = () => {
    const targetData = activeTab === 'all' ? filteredFollowups : filteredMissed;
    if (targetData.length === 0) return;

    const headers = ['Patient Name', 'Phone Number', 'Email', 'Follow-Up Date', 'Follow-Up Type', 'Status', 'Notes'];
    const rows = targetData.map((item) => [
      item.name,
      item.phone || 'N/A',
      item.email || 'N/A',
      item.followupDate,
      item.followupType,
      item.status || 'Missed',
      item.notes || ''
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTab === 'all' ? 'follow_up_report' : 'missed_patients_report'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading reports & clinical insights...</div>;

  return (
    <div className="stagger">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 className="page-title">Follow-Ups & Clinical Insights 📊</h1>
          <p className="page-subtitle">Retention statistics, completion metrics, and scheduling reports</p>
        </div>
        <div>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={handleExportCSV} 
            disabled={(activeTab === 'all' ? filteredFollowups : filteredMissed).length === 0}
          >
            📥 Export CSV Statement
          </button>
        </div>
      </div>

      {/* Aggregate Cards Grid */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div className="stat-icon green">📈</div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>{metrics.completionRate}%</div>
            <div className="stat-label">Completion Rate</div>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div className="stat-icon red">⚠️</div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{metrics.missedRate}%</div>
            <div className="stat-label">Missed Rate</div>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
          <div className="stat-icon blue">🔄</div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--color-accent)' }}>{metrics.returningPatientPercent}%</div>
            <div className="stat-label">Returning Patients %</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon purple">🗓️</div>
          <div className="stat-info">
            <div className="stat-value">{metrics.counts.Scheduled}</div>
            <div className="stat-label">Pending Scheduled</div>
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div className="glass-card-flat" style={{ marginBottom: 'var(--space-lg)', padding: '16px' }}>
        <div className="grid-4" style={{ gap: '12px', alignItems: 'center' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Search Query</label>
            <input
              type="text"
              className="input-field"
              placeholder="Search by name, type, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ margin: 0, padding: '8px 12px', fontSize: '0.85rem' }}
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Start Date</label>
            <input
              type="date"
              className="input-field"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ margin: 0, padding: '8px 12px', fontSize: '0.85rem' }}
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>End Date</label>
            <input
              type="date"
              className="input-field"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ margin: 0, padding: '8px 12px', fontSize: '0.85rem' }}
            />
          </div>
          {activeTab === 'all' && (
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Status</label>
              <select
                className="input-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ margin: 0, padding: '8px 12px', fontSize: '0.85rem' }}
              >
                <option value="">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Missed">Missed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>
        {(search || startDate || endDate || statusFilter) && (
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); setStatusFilter(''); }} 
            style={{ marginTop: '8px', padding: '4px 0', fontSize: '0.8rem' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Report Segment Tabs */}
      <div className="tab-container" style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '16px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'all' ? '3px solid var(--color-accent)' : '3px solid transparent',
            color: activeTab === 'all' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'all' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '0.95rem',
            transition: 'all 0.2s ease'
          }}
        >
          🔁 All Follow-Ups ({filteredFollowups.length})
        </button>
        <button
          onClick={() => setActiveTab('missed')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'missed' ? '3px solid var(--color-danger)' : '3px solid transparent',
            color: activeTab === 'missed' ? 'var(--color-danger)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'missed' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '0.95rem',
            transition: 'all 0.2s ease'
          }}
        >
          ⚠️ Missed Patients List ({filteredMissed.length})
        </button>
      </div>

      {/* Main Table */}
      <div className="glass-card-flat">
        {activeTab === 'all' ? (
          filteredFollowups.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Phone</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFollowups.map((item) => {
                    let badgeBg = 'rgba(59, 130, 246, 0.1)';
                    let badgeColor = 'var(--color-accent)';
                    if (item.status === 'Completed') {
                      badgeBg = 'rgba(16, 185, 129, 0.12)';
                      badgeColor = 'var(--color-success)';
                    } else if (item.status === 'Missed') {
                      badgeBg = 'var(--color-danger-light)';
                      badgeColor = 'var(--color-danger)';
                    } else if (item.status === 'Cancelled') {
                      badgeBg = 'rgba(245, 158, 11, 0.12)';
                      badgeColor = 'var(--color-warning)';
                    }

                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>
                          <Link href={`/patients/${item.patientId}`} style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                            {item.name}
                          </Link>
                        </td>
                        <td>{item.phone || 'N/A'}</td>
                        <td style={{ fontWeight: 500 }}>{item.followupDate}</td>
                        <td>{item.followupType}</td>
                        <td>
                          <span className="badge" style={{ background: badgeBg, color: badgeColor, border: 'none', fontWeight: 'bold' }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.notes}>
                          {item.notes || '-'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Link href={`/patients/${item.patientId}?tab=followups`} className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-accent)', textDecoration: 'none', border: 'none' }}>
                            👁️ View Log
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              No follow-up records found matching filter search.
            </div>
          )
        ) : (
          filteredMissed.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Missed Date</th>
                    <th>Type</th>
                    <th>Notes</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMissed.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>
                        <Link href={`/patients/${item.patientId}`} style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                          {item.name}
                        </Link>
                      </td>
                      <td>{item.phone || 'N/A'}</td>
                      <td>{item.email || 'N/A'}</td>
                      <td style={{ color: 'var(--color-danger)', fontWeight: 500 }}>{item.followupDate}</td>
                      <td>{item.followupType}</td>
                      <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.notes}>
                        {item.notes || '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <a 
                          href={`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${item.name}, this is Victoria Dental Care. We noticed you missed your follow-up appointment for ${item.followupType} on ${item.followupDate}. Please contact us to reschedule.`)}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="badge" 
                          style={{ textDecoration: 'none', border: 'none', background: 'rgba(37, 211, 102, 0.15)', color: '#25d366', cursor: 'pointer' }}
                        >
                          💬 Direct WhatsApp Alert
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              No patients with missed follow-ups records in this range.
            </div>
          )
        )}
      </div>
    </div>
  );
}
