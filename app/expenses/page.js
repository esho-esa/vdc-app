'use client';
import { useState, useEffect } from 'react';
import Modal from '../../components/Modal';

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'list', 'categories', 'reports'
  const [user, setUser] = useState(null);
  
  // Data State
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [profitData, setProfitData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    categoryId: '',
    vendor: '',
    minAmount: '',
    maxAmount: '',
    search: ''
  });

  // Modals & Form States
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [expenseForm, setExpenseForm] = useState({
    id: '',
    category_id: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    payment_method: 'UPI',
    notes: '',
    attachment_url: ''
  });

  const [categoryForm, setCategoryForm] = useState({
    id: '',
    name: '',
    color: '#8e8e93',
    budget: ''
  });

  const [uploading, setUploading] = useState(false);
  const [selectedReportRange, setSelectedReportRange] = useState('month'); // 'day', 'week', 'month', 'year'

  const paymentMethods = ['Cash', 'UPI', 'Bank Transfer', 'Credit Card', 'Cheque', 'Other'];

  const fetchAllData = async () => {
    try {
      const qParams = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) qParams.append(k, v);
      });

      const [expRes, catRes, profitRes] = await Promise.all([
        fetch(`/api/expenses?${qParams.toString()}`).then(res => res.json()),
        fetch('/api/expenses/categories').then(res => res.json()),
        fetch('/api/dashboard/profit').then(res => res.json())
      ]);

      setExpenses(Array.isArray(expRes) ? expRes : []);
      setCategories(Array.isArray(catRes) ? catRes : []);
      if (!profitRes.error) {
        setProfitData(profitRes);
      }
      setLoading(false);
    } catch (err) {
      console.error('[Expenses] Load error:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    fetchAllData();
  }, [filters]);

  const isReadOnly = user?.role?.toLowerCase() === 'dentist';

  // Handle Receipt Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/expenses/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setExpenseForm({ ...expenseForm, attachment_url: data.fileUrl });
        alert('Receipt uploaded successfully.');
      } else {
        alert('Upload failed.');
      }
    } catch (err) {
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // Expense CRUD handlers
  const handleAddExpense = () => {
    if (isReadOnly) return;
    setExpenseForm({
      id: '',
      category_id: categories[0]?.id || '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      vendor_name: '',
      payment_method: 'UPI',
      notes: '',
      attachment_url: ''
    });
    setShowExpenseModal(true);
  };

  const handleEditExpense = (exp) => {
    if (isReadOnly) return;
    setExpenseForm({
      id: exp.id,
      category_id: exp.category_id,
      amount: exp.amount,
      expense_date: exp.expense_date,
      vendor_name: exp.vendor_name || '',
      payment_method: exp.payment_method,
      notes: exp.notes || '',
      attachment_url: exp.attachment_url || ''
    });
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async () => {
    if (isReadOnly) return;
    if (!expenseForm.category_id || !expenseForm.amount || !expenseForm.expense_date) {
      alert('Category, Amount, and Expense Date are required.');
      return;
    }

    setIsSaving(true);
    const method = expenseForm.id ? 'PUT' : 'POST';
    const url = expenseForm.id ? `/api/expenses/${expenseForm.id}` : '/api/expenses';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm)
      });

      if (res.ok) {
        setShowExpenseModal(false);
        fetchAllData();
      } else {
        const err = await res.json();
        alert('Save failed: ' + (err.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Network error.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (isReadOnly || !expenseForm.id) return;
    if (!confirm('Are you sure you want to delete this expense?')) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/expenses/${expenseForm.id}`, { method: 'DELETE' });
      if (res.ok) {
        setShowExpenseModal(false);
        fetchAllData();
      } else {
        alert('Failed to delete expense.');
      }
    } catch (err) {
      alert('Network error.');
    } finally {
      setIsSaving(false);
    }
  };

  // Category CRUD handlers
  const handleAddCategory = () => {
    if (isReadOnly) return;
    setCategoryForm({
      id: '',
      name: '',
      color: '#007aff',
      budget: ''
    });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (cat) => {
    if (isReadOnly) return;
    setCategoryForm({
      id: cat.id,
      name: cat.name,
      color: cat.color || '#8e8e93',
      budget: cat.budget || ''
    });
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (isReadOnly) return;
    if (!categoryForm.name) {
      alert('Category Name is required.');
      return;
    }

    setIsSaving(true);
    const method = categoryForm.id ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/expenses/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      });

      if (res.ok) {
        setShowCategoryModal(false);
        fetchAllData();
      } else {
        const err = await res.json();
        alert('Save failed: ' + (err.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Network error.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (isReadOnly || !categoryForm.id) return;
    if (!confirm('Are you sure you want to delete this category? (Recorded expenses may prevent deletion)')) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/expenses/categories?id=${categoryForm.id}`, { method: 'DELETE' });
      if (res.ok) {
        setShowCategoryModal(false);
        fetchAllData();
      } else {
        const err = await res.json();
        alert(err.error || 'Deletion failed.');
      }
    } catch (err) {
      alert('Network error.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = () => {
    window.open(`/api/reports/profit/pdf?range=${selectedReportRange}`, '_blank');
  };

  const handleExportCSV = () => {
    window.location.href = `/api/reports/profit/csv?range=${selectedReportRange}`;
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      categoryId: '',
      vendor: '',
      minAmount: '',
      maxAmount: '',
      search: ''
    });
  };

  if (loading || !profitData) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading Profit & Expense System...</div>;

  // Render SVG Revenue vs Expenses Grouped Bar Chart
  const renderRevenueVsExpensesChart = () => {
    const data = profitData.revenueVsExpensesChart || [];
    if (data.length === 0) return null;

    const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expenses))) || 10000;
    const chartHeight = 150;
    const chartWidth = 500;
    const barWidth = 14;
    const spacing = 40;

    return (
      <svg viewBox={`0 0 ${chartWidth} 200`} style={{ width: '100%', height: '220px' }}>
        {/* Horizontal Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = 20 + chartHeight * (1 - ratio);
          const val = Math.round(maxVal * ratio);
          return (
            <g key={i}>
              <line x1="50" y1={y} x2="480" y2={y} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4 4" />
              <text x="5" y={y + 3} fill="var(--color-text-secondary)" fontSize="8" fontFamily="Helvetica">
                ₹{val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              </text>
            </g>
          );
        })}

        {/* Vertical Bars */}
        {data.map((d, i) => {
          const x = 60 + i * spacing;
          const revHeight = (d.revenue / maxVal) * chartHeight;
          const expHeight = (d.expenses / maxVal) * chartHeight;

          const revY = 20 + chartHeight - revHeight;
          const expY = 20 + chartHeight - expHeight;

          return (
            <g key={i}>
              {/* Revenue Bar (Green) */}
              <rect x={x} y={revY} width={barWidth} height={revHeight} fill="#34c759" rx="3" />
              {/* Expenses Bar (Red) */}
              <rect x={x + barWidth + 3} y={expY} width={barWidth} height={expHeight} fill="#ff3b30" rx="3" />
              {/* Label */}
              <text x={x + barWidth} y="190" fill="var(--color-text-secondary)" fontSize="8" fontFamily="Helvetica" textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // Render Area chart for Profit Trend
  const renderProfitTrendChart = () => {
    const data = profitData.monthlyProfitTrendChart || [];
    if (data.length === 0) return null;

    const profits = data.map(d => d.profit);
    const maxVal = Math.max(...profits.map(Math.abs)) || 10000;
    const chartHeight = 130;
    const chartWidth = 500;
    const spacing = 38;

    // Create polyline points
    const points = data.map((d, i) => {
      const x = 60 + i * spacing;
      // Center line is y = 85 (representing 0 profit). Height spreads +/- 65
      const y = 85 - (d.profit / maxVal) * 60;
      return { x, y };
    });

    const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
    // Points for the filled gradient area under the curve
    const areaPointsStr = `${points[0].x},150 ${pointsStr} ${points[points.length - 1].x},150`;

    return (
      <svg viewBox={`0 0 ${chartWidth} 180`} style={{ width: '100%', height: '200px' }}>
        <defs>
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Center Zero line */}
        <line x1="50" y1="85" x2="480" y2="85" stroke="var(--color-border)" strokeWidth="1" />
        <text x="5" y="88" fill="var(--color-text-secondary)" fontSize="8" fontFamily="Helvetica">₹0</text>
        <text x="5" y="28" fill="var(--color-text-secondary)" fontSize="8" fontFamily="Helvetica">₹+{maxVal >= 1000 ? `${(maxVal/1000).toFixed(0)}k` : maxVal}</text>
        <text x="5" y="148" fill="var(--color-text-secondary)" fontSize="8" fontFamily="Helvetica">₹-${maxVal >= 1000 ? `${(maxVal/1000).toFixed(0)}k` : maxVal}</text>

        {/* Filled gradient area */}
        <polygon points={areaPointsStr} fill="url(#profitGrad)" />

        {/* Profit Trend Path */}
        <polyline fill="none" stroke="var(--color-primary)" strokeWidth="3" points={pointsStr} />

        {/* Plot points and month labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--color-primary)" stroke="#fff" strokeWidth="1.5" />
            <text x={p.x} y="170" fill="var(--color-text-secondary)" fontSize="8" fontFamily="Helvetica" textAnchor="middle">
              {data[i].label}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  // Render SVG Donut Category Breakdown chart
  const renderCategoryBreakdownChart = () => {
    const data = profitData.expenseCategoryBreakdown || [];
    if (data.length === 0) return <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: 40 }}>No expenses recorded.</div>;

    const radius = 55;
    const circ = 2 * Math.PI * radius;
    let accumulatedAngle = 0;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            {data.map((cat, i) => {
              const strokeLength = (cat.percentage / 100) * circ;
              const strokeOffset = circ - strokeLength + accumulatedAngle;
              accumulatedAngle -= strokeLength;

              return (
                <circle
                  key={i}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke={cat.color}
                  strokeWidth="18"
                  strokeDasharray={`${strokeLength} ${circ - strokeLength}`}
                  strokeDashoffset={strokeOffset}
                  transform="rotate(-90 70 70)"
                />
              );
            })}
            {/* Center Hole */}
            <circle cx="70" cy="70" r="40" fill="var(--color-surface)" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Spent</span>
            <span style={{ fontSize: '1rem', fontWeight: 700 }}>₹{profitData.totalExpenses >= 1000 ? `${(profitData.totalExpenses / 1000).toFixed(0)}k` : profitData.totalExpenses}</span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
          {data.slice(0, 5).map((cat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: cat.color, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{cat.name}</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{cat.percentage.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="stagger">
      {/* Top Banner */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 className="page-title">Expenses & Profit Insights</h1>
          <p className="page-subtitle">Convert clinic revenues into profits. Log expenses, analyze margins, and export logs.</p>
        </div>
        {!isReadOnly && (
          <button className="btn btn-primary" onClick={handleAddExpense}>+ Add Expense</button>
        )}
      </div>

      {/* Primary Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-lg)' }}>
        <button 
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'dashboard' ? '3px solid var(--color-accent)' : '3px solid transparent',
            color: activeTab === 'dashboard' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'dashboard' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          📈 Profit Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('list')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'list' ? '3px solid var(--color-accent)' : '3px solid transparent',
            color: activeTab === 'list' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'list' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          📝 Expenses Ledger
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'categories' ? '3px solid var(--color-accent)' : '3px solid transparent',
            color: activeTab === 'categories' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'categories' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          🏷️ Categories & Budgets
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'reports' ? '3px solid var(--color-accent)' : '3px solid transparent',
            color: activeTab === 'reports' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontWeight: activeTab === 'reports' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          📋 Financial Exports
        </button>
      </div>

      {/* Active Tab: Dashboard */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Alerts Feed */}
          {profitData.alerts?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {profitData.alerts.map((alt, i) => (
                <div key={i} style={{ 
                  padding: '12px 20px', 
                  borderRadius: '10px', 
                  background: alt.type === 'danger' ? 'rgba(255,59,48,0.1)' : alt.type === 'warning' ? 'rgba(255,159,10,0.1)' : 'rgba(0,122,255,0.1)',
                  color: alt.type === 'danger' ? '#ff3b30' : alt.type === 'warning' ? '#ff9f0a' : '#007aff',
                  border: `1px solid ${alt.type === 'danger' ? 'rgba(255,59,48,0.2)' : alt.type === 'warning' ? 'rgba(255,159,10,0.2)' : 'rgba(0,122,255,0.2)'}`,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{alt.type === 'danger' ? '🚨' : alt.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                  <div>
                    <strong>{alt.title}</strong>: {alt.message}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* KPI Widget Cards */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="glass-card stat-card">
              <div className="stat-icon green">💰</div>
              <div className="stat-info">
                <div className="stat-value">₹{profitData.totalRevenue.toLocaleString()}</div>
                <div className="stat-label">Total Revenue (Collected)</div>
              </div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-icon red">💸</div>
              <div className="stat-info">
                <div className="stat-value">₹{profitData.totalExpenses.toLocaleString()}</div>
                <div className="stat-label">Total Expenses</div>
              </div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-icon blue">📈</div>
              <div className="stat-info">
                <div className="stat-value">₹{profitData.netProfit.toLocaleString()}</div>
                <div className="stat-label">Net Profit (Cash Flow)</div>
              </div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-icon purple">📊</div>
              <div className="stat-info">
                <div className="stat-value">{profitData.profitMargin.toFixed(1)}%</div>
                <div className="stat-label">Cash Profit Margin</div>
              </div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-icon orange">📋</div>
              <div className="stat-info">
                <div className="stat-value">₹{profitData.outstandingReceivables.toLocaleString()}</div>
                <div className="stat-label">Outstanding Balance</div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
            <div className="glass-card-flat" style={{ padding: 24 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Revenue vs Expenses</h2>
              {renderRevenueVsExpensesChart()}
            </div>
            <div className="glass-card-flat" style={{ padding: 24 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Monthly Profit Trend</h2>
              {renderProfitTrendChart()}
            </div>
          </div>

          {/* Breakdown & Clinic Insights */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-lg)' }}>
            {/* Category Pie */}
            <div className="glass-card-flat" style={{ padding: 24 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '24px' }}>Expense Category Breakdown</h2>
              {renderCategoryBreakdownChart()}
            </div>

            {/* Clinic Insights */}
            <div className="glass-card-flat" style={{ padding: 24 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px' }}>Clinic Financial Insights</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Most Expensive Category</span>
                  <strong style={{ fontSize: '0.95rem' }}>{profitData.insights?.mostExpensiveCategory} (₹{profitData.insights?.mostExpensiveAmount?.toLocaleString()})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Avg. Daily Profit (This Month)</span>
                  <strong style={{ fontSize: '0.95rem', color: '#34c759' }}>₹{Math.round(profitData.insights?.avgDailyProfit || 0).toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Revenue Growth (MoM)</span>
                  <strong style={{ fontSize: '0.95rem', color: profitData.insights?.revenueGrowthPercentage >= 0 ? '#34c759' : '#ff3b30' }}>
                    {profitData.insights?.revenueGrowthPercentage >= 0 ? '▲' : '▼'} {Math.abs(profitData.insights?.revenueGrowthPercentage)}%
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Expense Growth (MoM)</span>
                  <strong style={{ fontSize: '0.95rem', color: profitData.insights?.expenseGrowthPercentage >= 0 ? '#ff3b30' : '#34c759' }}>
                    {profitData.insights?.expenseGrowthPercentage >= 0 ? '▲' : '▼'} {Math.abs(profitData.insights?.expenseGrowthPercentage)}%
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Tab: Expenses List */}
      {activeTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Filters Panel */}
          <div className="glass-card-flat" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Filter Expenses</h2>
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear Filters</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div className="input-group">
                <label style={{ fontSize: '0.75rem' }}>Search Notes / Vendor</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Dental Tech" 
                  value={filters.search} 
                  onChange={e => setFilters({ ...filters, search: e.target.value })} 
                />
              </div>
              <div className="input-group">
                <label style={{ fontSize: '0.75rem' }}>Category</label>
                <select 
                  className="input-field" 
                  value={filters.categoryId} 
                  onChange={e => setFilters({ ...filters, categoryId: e.target.value })}
                  style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label style={{ fontSize: '0.75rem' }}>Start Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={filters.startDate} 
                  onChange={e => setFilters({ ...filters, startDate: e.target.value })} 
                />
              </div>
              <div className="input-group">
                <label style={{ fontSize: '0.75rem' }}>End Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={filters.endDate} 
                  onChange={e => setFilters({ ...filters, endDate: e.target.value })} 
                />
              </div>
              <div className="input-group">
                <label style={{ fontSize: '0.75rem' }}>Min Amount</label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="₹ Min"
                  value={filters.minAmount} 
                  onChange={e => setFilters({ ...filters, minAmount: e.target.value })} 
                />
              </div>
              <div className="input-group">
                <label style={{ fontSize: '0.75rem' }}>Max Amount</label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="₹ Max"
                  value={filters.maxAmount} 
                  onChange={e => setFilters({ ...filters, maxAmount: e.target.value })} 
                />
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="glass-card-flat" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    <th style={{ padding: '12px 20px' }}>Date</th>
                    <th style={{ padding: '12px 20px' }}>Category</th>
                    <th style={{ padding: '12px 20px' }}>Vendor</th>
                    <th style={{ padding: '12px 20px' }}>Payment Method</th>
                    <th style={{ padding: '12px 20px' }}>Notes</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '12px 20px', textAlign: 'center' }}>Receipt</th>
                    {!isReadOnly && <th style={{ padding: '12px 20px', textAlign: 'center' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        No matching expenses found.
                      </td>
                    </tr>
                  ) : (
                    expenses.map(exp => (
                      <tr key={exp.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '16px 20px' }}>{exp.expense_date}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                            background: `${exp.expense_categories?.color || '#8e8e93'}15`,
                            color: exp.expense_categories?.color || '#8e8e93',
                            border: `1px solid ${exp.expense_categories?.color || '#8e8e93'}30`
                          }}>{exp.expense_categories?.name || 'Unassigned'}</span>
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 500 }}>{exp.vendor_name || 'N/A'}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span className="badge badge-info">{exp.payment_method}</span>
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {exp.notes || '-'}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600 }}>
                          ₹{parseFloat(exp.amount).toLocaleString()}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          {exp.attachment_url ? (
                            <a href={exp.attachment_url} target="_blank" rel="noreferrer" style={{ fontSize: '1.2rem', textDecoration: 'none' }} title="View Receipt">📄</a>
                          ) : (
                            <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>
                          )}
                        </td>
                        {!isReadOnly && (
                          <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleEditExpense(exp)}>Edit</button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Active Tab: Categories Configuration */}
      {activeTab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div className="flex-between">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Configured expense Categories</h2>
            {!isReadOnly && (
              <button className="btn btn-secondary btn-sm" onClick={handleAddCategory}>+ Add Category</button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {categories.map(cat => (
              <div key={cat.id} className="glass-card-flat" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: 14, height: 40, borderRadius: '4px', background: cat.color || '#8e8e93' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{cat.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    Limit: ₹{parseFloat(cat.budget || 0).toLocaleString()} / month
                  </div>
                </div>
                {!isReadOnly && (
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEditCategory(cat)}>Edit</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Tab: Financial Exports */}
      {activeTab === 'reports' && (
        <div className="glass-card-flat" style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>Generate Financial Statements</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Export comprehensive reports detailing collected revenue, incurred expenses, and profit margins.
          </p>

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label>Reporting Timeframe</label>
            <select 
              className="input-field" 
              value={selectedReportRange} 
              onChange={e => setSelectedReportRange(e.target.value)}
              style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
            >
              <option value="day">Daily Report (Today)</option>
              <option value="week">Weekly Report (Past 7 Days)</option>
              <option value="month">Monthly Report (Past 30 Days)</option>
              <option value="year">Annual Report (Past 365 Days)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleExportPDF}>
              📄 Export PDF Report
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleExportCSV}>
              📊 Export CSV Spreadsheet
            </button>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      <Modal 
        isOpen={showExpenseModal} 
        onClose={() => setShowExpenseModal(false)} 
        title={expenseForm.id ? "Edit Expense Entry" : "Record New Expense"} 
        footer={
          <>
            {expenseForm.id && !isReadOnly && (
              <button className="btn btn-ghost" onClick={handleDeleteExpense} disabled={isSaving} style={{ color: 'var(--color-danger)', marginRight: 'auto' }}>
                Delete
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => setShowExpenseModal(false)} disabled={isSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveExpense} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Expense'}</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="input-group">
              <label>Category</label>
              <select 
                className="input-field" 
                value={expenseForm.category_id} 
                onChange={e => setExpenseForm({ ...expenseForm, category_id: e.target.value })}
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>Amount (INR)</label>
              <input type="number" className="input-field" placeholder="e.g. 15000" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
            </div>
          </div>

          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="input-group">
              <label>Expense Date</label>
              <input type="date" className="input-field" value={expenseForm.expense_date} onChange={e => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Vendor Name</label>
              <input type="text" className="input-field" placeholder="e.g. Dental Tech Ltd" value={expenseForm.vendor_name} onChange={e => setExpenseForm({ ...expenseForm, vendor_name: e.target.value })} />
            </div>
          </div>

          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="input-group">
              <label>Payment Method</label>
              <select 
                className="input-field" 
                value={expenseForm.payment_method} 
                onChange={e => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
              >
                {paymentMethods.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            {/* Receipt Upload */}
            <div className="input-group">
              <label>Receipt Attachment</label>
              {expenseForm.attachment_url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#34c759' }}>✓ Attached</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setExpenseForm({ ...expenseForm, attachment_url: '' })} style={{ color: 'var(--color-danger)' }}>Remove</button>
                </div>
              ) : (
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', textAlign: 'center', width: '100%' }}>
                  {uploading ? 'Uploading...' : 'Upload Receipt / Invoice'}
                  <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>

          <div className="input-group">
            <label>Notes / Description</label>
            <textarea className="input-field" rows="3" placeholder="Additional details..." value={expenseForm.notes} onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal 
        isOpen={showCategoryModal} 
        onClose={() => setShowCategoryModal(false)} 
        title={categoryForm.id ? "Edit Category" : "New Category"} 
        footer={
          <>
            {categoryForm.id && !isReadOnly && (
              <button className="btn btn-ghost" onClick={handleDeleteCategory} disabled={isSaving} style={{ color: 'var(--color-danger)', marginRight: 'auto' }}>
                Delete
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => setShowCategoryModal(false)} disabled={isSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveCategory} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Category'}</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="input-group">
            <label>Category Name</label>
            <input type="text" className="input-field" placeholder="e.g. Office Supplies" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} />
          </div>
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="input-group">
              <label>Monthly Budget Limit (₹)</label>
              <input type="number" className="input-field" placeholder="e.g. 20000" value={categoryForm.budget} onChange={e => setCategoryForm({ ...categoryForm, budget: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Highlight Tag Color</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                {['#ff3b30', '#ff9f0a', '#34c759', '#007aff', '#af52de', '#ff2d55', '#5856d6'].map(col => (
                  <button
                    key={col}
                    onClick={() => setCategoryForm({ ...categoryForm, color: col })}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: col, border: categoryForm.color === col ? '2.5px solid var(--color-text-primary)' : '2px solid transparent',
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
