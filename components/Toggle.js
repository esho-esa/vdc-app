export default function Toggle({ checked, onChange, id }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input 
        type="checkbox" 
        id={id} 
        checked={checked} 
        onChange={onChange} 
      />
      <span className="toggle-slider"></span>
    </label>
  );
}
