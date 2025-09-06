
import { NavLink, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from './store/store'
import RoutesView from './routes'

const menu = [
  { to: '/', label: 'Dashboard' },
  { to: '/lots', label: 'Lots' },
  { to: '/sales-orders', label: 'Sales Orders' },
  { to: '/packing-queue', label: 'Packing Queue' },
  { to: '/payments', label: 'Payments' },
  { to: '/reports', label: 'Reports' },
  { to: '/accounts-payable', label: 'Accounts Payable' },
  { to: '/accounts-receivable', label: 'Accounts Receivable' },
  { to: '/master', label: 'Master Data' },
]

export default function App(){
  const location = useLocation()
  const { initializeStore, initialized, loading } = useStore()
  
  useEffect(() => {
    if (!initialized) {
      initializeStore()
    }
  }, [initialized, initializeStore])
  
  if (loading) {
    return (
      <div className="container">
        <div className="panel" style={{textAlign: 'center', padding: '60px'}}>
          <h2>Loading Jaggery Operations System...</h2>
          <p>Connecting to cloud database...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="container">
      <div className="panel">
        <h1>Jaggery Operations Management System</h1>
        <div className="small">Default: 1 Sippam (Bag) = 30 kg (can be overridden per lot)</div>
        <nav className="row" style={{marginTop:12}}>
          {menu.map(m => (
            <NavLink key={m.to} to={m.to} className={({isActive}) => isActive ? 'active' : ''}>{m.label}</NavLink>
          ))}
        </nav>
        <RoutesView />
      </div>
      <div className="small" style={{marginTop:12}}>Built with React + Supabase (cloud database). Multi-user real-time system.</div>
    </div>
  )
}
