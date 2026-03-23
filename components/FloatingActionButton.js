export default function FloatingActionButton({ icon, onClick, className = '', title }) {
  return (
    <button 
      className={`fab ${className}`} 
      onClick={onClick} 
      title={title}
    >
      {icon}
    </button>
  );
}
