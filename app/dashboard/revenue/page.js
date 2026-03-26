'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function RevenueDashboard() {
  const router = useRouter();
  const chartRef = useRef(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed.role !== 'admin') {
        router.replace('/');
        return;
      }
      setUser(parsed);
    } else {
      router.replace('/login');
      return;
    }

    fetch('/api/dashboard/revenue')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  // Draw chart when data is ready
  useEffect(() => {
    if (!data?.monthlyTrend?.length || !chartRef.current) return;

    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const trend = data.monthlyTrend;
    const maxRev = Math.max(...trend.map((t) => t.revenue), 1);

    const padLeft = 70;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 50;
    const chartW = W - padLeft - padRight;
    const chartH = H - padTop - padBottom;
    const barW = Math.min(chartW / trend.length - 8, 40);

    // Background
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(W - padRight, y);
      ctx.stroke();

      // Y labels
      const val = maxRev - (maxRev / 4) * i;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`₹${Math.round(val).toLocaleString()}`, padLeft - 10, y + 4);
    }

    // Bars
    trend.forEach((item, i) => {
      const x = padLeft + (chartW / trend.length) * i + (chartW / trend.length - barW) / 2;
      const barH = (item.revenue / maxRev) * chartH;
      const y = padTop + chartH - barH;

      // Gradient bar
      const grad = ctx.createLinearGradient(x, y, x, padTop + chartH);
      grad.addColorStop(0, 'rgba(59, 130, 246, 0.9)');
      grad.addColorStop(1, 'rgba(59, 130, 246, 0.3)');
      ctx.fillStyle = grad;

      // Rounded top
      const radius = Math.min(barW / 2, 6);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barW - radius, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
      ctx.lineTo(x + barW, padTop + chartH);
      ctx.lineTo(x, padTop + chartH);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.fill();

      // X label
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label, x + barW / 2, padTop + chartH + 20);
    });
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
        Loading revenue data...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        Unable to load revenue data.
      </div>
    );
  }

  return (
    <div className="stagger">
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="page-title">Revenue Dashboard 💰</h1>
        <p className="page-subtitle">Financial overview for Victoria Dental Care</p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="glass-card stat-card">
          <div className="stat-icon green">📅</div>
          <div className="stat-info">
            <div className="stat-value">₹{data.todayRevenue.toLocaleString()}</div>
            <div className="stat-label">Today's Revenue</div>
            <div className="stat-change positive">↑ Live</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon blue">📊</div>
          <div className="stat-info">
            <div className="stat-value">₹{data.monthlyRevenue.toLocaleString()}</div>
            <div className="stat-label">Monthly Revenue</div>
            <div className="stat-change positive">↑ This month</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon purple">💎</div>
          <div className="stat-info">
            <div className="stat-value">₹{data.totalRevenue.toLocaleString()}</div>
            <div className="stat-label">Total Revenue</div>
            <div className="stat-change positive">↑ All time</div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="glass-card-flat" style={{ marginBottom: 'var(--space-lg)' }}>
        <h2 className="section-title" style={{ marginBottom: 'var(--space-md)' }}>Monthly Revenue Trend</h2>
        <div style={{ width: '100%', height: '300px', position: 'relative' }}>
          <canvas
            ref={chartRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="glass-card-flat">
        <h2 className="section-title" style={{ marginBottom: 'var(--space-md)' }}>Recent Payments</h2>
        {data.recentPayments.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient Name</th>
                  <th>Amount</th>
                  <th>Doctor Fee</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPayments.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{p.date}</td>
                    <td>{p.patientName}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td style={{ color: 'var(--color-accent)' }}>
                      ₹{p.doctorFee.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No payment records found.
          </div>
        )}
      </div>
    </div>
  );
}
