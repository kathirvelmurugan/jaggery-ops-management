
import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useStore } from './store/store'
import { UserInfo, PermissionGate, RoleGate } from './components/RoleBasedAccess'
import RoutesView from './routes'

const menu = [
  { to: '/', label: 'Dashboard', icon: '📊', permission: 'read' },
  { to: '/lots', label: 'Lots', icon: '📦', permission: 'read' },
  { to: '/sales-orders', label: 'Sales', icon: '🛒', permission: 'read' },
  { to: '/packing-queue', label: 'Packing', icon: '📋', permission: 'read' },
  { to: '/payments', label: 'Payments', icon: '💰', permission: 'financial' },
  { to: '/reports', label: 'Reports', icon: '📈', permission: 'read' },
  { to: '/master', label: 'Master', icon: '⚙️', permission: 'write' },
  { to: '/user-roles', label: 'Users', icon: '👥', roles: ['admin'] },
]

export default function App(){
  const location = useLocation()
  const { initializeStore, initialized, loading, errors, hasPermission, currentUser } = useStore()
  const [initError, setInitError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [hasAttemptedInit, setHasAttemptedInit] = useState(false)
  
  useEffect(() => {
    // Ensure we only try to initialize once
    if (!hasAttemptedInit && !initialized && !loading) {
      setHasAttemptedInit(true)
      console.log('Attempting to initialize store...')
      
      // Add a timeout to handle hanging requests
      const initTimeout = setTimeout(() => {
        if (!initialized) {
          setInitError('Connection timeout - database may be unavailable')
        }
      }, 10000) // 10 second timeout
      
      initializeStore()
        .then(() => {
          clearTimeout(initTimeout)
          console.log('Store initialized successfully')
        })
        .catch(error => {
          clearTimeout(initTimeout)
          console.error('App initialization error:', error)
          setInitError(error.message || 'Failed to connect to database')
        })
    }
  }, [hasAttemptedInit, initialized, loading, initializeStore])
  
  const handleRetry = () => {
    setInitError(null)
    setRetryCount(prev => prev + 1)
    setHasAttemptedInit(false) // Reset to allow retry
  }
  
  // Show loading for initial load or during retry
  if ((loading && !initialized) || (!hasAttemptedInit && !initError)) {
    return (
      <div className="app-container loading-container">
        <div className="loading-panel">
          <div className="loading-spinner"></div>
          <h2>🥭 Loading Jaggery OMS</h2>
          <p>Connecting to cloud database...</p>
          {retryCount > 0 && <p className="retry-info">Retry attempt: {retryCount}</p>}
        </div>
      </div>
    )
  }
  
  // Error state - better error handling
  if (initError || (!initialized && hasAttemptedInit && !loading)) {
    return (
      <div className="app-container error-container">
        <div className="error-panel">
          <div className="error-icon">⚠️</div>
          <h2>Connection Issue</h2>
          <p className="error-message">
            {initError || 'Unable to connect to the database'}
          </p>
          <div className="error-actions">
            <button onClick={handleRetry} className="btn btn-primary">
              🔄 Try Again
            </button>
            <button onClick={() => window.location.reload()} className="btn btn-secondary">
              ♻️ Refresh Page
            </button>
          </div>
          <details className="error-details">
            <summary>Need Help?</summary>
            <div className="help-content">
              <p>Check these common issues:</p>
              <ul>
                <li>Internet connection is working</li>
                <li>Supabase service is online</li>
                <li>Browser allows JavaScript</li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    )
  }
  
  // Successfully initialized - show the main app
  return (
    <div className="app-container app-ready">
      {/* Compact Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="app-title">
            <h1>🥭 Jaggery OMS</h1>
            <span className="app-subtitle">Simple Operations Management</span>
          </div>
          <div className="header-info">
            <UserInfo compact />
            <span className="connection-status">🟢 Connected</span>
            <span className="sippam-info">1 Sippam = 30kg</span>
          </div>
        </div>
      </header>
      
      {/* Simple Navigation with Role-Based Access */}
      <nav className="app-nav">
        <div className="nav-container">
          {menu.map(m => {
            // Check permissions for menu item
            let hasAccess = true
            
            if (m.permission && !hasPermission(m.permission)) {
              hasAccess = false
            }
            
            if (m.roles && (!currentUser || !m.roles.includes(currentUser.role))) {
              hasAccess = false
            }
            
            if (!hasAccess) {
              return (
                <div 
                  key={m.to} 
                  className="nav-item disabled"
                  title={`Requires ${m.permission || m.roles?.join('/') || 'permission'}`}
                >
                  <span className="nav-icon">{m.icon}</span>
                  <span className="nav-label">{m.label}</span>
                  <span className="nav-lock">🔒</span>
                </div>
              )
            }
            
            return (
              <NavLink 
                key={m.to} 
                to={m.to} 
                className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{m.icon}</span>
                <span className="nav-label">{m.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
      
      {/* Main Content Area */}
      <main className="app-main">
        <div className="main-container">
          <RoutesView />
        </div>
      </main>
      
      {/* Minimal Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <span>Jaggery OMS • React + Supabase</span>
          {currentUser && (
            <span className="footer-user">Logged in as {currentUser.full_name} ({currentUser.role})</span>
          )}
        </div>
      </footer>
    </div>
  )
}
