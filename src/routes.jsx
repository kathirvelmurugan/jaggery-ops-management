
import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Lots from './pages/Lots'
import SalesOrders from './pages/SalesOrders'
import PackingQueue from './pages/PackingQueue'
import Payments from './pages/Payments'
import Reports from './pages/Reports'
import MasterData from './pages/MasterData'
import AccountsPayable from './pages/AccountsPayable'
import AccountsReceivable from './pages/AccountsReceivable'

export default function RoutesView(){
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/lots" element={<Lots />} />
      <Route path="/sales-orders" element={<SalesOrders />} />
      <Route path="/packing-queue" element={<PackingQueue />} />
      <Route path="/payments" element={<Payments />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/accounts-payable" element={<AccountsPayable />} />
      <Route path="/accounts-receivable" element={<AccountsReceivable />} />
      <Route path="/master" element={<MasterData />} />
    </Routes>
  )
}
