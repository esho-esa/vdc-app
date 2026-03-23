export default function InputField({ label, id, Icon, className = '', ...props }) {
  return (
    <div className={`input-group ${className}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }}>
            <Icon size={18} />
          </div>
        )}
        <input 
          id={id} 
          className={`input-field ${Icon ? 'input-search' : ''}`} 
          style={Icon ? { paddingLeft: '44px', backgroundImage: 'none' } : {}}
          {...props} 
        />
      </div>
    </div>
  );
}
