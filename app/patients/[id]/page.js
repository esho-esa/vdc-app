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

  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterDentist, setFilterDentist] = useState('');
  const [medicalNotesText, setMedicalNotesText] = useState('');
  const [isNotesSaving, setIsNotesSaving] = useState(false);

  // AR states
  const [arActiveTab, setArActiveTab] = useState('summary');
  const [dueDateInput, setDueDateInput] = useState('');
  const [isSavingDueDate, setIsSavingDueDate] = useState(false);

  // Payment states
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({ amount: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'UPI', referenceNumber: '', notes: '' });
  const [isPaymentSaving, setIsPaymentSaving] = useState(false);
  const [paymentErrorMsg, setPaymentErrorMsg] = useState('');

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
          setMedicalNotesText(d.medicalHistory || '');
          setDueDateInput(d.due_date || '');
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
        setMedicalNotesText(updated.medicalHistory || '');
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

  async function handleSaveDueDate() {
    if (!dueDateInput) {
      alert('Please select a valid date.');
      return;
    }
    setIsSavingDueDate(true);
    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          dueDate: dueDateInput || null
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setData({ ...data, ...updated });
        alert('Due date updated successfully');
      } else {
        alert('Failed to update due date');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving due date');
    } finally {
      setIsSavingDueDate(false);
    }
  }

  function handleExportCSVStatement() {
    const ledger = buildLedger();
    const headers = ['Date', 'Transaction Detail', 'Type', 'Charge (Dr)', 'Credit (Cr)', 'Running Balance (INR)'];
    const rows = ledger.map(item => [
      item.date,
      item.description,
      item.type === 'Charge' ? 'Billed' : 'Payment',
      item.type === 'Charge' ? item.amount.toFixed(2) : '0.00',
      item.type === 'Credit' ? item.amount.toFixed(2) : '0.00',
      item.balance.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = `statement-${patient.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  async function handleRecordPayment() {
    const amt = parseFloat(paymentFormData.amount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentErrorMsg('Payment amount must be greater than zero.');
      return;
    }
    if (amt > pendingBalance) {
      setPaymentErrorMsg(`Payment amount cannot exceed the pending balance of ₹${pendingBalance.toLocaleString('en-IN')}.`);
      return;
    }

    setPaymentErrorMsg('');
    setIsPaymentSaving(true);
    try {
      const res = await fetch(`/api/patients/${id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          paymentDate: paymentFormData.paymentDate,
          paymentMethod: paymentFormData.paymentMethod,
          referenceNumber: paymentFormData.referenceNumber,
          notes: paymentFormData.notes
        })
      });

      if (res.ok) {
        const newPay = await res.json();
        setData({
          ...data,
          payments: [newPay, ...(data.payments || [])]
        });
        setShowRecordPaymentModal(false);
      } else {
        const err = await res.json();
        setPaymentErrorMsg(err.error || 'Failed to record payment.');
      }
    } catch (e) {
      console.error(e);
      setPaymentErrorMsg('Error saving payment record.');
    } finally {
      setIsPaymentSaving(false);
    }
  }

  async function handleSavePaymentEdit() {
    const amt = parseFloat(paymentFormData.amount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentErrorMsg('Payment amount must be greater than zero.');
      return;
    }
    
    const otherPaid = (data.payments || [])
      .filter(p => p.id !== selectedPayment.id)
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const maxAllowed = Math.max(0, totalSpent - otherPaid);

    if (amt > maxAllowed) {
      setPaymentErrorMsg(`Payment amount cannot exceed the pending balance of ₹${maxAllowed.toLocaleString('en-IN')}.`);
      return;
    }

    setPaymentErrorMsg('');
    setIsPaymentSaving(true);
    try {
      const res = await fetch(`/api/patients/${id}/payments/${selectedPayment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          paymentDate: paymentFormData.paymentDate,
          paymentMethod: paymentFormData.paymentMethod,
          referenceNumber: paymentFormData.referenceNumber,
          notes: paymentFormData.notes
        })
      });

      if (res.ok) {
        const updatedPay = await res.json();
        setData({
          ...data,
          payments: data.payments.map(p => p.id === selectedPayment.id ? updatedPay : p)
        });
        setShowEditPaymentModal(false);
        setSelectedPayment(null);
      } else {
        const err = await res.json();
        setPaymentErrorMsg(err.error || 'Failed to update payment.');
      }
    } catch (e) {
      console.error(e);
      setPaymentErrorMsg('Error saving payment updates.');
    } finally {
      setIsPaymentSaving(false);
    }
  }

  async function handleDeletePayment(payId) {
    if (!confirm('Are you sure you want to delete this payment record? This will instantly increase the outstanding balance.')) return;
    try {
      const res = await fetch(`/api/patients/${id}/payments/${payId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setData({
          ...data,
          payments: data.payments.filter(p => p.id !== payId)
        });
      } else {
        alert('Failed to delete payment');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting payment record');
    }
  }

  async function handleSaveMedicalNotes() {
    setIsNotesSaving(true);
    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          medicalHistory: medicalNotesText
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setData({ ...data, ...updated });
        setEditFormData({ ...editFormData, medicalHistory: medicalNotesText });
        setShowNotesModal(false);
      } else {
        alert('Failed to update medical notes');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving medical notes');
    } finally {
      setIsNotesSaving(false);
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
  const totalPaid = (data.payments || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const pendingBalance = Math.max(0, totalSpent - totalPaid);
  const avatar = patient.name ? patient.name.substring(0, 2).toUpperCase() : 'U';

  // Accounts Receivable status computations
  const todayStr = new Date().toISOString().split('T')[0];
  let paymentStatus = 'PAID';
  if (totalSpent > 0) {
    if (totalPaid === 0) {
      paymentStatus = 'UNPAID';
    } else if (totalPaid < totalSpent) {
      paymentStatus = 'PARTIALLY PAID';
    }
  }
  if (pendingBalance > 0.01 && patient.due_date && todayStr > patient.due_date) {
    paymentStatus = 'OVERDUE';
  }

  const getDueStatus = () => {
    if (!patient.due_date) return { text: 'No due date set', type: 'info' };
    if (pendingBalance <= 0.01) return { text: 'Paid in full', type: 'success' };
    
    const today = new Date(todayStr);
    const due = new Date(patient.due_date);
    const timeDiff = due.getTime() - today.getTime();
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`, type: 'danger', days: diffDays };
    } else if (diffDays === 0) {
      return { text: 'Due today', type: 'warning', days: 0 };
    } else {
      return { text: `${diffDays} day${diffDays === 1 ? '' : 's'} remaining`, type: 'success', days: diffDays };
    }
  };
  const dueStatus = getDueStatus();

  let statusBadgeBg = 'rgba(16, 185, 129, 0.15)';
  let statusBadgeColor = '#10b981';
  if (paymentStatus === 'OVERDUE') {
    statusBadgeBg = 'rgba(239, 68, 68, 0.15)';
    statusBadgeColor = '#ef4444';
  } else if (paymentStatus === 'UNPAID') {
    statusBadgeBg = 'rgba(245, 158, 11, 0.15)';
    statusBadgeColor = '#f59e0b';
  } else if (paymentStatus === 'PARTIALLY PAID') {
    statusBadgeBg = 'rgba(175, 82, 222, 0.15)';
    statusBadgeColor = '#af52de';
  }

  const buildLedger = () => {
    const ledgerItems = [];

    // Treatments (Charges)
    (patient.treatments || []).forEach((t) => {
      let treatmentName = t.description;
      try {
        if (t.description && t.description.startsWith('{')) {
          const parsed = JSON.parse(t.description);
          treatmentName = parsed.name || parsed.description;
        }
      } catch (e) { }

      ledgerItems.push({
        date: t.date,
        id: t.id,
        description: treatmentName,
        type: 'Charge',
        amount: parseFloat(t.cost) || 0
      });
    });

    // Payments (Credits)
    (patient.payments || []).forEach((p) => {
      ledgerItems.push({
        date: p.payment_date,
        id: p.id,
        description: `Paid via ${p.payment_method}${p.reference_number ? ' (Ref: ' + p.reference_number + ')' : ''}`,
        type: 'Credit',
        amount: parseFloat(p.amount) || 0
      });
    });

    // Sort chronologically (date ascending, charges before credits)
    ledgerItems.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      
      if (a.type !== b.type) {
        return a.type === 'Charge' ? -1 : 1;
      }
      return a.id.localeCompare(b.id);
    });

    // Calculate running balance
    let runningBalance = 0;
    ledgerItems.forEach((item) => {
      if (item.type === 'Charge') {
        runningBalance += item.amount;
      } else {
        runningBalance -= item.amount;
      }
      item.balance = runningBalance;
    });

    return ledgerItems;
  };

  const patientLedger = buildLedger();

  const totalTreatmentFee = treatmentsList.reduce((sum, item) => sum + (parseFloat(item.treatmentFee) || 0), 0);
  const totalSurgeryFee = treatmentsList.reduce((sum, item) => sum + (parseFloat(item.surgeryFee) || 0), 0);
  const totalConsultationFee = treatmentsList.reduce((sum, item) => sum + (parseFloat(item.consultationFee) || 0), 0);
  const grandTotalRevenue = totalTreatmentFee + totalSurgeryFee + totalConsultationFee;

  const uniqueDentists = Array.from(new Set(patientTreatments.map(t => t.dentist))).filter(Boolean);

  const filteredTreatments = patientTreatments.filter(t => {
    if (filterStartDate && t.date < filterStartDate) return false;
    if (filterEndDate && t.date > filterEndDate) return false;
    if (filterDentist && t.dentist !== filterDentist) return false;
    return true;
  });

  const filteredTotalTreatment = filteredTreatments.reduce((sum, t) => sum + (parseFloat(t.treatment_fee) || 0), 0);
  const filteredTotalSurgery = filteredTreatments.reduce((sum, t) => sum + (parseFloat(t.surgery_fee) || 0), 0);
  const filteredTotalConsultation = filteredTreatments.reduce((sum, t) => sum + (parseFloat(t.consultation_fee) || 0), 0);
  const filteredGrandTotal = filteredTotalTreatment + filteredTotalSurgery + filteredTotalConsultation;
  
  // Filter payments matching date range
  const filteredPaymentsList = (data.payments || []).filter(p => {
    if (filterStartDate && p.payment_date < filterStartDate) return false;
    if (filterEndDate && p.payment_date > filterEndDate) return false;
    return true;
  });
  const filteredPayments = filteredPaymentsList.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const filteredOutstanding = Math.max(0, filteredGrandTotal - filteredPayments);

  const billingPdfUrl = `/api/patients/${id}/billing-pdf?startDate=${filterStartDate}&endDate=${filterEndDate}&dentist=${encodeURIComponent(filterDentist)}`;

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
        <div 
          className="glass-card stat-card clickable" 
          onClick={() => document.getElementById('appointment-history')?.scrollIntoView({ behavior: 'smooth' })}
          data-tooltip="Click to view visit history"
        >
          <div className="stat-icon blue">📅</div>
          <div className="stat-info">
            <div className="stat-value">{patientAppts.length}</div>
            <div className="stat-label">Total Visits</div>
          </div>
        </div>
        <div 
          className="glass-card stat-card clickable" 
          onClick={() => document.getElementById('treatment-history')?.scrollIntoView({ behavior: 'smooth' })}
          data-tooltip="Click to view treatments"
        >
          <div className="stat-icon green">🦷</div>
          <div className="stat-info">
            <div className="stat-value">{patientTreatments.length}</div>
            <div className="stat-label">Treatments</div>
          </div>
        </div>
        {user?.role === 'admin' && (
          <>
            <div 
              className="glass-card stat-card clickable" 
              onClick={() => setShowBillingModal(true)}
              data-tooltip="Click to view billing breakdown"
            >
              <div className="stat-icon purple">💰</div>
              <div className="stat-info">
                <div className="stat-value">₹{totalSpent.toLocaleString('en-IN')}</div>
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
              <div className="stat-icon orange">⚖️</div>
              <div className="stat-info">
                <div className="stat-value" style={{ color: pendingBalance > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                  ₹{pendingBalance.toLocaleString('en-IN')}
                </div>
                <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span>Pending Balance</span>
                  <span className="badge" style={{ fontSize: '0.625rem', padding: '2px 6px', background: statusBadgeBg, color: statusBadgeColor, border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
                    {paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
        <div 
          className="glass-card stat-card clickable" 
          onClick={() => setShowNotesModal(true)}
          data-tooltip="Click to view medical notes history"
        >
          <div className="stat-icon orange">📋</div>
          <div className="stat-info">
            <div className="stat-value" style={{ fontSize: '0.9rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{patient.medicalHistory || 'None'}</div>
            <div className="stat-label">Medical Notes</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Treatment History */}
        <div id="treatment-history" className="glass-card-flat">
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
        <div id="appointment-history" className="glass-card-flat">
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

      {/* Payment History & Ledgers */}
      {user?.role === 'admin' && (
        <div className="glass-card-flat" style={{ marginTop: 'var(--space-lg)' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
            <h2 className="section-title">Payment History & Ledgers</h2>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setPaymentFormData({
                amount: '',
                paymentDate: new Date().toISOString().split('T')[0],
                paymentMethod: 'UPI',
                referenceNumber: '',
                notes: ''
              });
              setShowRecordPaymentModal(true);
            }}>
              + Record Payment
            </button>
          </div>

          {(data.payments || []).length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.payments || []).map((pay) => (
                    <tr key={pay.id}>
                      <td style={{ fontWeight: 500 }}>{pay.payment_date}</td>
                      <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                        ₹{parseFloat(pay.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-accent)', border: 'none' }}>
                          {pay.payment_method}
                        </span>
                      </td>
                      <td>{pay.reference_number || '-'}</td>
                      <td>{pay.notes || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <a 
                            href={`/api/patients/${id}/payments/${pay.id}/receipt-pdf`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="badge" 
                            style={{ cursor: 'pointer', textDecoration: 'none', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', border: 'none' }}
                          >
                            🖨️ Receipt
                          </a>
                          <button 
                            className="badge" 
                            style={{ cursor: 'pointer', border: 'none', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}
                            onClick={() => {
                              setSelectedPayment(pay);
                              setPaymentFormData({
                                amount: pay.amount.toString(),
                                paymentDate: pay.payment_date,
                                paymentMethod: pay.payment_method,
                                referenceNumber: pay.reference_number || '',
                                notes: pay.notes || ''
                              });
                              setShowEditPaymentModal(true);
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            className="badge" 
                            style={{ cursor: 'pointer', border: 'none', background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
                            onClick={() => handleDeletePayment(pay.id)}
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
            <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              No payments recorded yet.
            </div>
          )}
        </div>
      )}

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

      {/* Billing Breakdown Modal */}
      <Modal 
        isOpen={showBillingModal} 
        onClose={() => setShowBillingModal(false)} 
        title="Patient Accounts Receivable & Ledger" 
        footer={
          <div className="flex-between" style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary btn-sm" onClick={() => window.open(`/api/patients/${id}/statement-pdf`, '_blank')}>⬇️ PDF Statement</button>
              <button className="btn btn-secondary btn-sm" onClick={handleExportCSVStatement}>⬇️ CSV Statement</button>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowBillingModal(false)}>Close</button>
          </div>
        }
      >
        {/* Tab Selection */}
        <div className="tab-container" style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '16px', gap: '8px' }}>
          <button 
            className={`tab-btn ${arActiveTab === 'summary' ? 'active' : ''}`}
            onClick={() => setArActiveTab('summary')}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: arActiveTab === 'summary' ? '2px solid var(--color-accent)' : '2px solid transparent',
              color: arActiveTab === 'summary' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: arActiveTab === 'summary' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease'
            }}
          >
            AR Summary
          </button>
          <button 
            className={`tab-btn ${arActiveTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setArActiveTab('ledger')}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: arActiveTab === 'ledger' ? '2px solid var(--color-accent)' : '2px solid transparent',
              color: arActiveTab === 'ledger' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: arActiveTab === 'ledger' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease'
            }}
          >
            Patient Ledger
          </button>
          <button 
            className={`tab-btn ${arActiveTab === 'payments' ? 'active' : ''}`}
            onClick={() => setArActiveTab('payments')}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: arActiveTab === 'payments' ? '2px solid var(--color-accent)' : '2px solid transparent',
              color: arActiveTab === 'payments' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: arActiveTab === 'payments' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease'
            }}
          >
            Payment History
          </button>
        </div>

        {/* Tab 1: AR Summary */}
        {arActiveTab === 'summary' && (
          <div>
            {/* AR & Due Date Control */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px', color: 'var(--color-accent)' }}>AR & Due Date Control</h4>
              <div className="grid-2" style={{ gap: '16px' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Payment Due Date</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={dueDateInput} 
                      onChange={e => setDueDateInput(e.target.value)} 
                      style={{ padding: '8px 12px', fontSize: '0.85rem', flex: 1 }} 
                    />
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={handleSaveDueDate} 
                      disabled={isSavingDueDate}
                      style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {isSavingDueDate ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Account Status & Days</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="badge" style={{ 
                      fontSize: '0.75rem', 
                      padding: '4px 10px', 
                      background: statusBadgeBg, 
                      color: statusBadgeColor, 
                      border: 'none', 
                      borderRadius: '6px', 
                      fontWeight: 'bold' 
                    }}>
                      {paymentStatus}
                    </span>
                    <span style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: '500',
                      color: dueStatus.type === 'danger' ? 'var(--color-danger)' : 
                             dueStatus.type === 'warning' ? 'var(--color-warning)' : 'var(--color-success)'
                    }}>
                      {dueStatus.text}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '16px' }}>
              <div className="flex-between" style={{ marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-accent)', margin: 0 }}>Filter Transactions</h4>
                <a href={billingPdfUrl} target="_blank" rel="noreferrer" className="badge" style={{ cursor: 'pointer', textDecoration: 'none', border: 'none', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-accent)' }}>
                  🖨️ Print Filtered Report
                </a>
              </div>
              <div className="grid-3">
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Start Date</label>
                  <input type="date" className="input-field" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.85rem' }} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>End Date</label>
                  <input type="date" className="input-field" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.85rem' }} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Dentist</label>
                  <select className="input-field" value={filterDentist} onChange={e => setFilterDentist(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
                    <option value="">All Dentists</option>
                    {uniqueDentists.map((d, idx) => (
                      <option key={idx} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              {(filterStartDate || filterEndDate || filterDentist) && (
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setFilterDentist(''); }} 
                  style={{ marginTop: '8px', padding: '4px 0', fontSize: '0.8rem' }}
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Aggregate Billing Summary */}
            <div className="stats-grid" style={{ gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 550, textTransform: 'uppercase' }}>Billed Amount</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>₹{filteredGrandTotal}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 550, textTransform: 'uppercase' }}>Payments Received</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>₹{filteredPayments}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--color-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 550, textTransform: 'uppercase' }}>Outstanding Balance</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: filteredOutstanding > 0 ? 'var(--color-danger)' : 'var(--color-text-primary)', marginTop: '4px' }}>₹{filteredOutstanding}</div>
              </div>
            </div>

            {/* Detailed Breakdown Grid */}
            <div className="stats-grid" style={{ gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>Treatment Fees</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 650, marginTop: '2px' }}>₹{filteredTotalTreatment}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>Surgery Fees</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 650, marginTop: '2px' }}>₹{filteredTotalSurgery}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>Consultation Fees</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 650, marginTop: '2px' }}>₹{filteredTotalConsultation}</div>
              </div>
            </div>

            {/* Breakdown Table */}
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-primary)' }}>Treatment Wise Breakdown</h4>
            {filteredTreatments.length > 0 ? (
              <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Treatment</th>
                      <th>Dentist</th>
                      <th style={{ textAlign: 'right' }}>Treat (₹)</th>
                      <th style={{ textAlign: 'right' }}>Surg (₹)</th>
                      <th style={{ textAlign: 'right' }}>Cons (₹)</th>
                      <th style={{ textAlign: 'right' }}>Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTreatments.map((t) => {
                      let parsed = { name: t.description };
                      try {
                        if (t.description && t.description.startsWith('{')) {
                          parsed = JSON.parse(t.description);
                        }
                      } catch(e) {}
                      
                      const name = parsed.name || parsed.description || t.description;

                      return (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 500 }}>{t.date}</td>
                          <td>{name}</td>
                          <td>{t.dentist}</td>
                          <td style={{ textAlign: 'right' }}>{(t.treatment_fee || 0).toLocaleString('en-IN')}</td>
                          <td style={{ textAlign: 'right' }}>{(t.surgery_fee || 0).toLocaleString('en-IN')}</td>
                          <td style={{ textAlign: 'right' }}>{(t.consultation_fee || 0).toLocaleString('en-IN')}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{(t.cost || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                No billing records found matching active filters.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Patient Ledger */}
        {arActiveTab === 'ledger' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-accent)', margin: 0 }}>Chronological Ledger</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Shows charges, credits, and running balance</span>
            </div>

            {patientLedger.length > 0 ? (
              <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Transaction Detail</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'right' }}>Charge (Dr)</th>
                      <th style={{ textAlign: 'right' }}>Credit (Cr)</th>
                      <th style={{ textAlign: 'right' }}>Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...patientLedger].reverse().map((item, idx) => (
                      <tr key={`${item.type}-${item.id}-${idx}`}>
                        <td style={{ fontWeight: 500 }}>{item.date}</td>
                        <td>{item.description}</td>
                        <td>
                          <span className="badge" style={{ 
                            background: item.type === 'Charge' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                            color: item.type === 'Charge' ? 'var(--color-accent)' : 'var(--color-success)',
                            border: 'none',
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            fontWeight: 'bold'
                          }}>
                            {item.type === 'Charge' ? 'Billed' : 'Payment'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {item.type === 'Charge' ? `₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 500 }}>
                          {item.type === 'Credit' ? `₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          ₹{item.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                No ledger transactions found.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Payment History */}
        {arActiveTab === 'payments' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-accent)', margin: 0 }}>Payments History</h4>
              <button className="btn btn-primary btn-sm" onClick={() => {
                setPaymentFormData({
                  amount: '',
                  paymentDate: new Date().toISOString().split('T')[0],
                  paymentMethod: 'UPI',
                  referenceNumber: '',
                  notes: ''
                });
                setShowRecordPaymentModal(true);
              }}>
                + Record Payment
              </button>
            </div>

            {(data.payments || []).length > 0 ? (
              <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.payments || []).map((pay) => (
                      <tr key={pay.id}>
                        <td style={{ fontWeight: 500 }}>{pay.payment_date}</td>
                        <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                          ₹{parseFloat(pay.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-accent)', border: 'none' }}>
                            {pay.payment_method}
                          </span>
                        </td>
                        <td>{pay.reference_number || '-'}</td>
                        <td>{pay.notes || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <a 
                              href={`/api/patients/${id}/payments/${pay.id}/receipt-pdf`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="badge" 
                              style={{ cursor: 'pointer', textDecoration: 'none', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', border: 'none' }}
                            >
                              🖨️ Receipt
                            </a>
                            <button 
                              className="badge" 
                              style={{ cursor: 'pointer', border: 'none', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}
                              onClick={() => {
                                setSelectedPayment(pay);
                                setPaymentFormData({
                                  amount: pay.amount.toString(),
                                  paymentDate: pay.payment_date,
                                  paymentMethod: pay.payment_method,
                                  referenceNumber: pay.reference_number || '',
                                  notes: pay.notes || ''
                                });
                                setShowEditPaymentModal(true);
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              className="badge" 
                              style={{ cursor: 'pointer', border: 'none', background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
                              onClick={() => handleDeletePayment(pay.id)}
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
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                No payments recorded yet.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Medical Notes Modal */}
      <Modal 
        isOpen={showNotesModal} 
        onClose={() => { setShowNotesModal(false); setMedicalNotesText(patient.medicalHistory || ''); }} 
        title="Medical Notes History / Editor" 
        footer={
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowNotesModal(false); setMedicalNotesText(patient.medicalHistory || ''); }} disabled={isNotesSaving}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSaveMedicalNotes} disabled={isNotesSaving}>{isNotesSaving ? 'Saving...' : 'Save Notes'}</button>
          </>
        }
      >
        <div className="input-group">
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Active Clinical & Medical History Notes</label>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>
            Note: Updating these notes will instantly refresh the patient's card file, profile dashboard, and audit histories.
          </p>
          <textarea 
            className="input-field" 
            placeholder="Allergies, conditions, medications..." 
            rows={8} 
            value={medicalNotesText} 
            onChange={e => setMedicalNotesText(e.target.value)}
            disabled={isNotesSaving}
            style={{ fontSize: '0.9rem', lineHeight: '1.4' }}
          />
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal 
        isOpen={showRecordPaymentModal} 
        onClose={() => { setShowRecordPaymentModal(false); setPaymentErrorMsg(''); }} 
        title="Record New Payment" 
        footer={
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowRecordPaymentModal(false); setPaymentErrorMsg(''); }} disabled={isPaymentSaving}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleRecordPayment} disabled={isPaymentSaving}>{isPaymentSaving ? 'Saving...' : 'Save Payment'}</button>
          </>
        }
      >
        {paymentErrorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '16px', fontSize: '0.85rem' }}>
            ⚠️ {paymentErrorMsg}
          </div>
        )}
        <div className="grid-2">
          <div className="input-group">
            <label>Payment Date</label>
            <input type="date" className="input-field" value={paymentFormData.paymentDate} onChange={e => setPaymentFormData({...paymentFormData, paymentDate: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Amount (₹) *</label>
            <input type="number" step="0.01" placeholder="e.g. 5000" className="input-field" value={paymentFormData.amount} onChange={e => setPaymentFormData({...paymentFormData, amount: e.target.value})} />
          </div>
        </div>
        <div className="input-group">
          <label>Payment Method *</label>
          <select className="input-field" value={paymentFormData.paymentMethod} onChange={e => setPaymentFormData({...paymentFormData, paymentMethod: e.target.value})}>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Debit Card">Debit Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
            <option value="Insurance">Insurance</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="input-group">
          <label>Reference Number (Optional)</label>
          <input type="text" placeholder="e.g. TXN12345678" className="input-field" value={paymentFormData.referenceNumber} onChange={e => setPaymentFormData({...paymentFormData, referenceNumber: e.target.value})} />
        </div>
        <div className="input-group">
          <label>Notes (Optional)</label>
          <textarea className="input-field" placeholder="Any payment remarks..." rows={2} value={paymentFormData.notes} onChange={e => setPaymentFormData({...paymentFormData, notes: e.target.value})} />
        </div>
      </Modal>

      {/* Edit Payment Modal */}
      <Modal 
        isOpen={showEditPaymentModal} 
        onClose={() => { setShowEditPaymentModal(false); setPaymentErrorMsg(''); setSelectedPayment(null); }} 
        title="Edit Payment Record" 
        footer={
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowEditPaymentModal(false); setPaymentErrorMsg(''); setSelectedPayment(null); }} disabled={isPaymentSaving}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSavePaymentEdit} disabled={isPaymentSaving}>{isPaymentSaving ? 'Saving...' : 'Save Changes'}</button>
          </>
        }
      >
        {paymentErrorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '16px', fontSize: '0.85rem' }}>
            ⚠️ {paymentErrorMsg}
          </div>
        )}
        <div className="grid-2">
          <div className="input-group">
            <label>Payment Date</label>
            <input type="date" className="input-field" value={paymentFormData.paymentDate} onChange={e => setPaymentFormData({...paymentFormData, paymentDate: e.target.value})} />
          </div>
          <div className="input-group">
            <label>Amount (₹) *</label>
            <input type="number" step="0.01" placeholder="e.g. 5000" className="input-field" value={paymentFormData.amount} onChange={e => setPaymentFormData({...paymentFormData, amount: e.target.value})} />
          </div>
        </div>
        <div className="input-group">
          <label>Payment Method *</label>
          <select className="input-field" value={paymentFormData.paymentMethod} onChange={e => setPaymentFormData({...paymentFormData, paymentMethod: e.target.value})}>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Debit Card">Debit Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
            <option value="Insurance">Insurance</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="input-group">
          <label>Reference Number (Optional)</label>
          <input type="text" placeholder="e.g. TXN12345678" className="input-field" value={paymentFormData.referenceNumber} onChange={e => setPaymentFormData({...paymentFormData, referenceNumber: e.target.value})} />
        </div>
        <div className="input-group">
          <label>Notes (Optional)</label>
          <textarea className="input-field" placeholder="Any payment remarks..." rows={2} value={paymentFormData.notes} onChange={e => setPaymentFormData({...paymentFormData, notes: e.target.value})} />
        </div>
      </Modal>
    </div>
  );
}
