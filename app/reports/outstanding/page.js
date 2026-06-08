'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OutstandingPaymentsReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');

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

    fetch('/api/reports/outstanding')
      .then((res) => res.json())
      .then((d) => {
        setData(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch outstanding report:', err);
        setLoading(false);
      });
  }, [router]);

  // Client-side search filtering
  const filteredData = data.filter((item) => {
    const term = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      (item.phone && item.phone.includes(term))
    );
  });

  // Calculate totals
  const totalBilled = filteredData.reduce((sum, item) => sum + item.totalBilled, 0);
  const totalPaid = filteredData.reduce((sum, item) => sum + item.totalPaid, 0);
  const totalPending = filteredData.reduce((sum, item) => sum + item.pending, 0);

  // CSV Export handler
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    
    const headers = ['Patient Name', 'Phone Number', 'Email', 'Total Billed (INR)', 'Total Paid (INR)', 'Pending Balance (INR)', 'Due Date', 'Status'];
    const rows = filteredData.map((item) => [
      item.name,
      item.phone || 'N/A',
      item.email || 'N/A',
      item.totalBilled.toFixed(2),
      item.totalPaid.toFixed(2),
      item.pending.toFixed(2),
      item.due_date || 'None',
      item.status
    ]);

    const csvContent = 
      'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `outstanding_payments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading report data...</div>;

  return (
    <div className="stagger">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 className="page-title">Outstanding Payments Report 📋</h1>
          <p className="page-subtitle">Patients with pending balances and financial aggregates</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV} disabled={filteredData.length === 0}>
            📥 Export CSV
          </button>
          <a href="/api/reports/outstanding/pdf" target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
            🖨️ Print PDF Report
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card-flat" style={{ marginBottom: 'var(--space-lg)', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '1.2rem' }}>🔍</span>
          <input
            type="text"
            className="input-field"
            placeholder="Search patient by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ margin: 0, padding: '10px 14px' }}
          />
        </div>
      </div>

      {/* Aggregate Cards Grid */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="glass-card stat-card">
          <div className="stat-icon purple">💰</div>
          <div className="stat-info">
            <div className="stat-value">₹{totalBilled.toLocaleString('en-IN')}</div>
            <div className="stat-label">Total Billed</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon green">💵</div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>₹{totalPaid.toLocaleString('en-IN')}</div>
            <div className="stat-label">Total Paid</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon orange">⚠️</div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--color-warning)' }}>₹{totalPending.toLocaleString('en-IN')}</div>
            <div className="stat-label">Outstanding Balance</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card-flat">
        <h2 className="section-title" style={{ marginBottom: 'var(--space-md)' }}>Outstanding Ledgers ({filteredData.length})</h2>
        {filteredData.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Phone Number</th>
                  <th style={{ textAlign: 'right' }}>Total Billed (₹)</th>
                  <th style={{ textAlign: 'right' }}>Total Paid (₹)</th>
                  <th style={{ textAlign: 'right' }}>Outstanding Balance (₹)</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((p) => {
                  let badgeBg = 'rgba(59, 130, 246, 0.1)';
                  let badgeColor = 'var(--color-accent)';
                  if (p.status === 'OVERDUE') {
                    badgeBg = 'var(--color-danger-light)';
                    badgeColor = 'var(--color-danger)';
                  } else if (p.status === 'UNPAID') {
                    badgeBg = 'var(--color-warning-light)';
                    badgeColor = 'var(--color-warning)';
                  } else if (p.status === 'PARTIALLY PAID') {
                    badgeBg = 'rgba(175, 82, 222, 0.12)';
                    badgeColor = 'var(--color-purple)';
                  }

                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>
                        <Link href={`/patients/${p.id}`} className="patient-link" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                          {p.name}
                        </Link>
                      </td>
                      <td>{p.phone || 'N/A'}</td>
                      <td style={{ textAlign: 'right' }}>{p.totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 500 }}>
                        {p.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-warning)', fontWeight: 600 }}>
                        {p.pending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>{p.due_date || 'N/A'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{ background: badgeBg, color: badgeColor, border: 'none', fontWeight: 'bold' }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Link href={`/patients/${p.id}`} className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-accent)', textDecoration: 'none', border: 'none', cursor: 'pointer' }}>
                          👁️ View Profile
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {/* Summary row */}
                <tr style={{ fontWeight: 700, background: 'rgba(255,255,255,0.02)', borderTop: '2px solid var(--color-border)' }}>
                  <td>TOTALS</td>
                  <td>-</td>
                  <td style={{ textAlign: 'right' }}>{totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-success)' }}>
                    {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-warning)' }}>
                    {totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No patient records found with outstanding balance.
          </div>
        )}
      </div>
      <style jsx>{`
        .patient-link:hover {
          text-decoration: underline !important;
        }
      `}</style>
    </div>
  );
}
