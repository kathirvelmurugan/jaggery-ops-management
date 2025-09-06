
import { useStore } from '../store/store'
import { Field } from '../components/Field'
import { Button } from '../components/Button'
import { Table } from '../components/Table'
import { useState } from 'react'

export default function Payments(){
  const s = useStore()
  const [pp, setPP] = useState({ lotId:'', amount:0, method:'Cash', ref:'' })
  const [sp, setSP] = useState({ salesOrderId:'', amount:0, method:'Cash', ref:'' })

  const lots = s.lots
  const orders = s.salesOrders
  
  // Calculate payment summaries
  const totalPurchasePayments = s.purchasePayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalSalesPayments = s.salesPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalCashPayments = [...s.purchasePayments, ...s.salesPayments]
    .filter(p => p.method === 'Cash')
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const totalRTGSPayments = [...s.purchasePayments, ...s.salesPayments]
    .filter(p => p.method === 'RTGS')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="grid">
      {/* Financial Summary Cards */}
      <div className="grid grid-4">
        <div className="panel summary-card">
          <h3>Total Purchase Payments</h3>
          <div className="summary-value purchase">₹{totalPurchasePayments.toFixed(2)}</div>
          <div className="summary-count">{s.purchasePayments.length} transactions</div>
        </div>
        <div className="panel summary-card">
          <h3>Total Sales Payments</h3>
          <div className="summary-value sales">₹{totalSalesPayments.toFixed(2)}</div>
          <div className="summary-count">{s.salesPayments.length} transactions</div>
        </div>
        <div className="panel summary-card">
          <h3>Cash Payments</h3>
          <div className="summary-value cash">₹{totalCashPayments.toFixed(2)}</div>
          <div className="summary-count">All cash transactions</div>
        </div>
        <div className="panel summary-card">
          <h3>RTGS Payments</h3>
          <div className="summary-value rtgs">₹{totalRTGSPayments.toFixed(2)}</div>
          <div className="summary-count">All RTGS transactions</div>
        </div>
      </div>
      
      {/* Payment Forms */}
      <div className="grid grid-2">
      <div className="panel">
        <h2>Purchase Payments</h2>
        <div className="grid grid-3">
          <Field label="Lot">
            <select value={pp.lotId} onChange={e=>setPP({...pp, lotId:e.target.value})}>
              <option value="">Select Lot</option>
              {lots.map(l => {
                const farmer = s.farmers.find(f => f.id === l.farmerId)
                return (
                  <option key={l.id} value={l.id}>
                    {l.lotNumber} - {farmer?.name || 'Unknown Farmer'}
                  </option>
                )
              })}
            </select>
          </Field>
          <Field label="Amount"><input type="number" value={pp.amount} onChange={e=>setPP({...pp, amount:e.target.value})} /></Field>
          <Field label="Method">
            <select value={pp.method} onChange={e=>setPP({...pp, method:e.target.value})}><option>Cash</option><option>RTGS</option></select>
          </Field>
          <Field label="Ref/Notes"><input value={pp.ref} onChange={e=>setPP({...pp, ref:e.target.value})} /></Field>
        </div>
        <Button className="primary" onClick={()=>{
          if(!pp.lotId || !pp.amount) return alert('Select lot and amount')
          s.addPurchasePayment({...pp, paymentDate: new Date().toISOString().slice(0,10), reference: pp.ref})
          setPP({ lotId:'', amount:0, method:'Cash', ref:'' }) // Reset form
          alert('Purchase payment recorded')
        }}>Save</Button>

        <hr />
        <Table
          columns={[
            {header:'Lot Number', render:r=> {
              const lot = s.lots.find(l=>l.id===r.lotId)
              return lot?.lotNumber || 'N/A'
            }},
            {header:'Farmer', render:r=> {
              const lot = s.lots.find(l=>l.id===r.lotId)
              const farmer = s.farmers.find(f => f.id === lot?.farmerId)
              return farmer?.name || 'Unknown'
            }},
            {header:'Amount', render:r=> `₹${Number(r.amount).toFixed(2)}`},
            {header:'Method', key:'method'},
            {header:'Reference', render:r=> r.reference || r.ref || '-'},
            {header:'Date', render:r=> {
              const date = r.paymentDate || r.createdAt
              return date ? new Date(date).toLocaleDateString() : '-'
            }},
          ]}
          rows={s.purchasePayments}
        />
      </div>

      <div className="panel">
        <h2>Sales Payments</h2>
        <div className="grid grid-3">
          <Field label="Sales Order">
            <select value={sp.salesOrderId} onChange={e=>setSP({...sp, salesOrderId:e.target.value})}>
              <option value="">Select Sales Order</option>
              {orders.map(o => {
                const customer = s.customers.find(c => c.id === o.customerId)
                return (
                  <option key={o.id} value={o.id}>
                    {o.id.slice(0,8)} - {customer?.name || 'Unknown Customer'}
                  </option>
                )
              })}
            </select>
          </Field>
          <Field label="Amount"><input type="number" value={sp.amount} onChange={e=>setSP({...sp, amount:e.target.value})} /></Field>
          <Field label="Method">
            <select value={sp.method} onChange={e=>setSP({...sp, method:e.target.value})}><option>Cash</option><option>RTGS</option></select>
          </Field>
          <Field label="Ref/Notes"><input value={sp.ref} onChange={e=>setSP({...sp, ref:e.target.value})} /></Field>
        </div>
        <Button className="primary" onClick={()=>{
          if(!sp.salesOrderId || !sp.amount) return alert('Select Sales Order and amount')
          s.addSalesPayment({...sp, paymentDate: new Date().toISOString().slice(0,10), reference: sp.ref})
          setSP({ salesOrderId:'', amount:0, method:'Cash', ref:'' }) // Reset form
          alert('Sales payment recorded')
        }}>Save</Button>

        <hr />
        <Table
          columns={[
            {header:'Order ID', render:r=> (r.salesOrderId||'').slice(0,8) },
            {header:'Customer', render:r=> {
              const order = s.salesOrders.find(o => o.id === r.salesOrderId)
              const customer = s.customers.find(c => c.id === order?.customerId)
              return customer?.name || 'Unknown'
            }},
            {header:'Amount', render:r=> `₹${Number(r.amount).toFixed(2)}`},
            {header:'Method', key:'method'},
            {header:'Reference', render:r=> r.reference || r.ref || '-'},
            {header:'Date', render:r=> {
              const date = r.paymentDate || r.createdAt
              return date ? new Date(date).toLocaleDateString() : '-'
            }},
          ]}
          rows={s.salesPayments}
        />
      </div>
      </div>
      
      <style jsx>{`
        .summary-card {
          text-align: center;
          padding: 20px;
        }
        
        .summary-card h3 {
          margin: 0 0 12px 0;
          color: #666;
          font-size: 14px;
          font-weight: 500;
        }
        
        .summary-value {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        
        .summary-value.purchase {
          color: #FF9800;
        }
        
        .summary-value.sales {
          color: #4CAF50;
        }
        
        .summary-value.cash {
          color: #2196F3;
        }
        
        .summary-value.rtgs {
          color: #9C27B0;
        }
        
        .summary-count {
          font-size: 12px;
          color: #999;
        }
      `}</style>
    </div>
  )
}
