export default function StatCard({ title, value, change, changeType = 'positive', icon, iconColor = 'blue', className = '' }) {
  return (
    <div className={`glass-card stat-card ${className}`}>
      <div className={`stat-icon ${iconColor}`}>
        {icon}
      </div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{title}</div>
        {change && (
          <div className={`stat-change ${changeType}`}>
            {changeType === 'positive' ? '↑' : '↓'} {change}
          </div>
        )}
      </div>
    </div>
  );
}
