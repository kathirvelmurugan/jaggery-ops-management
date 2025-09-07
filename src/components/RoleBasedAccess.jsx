import { useStore } from '../store/store'

// Higher Order Component for role-based access control
export function withRoleCheck(WrappedComponent, requiredPermissions = []) {
  return function RoleProtectedComponent(props) {
    const s = useStore()
    
    // Check if user has all required permissions
    const hasAccess = requiredPermissions.length === 0 || 
      requiredPermissions.every(permission => s.hasPermission(permission))
    
    if (!hasAccess) {
      return (
        <div className="access-denied">
          <div className="access-denied-content">
            <div className="access-denied-icon">🚫</div>
            <h3>Access Denied</h3>
            <p>You don't have permission to access this feature.</p>
            <p>Required permissions: {requiredPermissions.join(', ')}</p>
            {s.currentUser && (
              <p>Your role: <strong>{s.currentUser.role}</strong></p>
            )}
          </div>
        </div>
      )
    }
    
    return <WrappedComponent {...props} />
  }
}

// Component for conditionally rendering based on permissions
export function PermissionGate({ children, permission, fallback = null }) {
  const s = useStore()
  
  if (!permission || s.hasPermission(permission)) {
    return children
  }
  
  return fallback
}

// Component for conditionally rendering based on role
export function RoleGate({ children, roles = [], fallback = null }) {
  const s = useStore()
  
  if (!s.currentUser) return fallback
  
  if (roles.length === 0 || roles.includes(s.currentUser.role)) {
    return children
  }
  
  return fallback
}

// Component to hide financial data from dispatch users
export function FinancialData({ children, hideForDispatch = true }) {
  const s = useStore()
  
  if (hideForDispatch && !s.canViewFinancials()) {
    return (
      <div className="financial-data-hidden">
        <span className="hidden-text">💰 Financial data hidden</span>
      </div>
    )
  }
  
  return children
}

// Enhanced Button component with role checks
export function RoleButton({ 
  children, 
  permission, 
  roles, 
  onClick, 
  variant = 'secondary',
  hideIfNoAccess = false,
  disableIfNoAccess = true,
  ...props 
}) {
  const s = useStore()
  
  let hasAccess = true
  
  // Check permission
  if (permission && !s.hasPermission(permission)) {
    hasAccess = false
  }
  
  // Check role
  if (roles && roles.length > 0 && (!s.currentUser || !roles.includes(s.currentUser.role))) {
    hasAccess = false
  }
  
  if (!hasAccess && hideIfNoAccess) {
    return null
  }
  
  return (
    <button
      className={`btn btn-${variant} ${!hasAccess && disableIfNoAccess ? 'disabled' : ''}`}
      onClick={hasAccess ? onClick : () => alert('You don\'t have permission to perform this action')}
      disabled={!hasAccess && disableIfNoAccess}
      {...props}
    >
      {children}
      {!hasAccess && !hideIfNoAccess && <span className="no-access-indicator"> 🔒</span>}
    </button>
  )
}

// User info display component
export function UserInfo({ compact = false }) {
  const s = useStore()
  
  if (!s.currentUser) {
    return (
      <div className="user-info no-user">
        <span>👤 No user</span>
      </div>
    )
  }
  
  if (compact) {
    return (
      <div className="user-info compact">
        <span className="user-name">{s.currentUser.full_name}</span>
        <span className={`role-indicator role-${s.currentUser.role}`}>
          {s.currentUser.role}
        </span>
      </div>
    )
  }
  
  return (
    <div className="user-info detailed">
      <div className="user-avatar">👤</div>
      <div className="user-details">
        <div className="user-name">{s.currentUser.full_name}</div>
        <div className="user-role">
          <span className={`role-badge role-${s.currentUser.role}`}>
            {s.currentUser.role.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  )
}

// Quick permission checker component for debugging
export function PermissionDebugger() {
  const s = useStore()
  
  if (!s.currentUser) return null
  
  return (
    <div className="permission-debugger">
      <details>
        <summary>🔍 Permission Debug ({s.currentUser.role})</summary>
        <div className="debug-content">
          <div>Read: {s.hasPermission('read') ? '✅' : '❌'}</div>
          <div>Write: {s.hasPermission('write') ? '✅' : '❌'}</div>
          <div>Delete: {s.hasPermission('delete') ? '✅' : '❌'}</div>
          <div>Financial: {s.hasPermission('financial') ? '✅' : '❌'}</div>
        </div>
      </details>
    </div>
  )
}

// CSS styles for role-based components
const roleStyles = `
.access-denied {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 40px;
}

.access-denied-content {
  text-align: center;
  max-width: 400px;
  padding: 32px;
  background: rgba(239, 68, 68, 0.05);
  border: 2px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
}

.access-denied-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.access-denied h3 {
  margin: 0 0 12px 0;
  color: var(--bad);
}

.access-denied p {
  margin: 8px 0;
  color: var(--muted);
  font-size: 14px;
}

.financial-data-hidden {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(156, 163, 175, 0.1);
  border: 1px dashed var(--muted);
  border-radius: 8px;
  color: var(--muted);
  font-style: italic;
}

.btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-access-indicator {
  font-size: 10px;
  margin-left: 4px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--nav-bg);
  border: 1px solid var(--border);
}

.user-info.compact {
  padding: 6px 10px;
  font-size: 12px;
}

.user-info.no-user {
  color: var(--muted);
  font-style: italic;
}

.user-avatar {
  font-size: 16px;
}

.user-name {
  font-weight: 500;
  color: var(--text);
}

.role-indicator {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 600;
}

.role-indicator.role-admin {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.role-indicator.role-manager {
  background: rgba(34, 211, 238, 0.15);
  color: #0891b2;
}

.role-indicator.role-dispatch {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.permission-debugger {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1000;
  font-size: 12px;
}

.permission-debugger summary {
  cursor: pointer;
  padding: 8px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--muted);
}

.debug-content {
  margin-top: 4px;
  padding: 8px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  min-width: 120px;
}

.debug-content > div {
  margin: 2px 0;
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = roleStyles
  document.head.appendChild(styleElement)
}