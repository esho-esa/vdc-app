export default function GlassCard({ children, className = '', flat = false, ...props }) {
  const baseClass = flat ? 'glass-card-flat' : 'glass-card';
  return (
    <div className={`${baseClass} ${className}`} {...props}>
      {children}
    </div>
  );
}
