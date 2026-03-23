'use client';
import { useState, useRef, useEffect } from 'react';

export default function PatientPicker({ patients, value, onChange }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedPatient = patients.find(p => p.id === value);
  const filtered = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  ).slice(0, 10);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (patient) => {
    onChange(patient.id, patient.name);
    setSearch('');
    setIsOpen(false);
  };

  return (
    <div className="patient-picker" ref={containerRef}>
      <div 
        className={`patient-picker-input ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(true)}
      >
        {selectedPatient ? (
          <div className="selected-item">
            <span className="selected-name">{selectedPatient.name}</span>
            <span className="selected-phone">{selectedPatient.phone}</span>
          </div>
        ) : (
          <span className="placeholder">Select a patient...</span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', opacity: 0.5 }}>
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>

      {isOpen && (
        <div className="patient-picker-dropdown glass-card">
          <div className="picker-search-container">
            <input 
              autoFocus
              type="text" 
              className="input-field picker-search-input" 
              placeholder="Type to search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="picker-results">
            {filtered.length > 0 ? (
              filtered.map(p => (
                <div 
                  key={p.id} 
                  className={`picker-option ${p.id === value ? 'selected' : ''}`}
                  onClick={() => handleSelect(p)}
                >
                  <div className="option-name">{p.name}</div>
                  <div className="option-sub">{p.phone} • {p.email}</div>
                </div>
              ))
            ) : (
              <div className="picker-no-results">No patients found</div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .patient-picker {
          position: relative;
          width: 100%;
        }
        .patient-picker-input {
          display: flex;
          align-items: center;
          padding: 10px 14px;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 44px;
          box-shadow: var(--shadow-sm);
        }
        .patient-picker-input:hover {
          border-color: var(--color-accent);
          background: var(--color-bg-secondary);
        }
        .patient-picker-input.active {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
        }
        .selected-item {
          display: flex;
          flex-direction: column;
        }
        .selected-name {
          font-weight: 500;
          font-size: 0.9375rem;
        }
        .selected-phone {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
        .placeholder {
          color: var(--color-text-secondary);
          font-size: 0.9375rem;
        }
        .patient-picker-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          z-index: 1000;
          padding: 12px;
          background: var(--color-bg-primary);
          box-shadow: 0 10px 40px rgba(0,0,0,0.3), 0 0 0 1px var(--color-border);
          border-radius: var(--radius-lg);
          max-height: 400px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.2s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .picker-search-container {
          padding-bottom: 8px;
          border-bottom: 1px solid var(--color-border);
          margin-bottom: 4px;
        }
        .picker-search-input {
          height: 40px;
          font-size: 0.875rem;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
        }
        .picker-results {
          overflow-y: auto;
          flex: 1;
        }
        .picker-option {
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.2s;
        }
        .picker-option:hover {
          background: rgba(0, 122, 255, 0.1);
        }
        .picker-option.selected {
          background: var(--color-accent);
          color: #fff;
        }
        .option-name {
          font-weight: 500;
          font-size: 0.875rem;
        }
        .option-sub {
          font-size: 0.75rem;
          opacity: 0.7;
        }
        .picker-no-results {
          padding: 20px;
          text-align: center;
          color: var(--color-text-secondary);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
