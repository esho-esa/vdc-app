'use client';
import { useState, useEffect } from 'react';
import Modal from '../../components/Modal';

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock', 'suppliers', 'po', 'reports'
  const [loading, setLoading] = useState(true);

  // Core data states
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [reportsData, setReportsData] = useState(null);

  // Modals visibility
  const [showItemModal, setShowItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showPODetailsModal, setShowPODetailsModal] = useState(false);

  // Selected item states
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);

  // Form states matching new schema
  const [itemFormData, setItemFormData] = useState({ 
    itemName: '', 
    category: 'Dental Material', 
    sku: '', 
    unit: 'Pcs', 
    currentStock: '0', 
    minimumStock: '0', 
    purchasePrice: '0', 
    sellingPrice: '0', 
    supplierId: '', 
    expiryDate: '' 
  });
  const [supplierFormData, setSupplierFormData] = useState({ 
    supplier_name: '', 
    phone: '', 
    email: '', 
    address: '' 
  });
  
  // PO Form states
  const [poSupplierId, setPOSupplierId] = useState('');
  const [poItemsList, setPOItemsList] = useState([{ itemId: '', quantity: '1', unitPrice: '0' }]);
  const [poStatus, setPOStatus] = useState('Draft');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockLevelFilter, setStockLevelFilter] = useState('all'); // 'all', 'low', 'out', 'normal'
  
  // Reports page states
  const [reportType, setReportType] = useState('Stock'); // 'Stock', 'Purchase', 'Consumption', 'Supplier'

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [itemsRes, suppliersRes, poRes, reportsRes] = await Promise.all([
        fetch('/api/inventory/items'),
        fetch('/api/suppliers'),
        fetch('/api/purchase-orders'),
        fetch('/api/reports/inventory')
      ]);

      const [itemsData, suppliersData, poData, reportsData] = await Promise.all([
        itemsRes.json(),
        suppliersRes.json(),
        poRes.json(),
        reportsRes.json()
      ]);

      if (!itemsData.error) setItems(itemsData);
      if (!suppliersData.error) setSuppliers(suppliersData);
      if (!poData.error) setPurchaseOrders(poData);
      if (!reportsData.error) setReportsData(reportsData);

    } catch (e) {
      console.error('Error fetching inventory data:', e);
    } finally {
      setLoading(false);
    }
  }

  // --- Supplier handlers ---
  async function handleAddSupplier(e) {
    e.preventDefault();
    if (!supplierFormData.supplier_name) return;
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierFormData)
      });
      if (res.ok) {
        setShowSupplierModal(false);
        setSupplierFormData({ supplier_name: '', phone: '', email: '', address: '' });
        fetchData();
      } else {
        alert('Failed to register supplier');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleEditSupplier(e) {
    e.preventDefault();
    if (!selectedSupplier) return;
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierFormData)
      });
      if (res.ok) {
        setShowEditSupplierModal(false);
        setSelectedSupplier(null);
        setSupplierFormData({ supplier_name: '', phone: '', email: '', address: '' });
        fetchData();
      } else {
        alert('Failed to update supplier details');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteSupplier(supId) {
    if (!confirm('Are you sure you want to delete this supplier? Any linked inventory items will be unlinked.')) return;
    try {
      const res = await fetch(`/api/suppliers/${supId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to delete supplier');
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --- Inventory Item handlers ---
  async function handleAddItem(e) {
    e.preventDefault();
    if (!itemFormData.itemName) return;
    try {
      const res = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemFormData)
      });
      if (res.ok) {
        setShowItemModal(false);
        setItemFormData({ itemName: '', category: 'Dental Material', sku: '', unit: 'Pcs', currentStock: '0', minimumStock: '0', purchasePrice: '0', sellingPrice: '0', supplierId: '', expiryDate: '' });
        fetchData();
      } else {
        alert('Failed to add inventory item');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleEditItem(e) {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      const res = await fetch(`/api/inventory/items/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemFormData)
      });
      if (res.ok) {
        setShowEditItemModal(false);
        setSelectedItem(null);
        setItemFormData({ itemName: '', category: 'Dental Material', sku: '', unit: 'Pcs', currentStock: '0', minimumStock: '0', purchasePrice: '0', sellingPrice: '0', supplierId: '', expiryDate: '' });
        fetchData();
      } else {
        alert('Failed to update inventory item');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this inventory item? Transaction records will also be removed.')) return;
    try {
      const res = await fetch(`/api/inventory/items/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to delete inventory item');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleQuickAdjust(itemId, currentVal, change) {
    const newVal = currentVal + change;
    if (newVal < 0) return;
    try {
      const res = await fetch(`/api/inventory/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStock: newVal })
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('Adjustment failed');
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --- Purchase Order handlers ---
  function handleAddPORow() {
    setPOItemsList([...poItemsList, { itemId: '', quantity: '1', unitPrice: '0' }]);
  }

  function handleRemovePORow(idx) {
    setPOItemsList(poItemsList.filter((_, i) => i !== idx));
  }

  function handlePORowChange(idx, field, val) {
    const newList = [...poItemsList];
    newList[idx][field] = val;

    if (field === 'itemId') {
      const match = items.find(i => i.id === val);
      if (match) {
        newList[idx].unitPrice = match.purchase_price.toString();
      }
    }
    setPOItemsList(newList);
  }

  async function handleCreatePO(e) {
    e.preventDefault();
    if (!poSupplierId || poItemsList.some(i => !i.itemId)) {
      alert('Please select a Supplier and items for all rows.');
      return;
    }

    const totalPOAmount = poItemsList.reduce((sum, item) => {
      const qty = parseInt(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + (qty * price);
    }, 0);

    const poItemsPayload = poItemsList.map(item => {
      const match = items.find(i => i.id === item.itemId);
      return {
        itemId: item.itemId,
        itemName: match?.item_name || 'Item',
        quantity: parseInt(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice) || 0
      };
    });

    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: poSupplierId,
          orderDate: new Date().toISOString().split('T')[0],
          status: poStatus,
          totalAmount: totalPOAmount,
          items: poItemsPayload
        })
      });
      if (res.ok) {
        setShowPOModal(false);
        setPOSupplierId('');
        setPOItemsList([{ itemId: '', quantity: '1', unitPrice: '0' }]);
        fetchData();
      } else {
        alert('Failed to draft Purchase Order');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleReceivePO(poId) {
    if (!confirm('Are you sure you want to receive this stock? This will automatically increment stock levels.')) return;
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Received' })
      });
      if (res.ok) {
        setShowPODetailsModal(false);
        fetchData();
      } else {
        alert('Failed to process received purchase order');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCancelPO(poId) {
    if (!confirm('Are you sure you want to cancel this purchase order?')) return;
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' })
      });
      if (res.ok) {
        setShowPODetailsModal(false);
        fetchData();
      } else {
        alert('Failed to cancel purchase order');
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --- Reports & CSV Exports ---
  const handleExportCSVReport = () => {
    if (!reportsData) return;

    let headers = [];
    let rows = [];
    let title = '';

    if (reportType === 'Stock') {
      title = 'Stock_Report';
      headers = ['Item Name', 'Category', 'SKU', 'Unit', 'Current Stock', 'Minimum Stock', 'Purchase Price (INR)', 'Selling Price (INR)', 'Expiry Date', 'Supplier'];
      rows = (reportsData.stockList || []).map(item => [
        item.item_name,
        item.category,
        item.sku || '',
        item.unit,
        item.current_stock.toString(),
        item.minimum_stock.toString(),
        item.purchase_price.toString(),
        item.selling_price ? item.selling_price.toString() : '0',
        item.expiry_date || 'N/A',
        item.suppliers?.supplier_name || 'N/A'
      ]);
    } else if (reportType === 'Purchase') {
      title = 'Purchase_Report';
      headers = ['Date', 'Item Name', 'Quantity Received', 'Unit', 'Reason'];
      rows = (reportsData.purchaseList || []).map(tx => [
        tx.created_at.split('T')[0],
        tx.inventory_items?.item_name || 'N/A',
        tx.quantity.toString(),
        tx.inventory_items?.unit || '-',
        tx.reason || ''
      ]);
    } else if (reportType === 'Consumption') {
      title = 'Consumption_Report';
      headers = ['Date', 'Item Name', 'Quantity Deducted', 'Unit', 'Treatment / Reason'];
      rows = (reportsData.consumptionList || []).map(tx => [
        tx.created_at.split('T')[0],
        tx.inventory_items?.item_name || 'N/A',
        Math.abs(tx.quantity).toString(),
        tx.inventory_items?.unit || '-',
        tx.reason || ''
      ]);
    } else if (reportType === 'Supplier') {
      title = 'Supplier_Report';
      headers = ['Supplier Name', 'Purchase Orders Count', 'Items Supplied Count', 'Total Spends Received (INR)'];
      rows = (reportsData.supplierReport || []).map(sup => [
        sup.name,
        sup.poCount.toString(),
        sup.itemCount.toString(),
        sup.totalPOValue.toFixed(2)
      ]);
    }

    if (rows.length === 0) return;

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Filtering client-side ---
  const filteredItems = items.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
    
    let matchesStock = true;
    if (stockLevelFilter === 'low') {
      matchesStock = item.current_stock <= item.minimum_stock && item.current_stock > 0;
    } else if (stockLevelFilter === 'out') {
      matchesStock = item.current_stock <= 0;
    } else if (stockLevelFilter === 'normal') {
      matchesStock = item.current_stock > item.minimum_stock;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading Inventory & Stocks Module...</div>;

  return (
    <div className="stagger">
      {/* Top Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 className="page-title">Inventory & Stock Control 📦</h1>
          <p className="page-subtitle">Manage clinical materials, stock levels, suppliers, and purchase orders</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'stock' && (
            <button className="btn btn-primary btn-sm" onClick={() => {
              setItemFormData({ itemName: '', category: 'Dental Material', sku: '', unit: 'Pcs', currentStock: '0', minimumStock: '0', purchasePrice: '0', sellingPrice: '0', supplierId: '', expiryDate: '' });
              setShowItemModal(true);
            }}>
              + Add Inventory Item
            </button>
          )}
          {activeTab === 'suppliers' && (
            <button className="btn btn-primary btn-sm" onClick={() => {
              setSupplierFormData({ supplier_name: '', phone: '', email: '', address: '' });
              setShowSupplierModal(true);
            }}>
              + Register Supplier
            </button>
          )}
          {activeTab === 'po' && (
            <button className="btn btn-primary btn-sm" onClick={() => {
              setPOSupplierId('');
              setPOItemsList([{ itemId: '', quantity: '1', unitPrice: '0' }]);
              setPOStatus('Draft');
              setShowPOModal(true);
            }}>
              + Create Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {reportsData && (
        <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
            <div className="stat-icon blue">💰</div>
            <div className="stat-info">
              <div className="stat-value">₹{(reportsData.metrics.totalInventoryValue || 0).toLocaleString('en-IN')}</div>
              <div className="stat-label">Total Inventory Value</div>
            </div>
          </div>
          <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
            <div className="stat-icon orange">⚠️</div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{reportsData.metrics.lowStockCount || 0}</div>
              <div className="stat-label">Low Stock Items</div>
            </div>
          </div>
          <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
            <div className="stat-icon red">🛑</div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{reportsData.metrics.outOfStockCount || 0}</div>
              <div className="stat-label">Out of Stock Items</div>
            </div>
          </div>
          <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--color-purple)' }}>
            <div className="stat-icon purple">⏳</div>
            <div className="stat-info">
              <div className="stat-value">{reportsData.metrics.expiringCount || 0}</div>
              <div className="stat-label">Expiring Items</div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="glass-card-flat" style={{ display: 'flex', gap: '8px', padding: '6px 12px', marginBottom: 'var(--space-lg)', borderRadius: '12px', overflowX: 'auto' }}>
        {[
          { id: 'stock', label: 'Stock Overview', icon: '📋' },
          { id: 'suppliers', label: 'Suppliers Directory', icon: '🏢' },
          { id: 'po', label: 'Purchase Orders', icon: 'txt' },
          { id: 'reports', label: 'Reports & Sheets', icon: '📈' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              background: activeTab === tab.id ? 'var(--color-accent)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--color-text-secondary)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? '600' : '500',
              fontSize: '0.9rem',
              transition: 'all 0.25s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.id === 'po' ? '📝' : tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Stock Overview */}
      {activeTab === 'stock' && (
        <div className="stagger">
          {/* Filters Row */}
          <div className="glass-card-flat" style={{ marginBottom: 'var(--space-md)', padding: '16px' }}>
            <div className="grid-3" style={{ gap: '12px', alignItems: 'center' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Search Materials / SKU</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search item name or SKU..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ margin: 0, padding: '8px 12px', fontSize: '0.85rem' }}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Category</label>
                <select
                  className="input-field"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  style={{ margin: 0, padding: '8px 12px', fontSize: '0.85rem' }}
                >
                  <option value="">All Categories</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Dental Material">Dental Material</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Consumable">Consumable</option>
                </select>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Stock Warning Levels</label>
                <select
                  className="input-field"
                  value={stockLevelFilter}
                  onChange={e => setStockLevelFilter(e.target.value)}
                  style={{ margin: 0, padding: '8px 12px', fontSize: '0.85rem' }}
                >
                  <option value="all">All Items</option>
                  <option value="low">⚠️ Low Stock Alerts</option>
                  <option value="out">🛑 Out of Stock Alerts</option>
                  <option value="normal">Normal Stock Levels</option>
                </select>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="glass-card-flat">
            <h2 className="section-title" style={{ marginBottom: 'var(--space-md)' }}>Stock Inventory Records ({filteredItems.length})</h2>
            {filteredItems.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Material Name</th>
                      <th>SKU</th>
                      <th>Category</th>
                      <th>Supplier</th>
                      <th style={{ textAlign: 'center' }}>Unit</th>
                      <th style={{ textAlign: 'right' }}>Current Stock</th>
                      <th style={{ textAlign: 'right' }}>Min Limit</th>
                      <th style={{ textAlign: 'right' }}>Purchase Price (₹)</th>
                      <th>Expiry Date</th>
                      <th style={{ textAlign: 'center' }}>Stock Adjustment</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map(item => {
                      const isOutOfStock = item.current_stock <= 0;
                      const isLowStock = item.current_stock <= item.minimum_stock && !isOutOfStock;
                      
                      let stockColor = 'var(--color-text-primary)';
                      let badgeText = 'Normal';
                      let badgeBg = 'rgba(16, 185, 129, 0.15)';
                      let badgeColor = '#10b981';

                      if (isOutOfStock) {
                        stockColor = 'var(--color-danger)';
                        badgeText = 'Out of Stock';
                        badgeBg = 'var(--color-danger-light)';
                        badgeColor = 'var(--color-danger)';
                      } else if (isLowStock) {
                        stockColor = 'var(--color-warning)';
                        badgeText = 'Low Stock';
                        badgeBg = 'var(--color-warning-light)';
                        badgeColor = 'var(--color-warning)';
                      }

                      return (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.sku || '-'}</td>
                          <td>
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)', border: 'none' }}>
                              {item.category}
                            </span>
                          </td>
                          <td>{item.suppliers?.supplier_name || 'Unlinked'}</td>
                          <td style={{ textAlign: 'center' }}>{item.unit}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: stockColor }}>
                            {item.current_stock}
                            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 4px', borderRadius: '4px', background: badgeBg, color: badgeColor, display: 'inline-block', marginLeft: '6px', textTransform: 'uppercase' }}>
                              {badgeText}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>{item.minimum_stock}</td>
                          <td style={{ textAlign: 'right' }}>{parseFloat(item.purchase_price).toFixed(2)}</td>
                          <td style={{ color: item.expiry_date && new Date(item.expiry_date) <= new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                            {item.expiry_date || '-'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button 
                                className="badge" 
                                style={{ cursor: 'pointer', border: 'none', background: 'var(--color-danger-light)', color: 'var(--color-danger)', fontWeight: 'bold', fontSize: '0.8rem', width: '24px', height: '24px' }}
                                onClick={() => handleQuickAdjust(item.id, item.current_stock, -1)}
                              >
                                -
                              </button>
                              <button 
                                className="badge" 
                                style={{ cursor: 'pointer', border: 'none', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 'bold', fontSize: '0.8rem', width: '24px', height: '24px' }}
                                onClick={() => handleQuickAdjust(item.id, item.current_stock, 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button 
                                className="badge" 
                                style={{ cursor: 'pointer', border: 'none', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-accent)' }}
                                onClick={() => {
                                  setSelectedItem(item);
                                  setItemFormData({
                                    itemName: item.item_name,
                                    category: item.category,
                                    sku: item.sku || '',
                                    unit: item.unit,
                                    currentStock: item.current_stock.toString(),
                                    minimumStock: item.minimum_stock.toString(),
                                    purchasePrice: item.purchase_price.toString(),
                                    sellingPrice: item.selling_price ? item.selling_price.toString() : '0',
                                    supplierId: item.supplier_id || '',
                                    expiryDate: item.expiry_date || ''
                                  });
                                  setShowEditItemModal(true);
                                }}
                              >
                                ✏️ Edit
                              </button>
                              <button 
                                className="badge" 
                                style={{ cursor: 'pointer', border: 'none', background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No materials matching the search filters were found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Suppliers Directory */}
      {activeTab === 'suppliers' && (
        <div className="stagger">
          <div className="glass-card-flat">
            <h2 className="section-title" style={{ marginBottom: 'var(--space-md)' }}>Suppliers Directory ({suppliers.length})</h2>
            {suppliers.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Supplier Name</th>
                      <th>Phone Number</th>
                      <th>Email</th>
                      <th>Business Address</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map(sup => (
                      <tr key={sup.id}>
                        <td style={{ fontWeight: 600 }}>{sup.supplier_name}</td>
                        <td>{sup.phone || '-'}</td>
                        <td>{sup.email || '-'}</td>
                        <td>{sup.address || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button 
                              className="badge" 
                              style={{ cursor: 'pointer', border: 'none', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-accent)' }}
                              onClick={() => {
                                setSelectedSupplier(sup);
                                setSupplierFormData({
                                  supplier_name: sup.supplier_name,
                                  phone: sup.phone || '',
                                  email: sup.email || '',
                                  address: sup.address || ''
                                });
                                setShowEditSupplierModal(true);
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              className="badge" 
                              style={{ cursor: 'pointer', border: 'none', background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
                              onClick={() => handleDeleteSupplier(sup.id)}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No suppliers registered. Click "Register Supplier" to add one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Purchase Orders */}
      {activeTab === 'po' && (
        <div className="stagger">
          <div className="glass-card-flat">
            <h2 className="section-title" style={{ marginBottom: 'var(--space-md)' }}>Purchase Order Records ({purchaseOrders.length})</h2>
            {purchaseOrders.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>PO ID</th>
                      <th>Supplier</th>
                      <th>Date Drafted</th>
                      <th style={{ textAlign: 'right' }}>Total Amount (₹)</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.map(po => {
                      let badgeBg = 'rgba(59, 130, 246, 0.1)';
                      let badgeColor = 'var(--color-accent)';
                      if (po.status === 'Received') {
                        badgeBg = 'rgba(16, 185, 129, 0.12)';
                        badgeColor = 'var(--color-success)';
                      } else if (po.status === 'Cancelled') {
                        badgeBg = 'var(--color-danger-light)';
                        badgeColor = 'var(--color-danger)';
                      } else if (po.status === 'Ordered') {
                        badgeBg = 'var(--color-warning-light)';
                        badgeColor = 'var(--color-warning)';
                      }

                      return (
                        <tr key={po.id}>
                          <td style={{ fontWeight: 600 }}>{po.id.toUpperCase()}</td>
                          <td>{po.suppliers?.supplier_name || 'N/A'}</td>
                          <td>{po.created_at ? po.created_at.split('T')[0] : 'N/A'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 550 }}>
                            {parseFloat(po.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge" style={{ background: badgeBg, color: badgeColor, border: 'none', fontWeight: 'bold' }}>
                              {po.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => {
                                setSelectedPO(po);
                                setShowPODetailsModal(true);
                              }}
                            >
                              🔎 Details & Receive
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No purchase orders created yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Reports & Sheets */}
      {activeTab === 'reports' && reportsData && (
        <div className="stagger">
          {/* Report filters row */}
          <div className="glass-card-flat" style={{ marginBottom: 'var(--space-md)', padding: '16px' }}>
            <div className="grid-3" style={{ gap: '12px', alignItems: 'center' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Select Report Sheet</label>
                <select 
                  className="input-field" 
                  value={reportType} 
                  onChange={e => setReportType(e.target.value)}
                  style={{ margin: 0, padding: '8px 12px', fontSize: '0.85rem' }}
                >
                  <option value="Stock">Stock Inventory Report</option>
                  <option value="Purchase">Purchase Supply Report (IN)</option>
                  <option value="Consumption">Material Consumption Report (OUT)</option>
                  <option value="Supplier">Supplier Spend Report</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', height: '38px', marginTop: '16px' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleExportCSVReport} style={{ flex: 1 }}>
                  📥 Export CSV
                </button>
                <a 
                  href={`/api/reports/inventory/pdf?type=${reportType}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-primary btn-sm"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}
                >
                  🖨️ Export PDF
                </a>
              </div>
            </div>
          </div>

          {/* Render Active Table */}
          <div className="glass-card-flat">
            <h3 className="section-title" style={{ marginBottom: 'var(--space-md)' }}>
              {reportType} Statistics Sheets
            </h3>

            {/* 1. Stock report */}
            {reportType === 'Stock' && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Material Name</th>
                      <th>Category</th>
                      <th>SKU</th>
                      <th style={{ textAlign: 'right' }}>Current Stock</th>
                      <th>Unit</th>
                      <th style={{ textAlign: 'right' }}>Min Limit</th>
                      <th style={{ textAlign: 'right' }}>Unit Cost (₹)</th>
                      <th>Supplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportsData.stockList || []).map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                        <td>{item.category}</td>
                        <td style={{ fontFamily: 'monospace' }}>{item.sku || '-'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{item.current_stock}</td>
                        <td>{item.unit}</td>
                        <td style={{ textAlign: 'right' }}>{item.minimum_stock}</td>
                        <td style={{ textAlign: 'right' }}>{parseFloat(item.purchase_price).toFixed(2)}</td>
                        <td>{item.suppliers?.supplier_name || 'Unlinked'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. Purchase Report */}
            {reportType === 'Purchase' && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Item Name</th>
                      <th style={{ textAlign: 'right' }}>Quantity Received</th>
                      <th>Unit</th>
                      <th>Transaction Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportsData.purchaseList || []).map(tx => (
                      <tr key={tx.id}>
                        <td>{tx.created_at.split('T')[0]}</td>
                        <td style={{ fontWeight: 600 }}>{tx.inventory_items?.item_name || 'Deleted Item'}</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 'bold' }}>+{tx.quantity}</td>
                        <td>{tx.inventory_items?.unit || '-'}</td>
                        <td>{tx.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. Consumption Report */}
            {reportType === 'Consumption' && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Item Name</th>
                      <th style={{ textAlign: 'right' }}>Quantity Deducted</th>
                      <th>Unit</th>
                      <th>Deduction Reason / Treatment Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportsData.consumptionList || []).map(tx => (
                      <tr key={tx.id}>
                        <td>{tx.created_at.split('T')[0]}</td>
                        <td style={{ fontWeight: 600 }}>{tx.inventory_items?.item_name || 'Deleted Item'}</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-danger)', fontWeight: 'bold' }}>{tx.quantity}</td>
                        <td>{tx.inventory_items?.unit || '-'}</td>
                        <td>{tx.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. Supplier Spend Report */}
            {reportType === 'Supplier' && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Supplier Name</th>
                      <th style={{ textAlign: 'right' }}>Purchase Orders Count</th>
                      <th style={{ textAlign: 'right' }}>Items Supplied</th>
                      <th style={{ textAlign: 'right' }}>Total Value Purchased (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportsData.supplierReport || []).map((sup, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{sup.name}</td>
                        <td style={{ textAlign: 'right' }}>{sup.poCount}</td>
                        <td style={{ textAlign: 'right' }}>{sup.itemCount}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-success)' }}>
                          {parseFloat(sup.totalPOValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          MODALS & DIALOGS
          ═══════════════════════════════════════════ */}

      {/* 1. Register Supplier Modal */}
      <Modal isOpen={showSupplierModal} onClose={() => setShowSupplierModal(false)} title="Register Supplier" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setShowSupplierModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddSupplier}>Register</button>
        </>
      }>
        <div className="input-group">
          <label>Supplier / Company Name *</label>
          <input type="text" className="input-field" placeholder="Dental Supplies India Ltd" value={supplierFormData.supplier_name} onChange={e => setSupplierFormData({...supplierFormData, supplier_name: e.target.value})} required />
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label>Phone Number</label>
            <input type="text" className="input-field" placeholder="+91 9876543210" value={supplierFormData.phone} onChange={e => setSupplierFormData({...supplierFormData, phone: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Business Email</label>
            <input type="email" className="input-field" placeholder="sales@dentalsupply.com" value={supplierFormData.email} onChange={e => setSupplierFormData({...supplierFormData, email: e.target.value})} />
          </div>
        </div>
        <div className="input-group">
          <label>Office Address</label>
          <textarea className="input-field" placeholder="Warehouse / Office address..." rows={2} value={supplierFormData.address} onChange={e => setSupplierFormData({...supplierFormData, address: e.target.value})} />
        </div>
      </Modal>

      {/* 2. Edit Supplier Modal */}
      <Modal isOpen={showEditSupplierModal} onClose={() => setShowEditSupplierModal(false)} title="Edit Supplier Details" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setShowEditSupplierModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEditSupplier}>Save Changes</button>
        </>
      }>
        <div className="input-group">
          <label>Supplier / Company Name *</label>
          <input type="text" className="input-field" value={supplierFormData.supplier_name} onChange={e => setSupplierFormData({...supplierFormData, supplier_name: e.target.value})} required />
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label>Phone Number</label>
            <input type="text" className="input-field" value={supplierFormData.phone} onChange={e => setSupplierFormData({...supplierFormData, phone: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Business Email</label>
            <input type="email" className="input-field" value={supplierFormData.email} onChange={e => setSupplierFormData({...supplierFormData, email: e.target.value})} />
          </div>
        </div>
        <div className="input-group">
          <label>Office Address</label>
          <textarea className="input-field" rows={2} value={supplierFormData.address} onChange={e => setSupplierFormData({...supplierFormData, address: e.target.value})} />
        </div>
      </Modal>

      {/* 3. Add Item Modal */}
      <Modal isOpen={showItemModal} onClose={() => setShowItemModal(false)} title="Add New Inventory Item" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setShowItemModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddItem}>Add Material</button>
        </>
      }>
        <div className="grid-2">
          <div className="input-group">
            <label>Material Name *</label>
            <input type="text" className="input-field" placeholder="GIC Sealer" value={itemFormData.itemName} onChange={e => setItemFormData({...itemFormData, itemName: e.target.value})} required />
          </div>
          <div className="input-group">
            <label>Category *</label>
            <select className="input-field" value={itemFormData.category} onChange={e => setItemFormData({...itemFormData, category: e.target.value})}>
              <option value="Medicine">Medicine</option>
              <option value="Dental Material">Dental Material</option>
              <option value="Equipment">Equipment</option>
              <option value="Consumable">Consumable</option>
            </select>
          </div>
        </div>

        <div className="grid-3">
          <div className="input-group">
            <label>SKU Code</label>
            <input type="text" className="input-field" placeholder="DM-SLR-02" value={itemFormData.sku} onChange={e => setItemFormData({...itemFormData, sku: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Unit Format *</label>
            <input type="text" className="input-field" placeholder="Pcs / Box" value={itemFormData.unit} onChange={e => setItemFormData({...itemFormData, unit: e.target.value})} required />
          </div>
          <div className="input-group">
            <label>Initial Stock *</label>
            <input type="number" className="input-field" value={itemFormData.currentStock} onChange={e => setItemFormData({...itemFormData, currentStock: e.target.value})} required />
          </div>
        </div>

        <div className="grid-3">
          <div className="input-group">
            <label>Min Stock Limit *</label>
            <input type="number" className="input-field" value={itemFormData.minimumStock} onChange={e => setItemFormData({...itemFormData, minimumStock: e.target.value})} required />
          </div>
          <div className="input-group">
            <label>Expiry Date</label>
            <input type="date" className="input-field" value={itemFormData.expiryDate} onChange={e => setItemFormData({...itemFormData, expiryDate: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Preferred Supplier</label>
            <select className="input-field" value={itemFormData.supplierId} onChange={e => setItemFormData({...itemFormData, supplierId: e.target.value})}>
              <option value="">-- No Supplier --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="input-group">
            <label>Unit Purchase Price (₹) *</label>
            <input type="number" step="0.01" className="input-field" value={itemFormData.purchasePrice} onChange={e => setItemFormData({...itemFormData, purchasePrice: e.target.value})} required />
          </div>
          <div className="input-group">
            <label>Unit Selling Price (₹)</label>
            <input type="number" step="0.01" className="input-field" value={itemFormData.sellingPrice} onChange={e => setItemFormData({...itemFormData, sellingPrice: e.target.value})} />
          </div>
        </div>
      </Modal>

      {/* 4. Edit Item Modal */}
      <Modal isOpen={showEditItemModal} onClose={() => setShowEditItemModal(false)} title="Edit Inventory Material" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setShowEditItemModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEditItem}>Save Changes</button>
        </>
      }>
        <div className="grid-2">
          <div className="input-group">
            <label>Material Name *</label>
            <input type="text" className="input-field" value={itemFormData.itemName} onChange={e => setItemFormData({...itemFormData, itemName: e.target.value})} required />
          </div>
          <div className="input-group">
            <label>Category *</label>
            <select className="input-field" value={itemFormData.category} onChange={e => setItemFormData({...itemFormData, category: e.target.value})}>
              <option value="Medicine">Medicine</option>
              <option value="Dental Material">Dental Material</option>
              <option value="Equipment">Equipment</option>
              <option value="Consumable">Consumable</option>
            </select>
          </div>
        </div>

        <div className="grid-3">
          <div className="input-group">
            <label>SKU Code</label>
            <input type="text" className="input-field" value={itemFormData.sku} onChange={e => setItemFormData({...itemFormData, sku: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Unit Format *</label>
            <input type="text" className="input-field" value={itemFormData.unit} onChange={e => setItemFormData({...itemFormData, unit: e.target.value})} required />
          </div>
          <div className="input-group">
            <label>Current Stock (Read Only)</label>
            <input type="number" className="input-field" value={itemFormData.currentStock} disabled />
          </div>
        </div>

        <div className="grid-3">
          <div className="input-group">
            <label>Min Stock Limit *</label>
            <input type="number" className="input-field" value={itemFormData.minimumStock} onChange={e => setItemFormData({...itemFormData, minimumStock: e.target.value})} required />
          </div>
          <div className="input-group">
            <label>Expiry Date</label>
            <input type="date" className="input-field" value={itemFormData.expiryDate} onChange={e => setItemFormData({...itemFormData, expiryDate: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Preferred Supplier</label>
            <select className="input-field" value={itemFormData.supplierId} onChange={e => setItemFormData({...itemFormData, supplierId: e.target.value})}>
              <option value="">-- No Supplier --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="input-group">
            <label>Unit Purchase Price (₹) *</label>
            <input type="number" step="0.01" className="input-field" value={itemFormData.purchasePrice} onChange={e => setItemFormData({...itemFormData, purchasePrice: e.target.value})} required />
          </div>
          <div className="input-group">
            <label>Unit Selling Price (₹)</label>
            <input type="number" step="0.01" className="input-field" value={itemFormData.sellingPrice} onChange={e => setItemFormData({...itemFormData, sellingPrice: e.target.value})} />
          </div>
        </div>
      </Modal>

      {/* 5. Create Purchase Order Modal */}
      <Modal isOpen={showPOModal} onClose={() => setShowPOModal(false)} title="Create Purchase Order" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setShowPOModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreatePO}>Save PO Draft</button>
        </>
      }>
        <div className="grid-2">
          <div className="input-group">
            <label>Supplier *</label>
            <select className="input-field" value={poSupplierId} onChange={e => setPOSupplierId(e.target.value)} required>
              <option value="">-- Select Supplier --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Status</label>
            <select className="input-field" value={poStatus} onChange={e => setPOStatus(e.target.value)}>
              <option value="Draft">Draft</option>
              <option value="Ordered">Ordered / Sent</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          <div className="flex-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            <span>Item</span>
            <span style={{ width: '80px', textAlign: 'center' }}>Quantity</span>
            <span style={{ width: '100px', textAlign: 'right' }}>Unit Cost (₹)</span>
            <span></span>
          </div>

          {poItemsList.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select 
                className="input-field" 
                value={item.itemId} 
                onChange={e => handlePORowChange(idx, 'itemId', e.target.value)}
                style={{ flex: 1, margin: 0, padding: '6px 10px', fontSize: '0.8rem' }}
              >
                <option value="">-- Select Material --</option>
                {items.filter(i => !poSupplierId || i.supplier_id === poSupplierId).map(i => (
                  <option key={i.id} value={i.id}>{i.item_name} ({i.unit})</option>
                ))}
              </select>
              <input 
                type="number" 
                className="input-field" 
                value={item.quantity} 
                onChange={e => handlePORowChange(idx, 'quantity', e.target.value)}
                style={{ width: '80px', margin: 0, padding: '6px 10px', textAlign: 'center', fontSize: '0.8rem' }}
                min="1"
              />
              <input 
                type="number" 
                className="input-field" 
                value={item.unitPrice} 
                onChange={e => handlePORowChange(idx, 'unitPrice', e.target.value)}
                style={{ width: '100px', margin: 0, padding: '6px 10px', textAlign: 'right', fontSize: '0.8rem' }}
                min="0"
                step="0.01"
              />
              {poItemsList.length > 1 && (
                <button type="button" onClick={() => handleRemovePORow(idx)} style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>✕</button>
              )}
            </div>
          ))}
        </div>

        <div className="flex-between">
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddPORow}>+ Add Item Row</button>
          <div style={{ fontWeight: 'bold', color: 'var(--color-success)', fontSize: '1.1rem' }}>
            Total Est: ₹{
              poItemsList.reduce((sum, item) => sum + ((parseInt(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
            }
          </div>
        </div>
      </Modal>

      {/* 6. PO Details & Receive Modal */}
      {selectedPO && (
        <Modal isOpen={showPODetailsModal} onClose={() => { setShowPODetailsModal(false); setSelectedPO(null); }} title={`Purchase Order: ${selectedPO.id.toUpperCase()}`} footer={
          <div className="flex-between" style={{ width: '100%' }}>
            {selectedPO.status !== 'Received' && selectedPO.status !== 'Cancelled' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary btn-sm" onClick={() => handleReceivePO(selectedPO.id)}>✓ Receive Stock</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleCancelPO(selectedPO.id)}>✕ Cancel PO</button>
              </div>
            ) : <span />}
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowPODetailsModal(false); setSelectedPO(null); }}>Close</button>
          </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Supplier: {selectedPO.suppliers?.supplier_name}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Status: <strong>{selectedPO.status}</strong></p>
            </div>

            <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Ordered Items List</h4>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>
                <span>Item Name</span>
                <span style={{ width: '80px', textAlign: 'center' }}>Qty</span>
                <span style={{ width: '100px', textAlign: 'right' }}>Cost</span>
              </div>
              {Array.isArray(selectedPO.items) && selectedPO.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', fontSize: '0.8rem' }}>
                  <span>{it.itemName}</span>
                  <span style={{ width: '80px', textAlign: 'center' }}>{it.quantity}</span>
                  <span style={{ width: '100px', textAlign: 'right' }}>₹{(it.quantity * it.unitPrice).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', marginTop: '8px', paddingTop: '6px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                <span>Grand Total:</span>
                <span style={{ color: 'var(--color-success)' }}>₹{parseFloat(selectedPO.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
