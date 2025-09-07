
export function Field({ label, children, error, required = false }) {
  return (
    <div className="field-container">
      <label className={error ? 'field-label-error' : 'field-label'}>
        {label}
        {required && <span className="required-indicator">*</span>}
      </label>
      {children}
      {error && <div className="field-error">{error}</div>}
    </div>
  )
}
