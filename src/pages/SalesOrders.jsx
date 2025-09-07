
import { useStore } from '../store/store'
import { Field } from '../components/Field'
import { Button } from '../components/Button'
import { Table } from '../components/Table'
import { PaymentForm } from '../components/PaymentForm'
import { PaymentHistory } from '../components/PaymentHistory'
import { PaymentSummary } from '../components/PaymentSummary'
import { useState } from 'react'

function CreateSO(){
  const s = useStore()
  const addSalesOrder = s.addSalesOrder
  const [form, setForm] = useState({ order_date: new Date().toISOString().slice(0,10), customer_id: '', notes: '' })

  return (
    <div className="panel">
      <h2>Create Sales Order</h2>
      <div className="grid grid-3">
        <Field label="Order Date"><input type="date" value={form.order_date} onChange={e=>setForm({...form, order_date:e.target.value})} /></Field>
        <Field label="Customer">
          <select value={form.customer_id} onChange={e=>setForm({...form, customer_id:e.target.value})}>
            <option value="">Select</option>
            {s.customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.company_name}</option>)}
          </select>
        </Field>
        <Field label="Notes"><input value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} /></Field>
      </div>
      <Button className="primary" onClick={()=>{
        if(!form.customer_id) return alert('Select customer')
        addSalesOrder(form)
        alert('Sales order created')
      }}>Save</Button>
    </div>
  )
}

function PickListCreator(){
  const s = useStore()
  const [form, setForm] = useState({
    order_id:'',
    lot_id:'',
    lot_item_id:'', // Updated to use lot_item_id
    customer_mark:'',
    planned_bags:0, 
    planned_loose_kg:0,
    sale_rate_per_kg:0, 
    packaging_type:'Bag'
  })
  const [selectedLot, setSelectedLot] = useState(null)
  const [selectedLotItem, setSelectedLotItem] = useState(null)
  const [availableLotItems, setAvailableLotItems] = useState([])

  // Get lots that have available lot items
  const availableLots = s.lots.filter(l => {
    const lotItems = s.lotItems.filter(li => li.lot_id === l.lot_id && li.current_total_kg > 0)
    return lotItems.length > 0
  })
  
  // Calculate planned total kg and value
  const sippamKg = 30 // Default sippam weight
  const plannedTotalKg = Number(form.planned_bags||0) * sippamKg + Number(form.planned_loose_kg||0)
  const plannedValue = plannedTotalKg * Number(form.sale_rate_per_kg||0)
  
  const handleLotChange = (lot_id) => {
    // Reset product selection when lot changes
    setForm({...form, lot_id, lot_item_id: '', sale_rate_per_kg: 0})
    const lot = availableLots.find(l => l.lot_id === lot_id)
    setSelectedLot(lot)
    setSelectedLotItem(null)
    
    // Get available lot items for this lot
    if (lot) {
      const lotItems = s.lotItems.filter(li => li.lot_id === lot_id && li.current_total_kg > 0)
      setAvailableLotItems(lotItems)
    } else {
      setAvailableLotItems([])
    }
  }
  
  const handleLotItemChange = (lot_item_id) => {
    setForm({...form, lot_item_id})
    const lotItem = availableLotItems.find(li => li.lot_item_id === lot_item_id)
    setSelectedLotItem(lotItem)
    
    // Auto-populate sale rate with purchase rate + margin (suggested)
    if (lotItem && form.sale_rate_per_kg === 0) {
      const suggestedRate = Number(lotItem.purchase_rate_per_kg) * 1.1 // 10% margin suggestion
      setForm(prev => ({...prev, sale_rate_per_kg: suggestedRate.toFixed(2)}))
    }
  }

  return (
    <div className="panel">
      <h2>Create Pick List Item</h2>
      <div className="grid grid-3">
        <Field label="Sales Order">
          <select value={form.order_id} onChange={e=>setForm({...form, order_id:e.target.value})}>
            <option value="">Select Sales Order</option>
            {s.salesOrders.map(o => {
              const customer = s.customers.find(c=>c.customer_id===o.customer_id)
              return (
                <option key={o.order_id} value={o.order_id}>
                  {o.order_id.slice(0,8)} — {customer?.company_name} ({o.order_date})
                </option>
              )
            })}
          </select>
        </Field>
        <Field label="Lot">
          <select value={form.lot_id} onChange={e=>handleLotChange(e.target.value)}>
            <option value="">Select Lot</option>
            {availableLots.map(l => {
              const totalAvailableKg = s.lotItems
                .filter(li => li.lot_id === l.lot_id && li.current_total_kg > 0)
                .reduce((sum, li) => sum + li.current_total_kg, 0)
              return (
                <option key={l.lot_id} value={l.lot_id}>
                  {l.lot_number} - {totalAvailableKg.toFixed(2)}kg available
                </option>
              )
            })}
          </select>
        </Field>
        <Field label="Product">
          <select 
            value={form.lot_item_id} 
            onChange={e=>handleLotItemChange(e.target.value)}
            disabled={!form.lot_id}
          >
            <option value="">Select Product</option>
            {availableLotItems.map(li => {
              const product = s.products.find(p => p.product_id === li.product_id)
              return (
                <option key={li.lot_item_id} value={li.lot_item_id}>
                  {product?.product_name || 'Unknown Product'} - {li.current_total_kg.toFixed(2)}kg @ ₹{li.purchase_rate_per_kg}/kg
                </option>
              )
            })}
          </select>
        </Field>
        <Field label="Customer Mark">
          <input 
            value={form.customer_mark} 
            onChange={e=>setForm({...form, customer_mark:e.target.value})} 
            placeholder="Customer reference"
          />
        </Field>
        <Field label="Planned Bags (Sippam)">
          <input 
            type="number" 
            value={form.planned_bags} 
            onChange={e=>setForm({...form, planned_bags:e.target.value})} 
          />
        </Field>
        <Field label="Planned Loose Kg">
          <input 
            type="number" 
            step="0.01"
            value={form.planned_loose_kg} 
            onChange={e=>setForm({...form, planned_loose_kg:e.target.value})} 
          />
        </Field>
        <Field label="Sale Rate per Kg (₹)">
          <input 
            type="number" 
            step="0.01"
            value={form.sale_rate_per_kg} 
            onChange={e=>setForm({...form, sale_rate_per_kg:e.target.value})} 
            placeholder="Enter sale price"
          />
        </Field>
        <Field label="Packaging Type">
          <select value={form.packaging_type} onChange={e=>setForm({...form, packaging_type:e.target.value})}>
            <option>Bag</option>
            <option>Box</option>
          </select>
        </Field>
      </div>
      
      {/* Live Calculation Display */}
      {selectedLot && selectedLotItem && (
        <div className="calculation-summary">
          <h4>Calculation Summary</h4>
          <div className="grid grid-4">
            <div><strong>Lot:</strong> {selectedLot.lot_number}</div>
            <div><strong>Product:</strong> {s.products.find(p => p.product_id === selectedLotItem.product_id)?.product_name || 'Unknown'}</div>
            <div><strong>Available:</strong> {selectedLotItem.current_total_kg.toFixed(2)} kg</div>
            <div><strong>Planned Total:</strong> {plannedTotalKg.toFixed(2)} kg</div>
          </div>
          <div className="grid grid-2 calc-financials">
            <div><strong>Estimated Value:</strong> ₹{plannedValue.toFixed(2)}</div>
            <div><strong>Margin:</strong> ₹{(Number(form.sale_rate_per_kg) - Number(selectedLotItem.purchase_rate_per_kg)).toFixed(2)}/kg</div>
          </div>
          <div className="calc-rates">
            Purchase Rate: ₹{selectedLotItem.purchase_rate_per_kg}/kg | Sale Rate: ₹{form.sale_rate_per_kg}/kg
          </div>
        </div>
      )}
      
      <div className="row" style={{marginTop: 12}}>
        <Button className="primary" onClick={()=>{
          if(!form.order_id || !form.lot_id) {
            alert('Please select Sales Order and Lot')
            return
          }
          if(!form.lot_item_id) {
            alert('Please select a specific product from the lot')
            return
          }
          if(Number(form.sale_rate_per_kg) <= 0) {
            alert('Please enter a valid sale rate')
            return
          }
          if(plannedTotalKg <= 0) {
            alert('Please enter planned quantity (bags or loose kg)')
            return
          }
          if(plannedTotalKg > selectedLotItem.current_total_kg) {
            alert(`Planned quantity (${plannedTotalKg}kg) exceeds available quantity (${selectedLotItem.current_total_kg}kg)`)
            return
          }
          
          s.addPickItem(form)
          
          // Reset form
          setForm({
            order_id:'',
            lot_id:'',
            lot_item_id:'',
            customer_mark:'',
            planned_bags:0, 
            planned_loose_kg:0,
            sale_rate_per_kg:0, 
            packaging_type:'Bag'
          })
          setSelectedLot(null)
          setSelectedLotItem(null)
          setAvailableLotItems([])
          
          alert('Pick list item added successfully')
        }}>Add to Pick List</Button>
      </div>
    </div>
  )
}

export default function SalesOrders(){
  const s = useStore()
  const orders = s.salesOrders
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  
  const rows = orders.map(o => {
    const customer = s.customers.find(c=>c.customer_id===o.customer_id)?.company_name || '-'
    const items = s.picklistItems.filter(p=>p.order_id===o.order_id)
    
    // Calculate sale value using actual quantities where available, planned as fallback
    const saleValue = items.reduce((sum, item) => {
      const actualKg = item.actual_total_kg
      const plannedKg = (item.planned_bags || 0) * 30 + (item.planned_loose_kg || 0) // 30kg default sippam
      const quantity = actualKg > 0 ? actualKg : plannedKg
      return sum + (quantity * (item.sale_rate_per_kg || 0))
    }, 0)
    
    const paid = s.salesPayments.filter(sp=>sp.order_id===o.order_id).reduce((a,b)=>a+Number(b.amount_paid),0)
    const balance = saleValue - paid
    return { ...o, customer, items:items.length, saleValue, paid, balance }
  })

  return (
    <div className="grid">
      {!selectedOrder ? (
        <>
          <CreateSO />
          <PickListCreator />

          <div className="panel">
            <h2>Sales Orders</h2>
            <Table
              columns={[
                {header:'Order ID', render:r=>r.order_id.slice(0,8)},
                {header:'Customer', key:'customer'},
                {header:'Order Date', key:'order_date'},
                {header:'Status', key:'status'},
                {header:'Items', key:'items'},
                {header:'Sale Value', render:r=>`₹ ${r.saleValue.toFixed(2)}`},
                {header:'Paid', render:r=>`₹ ${r.paid.toFixed(2)}`},
                {header:'Balance', render:r=>`₹ ${r.balance.toFixed(2)}`},
                {header:'Actions', render: r => (
                  <Button variant="secondary" onClick={() => setSelectedOrder(r)}>View Details</Button>
                )}
              ]}
              rows={rows}
            />
          </div>
        </>
      ) : (
        <SalesOrderDetailsView 
          order={selectedOrder}
          onBack={() => setSelectedOrder(null)}
          showPaymentForm={showPaymentForm}
          setShowPaymentForm={setShowPaymentForm}
        />
      )}
    </div>
  )
}

function SalesOrderDetailsView({ order, onBack, showPaymentForm, setShowPaymentForm }) {
  const s = useStore()
  const addSalesPayment = s.addSalesPayment
  
  // Get order details
  const customer = s.customers.find(c => c.customer_id === order.customer_id)
  const pickItems = s.picklistItems.filter(p => p.order_id === order.order_id)
  const dispatches = s.dispatchConfirmations.filter(d => 
    pickItems.some(p => p.picklist_item_id === d.picklist_item_id)
  )
  
  // Calculate financial data - Enhanced to show real values
  // Use actual packed/dispatched quantities where available, planned quantities as fallback
  const totalOrderValue = pickItems.reduce((sum, item) => {
    // Check if item has been packed (has actual quantities)
    const actualKg = item.actual_total_kg
    const plannedKg = (item.planned_bags || 0) * 30 + (item.planned_loose_kg || 0) // 30kg default sippam
    const quantity = actualKg > 0 ? actualKg : plannedKg
    return sum + (quantity * (item.sale_rate_per_kg || 0))
  }, 0)
  
  const orderPayments = s.salesPayments.filter(p => p.order_id === order.order_id)
  const totalPaid = orderPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
  
  const handleAddPayment = (paymentData) => {
    addSalesPayment({
      order_id: order.order_id,
      amount_paid: paymentData.amount,
      payment_date: paymentData.paymentDate,
      payment_method: paymentData.method,
      reference_details: paymentData.reference
    })
    setShowPaymentForm(false)
    alert('Payment recorded successfully')
  }
  
  return (
    <div>
      <div className="row" style={{ marginBottom: 16, alignItems: 'center' }}>
        <Button variant="secondary" onClick={onBack}>← Back to Sales Orders</Button>
        <h2 style={{ margin: 0 }}>Sales Order Details: {order.order_id.slice(0, 8)}</h2>
      </div>
      
      <div className="grid grid-2">
        {/* Order Information */}
        <div className="panel">
          <h3>Order Information</h3>
          <div className="details-grid">
            <div><strong>Order Date:</strong> {order.order_date}</div>
            <div><strong>Customer:</strong> {customer?.company_name || '-'}</div>
            <div><strong>Status:</strong> {order.status}</div>
            <div><strong>Notes:</strong> {order.notes || '-'}</div>
            <div><strong>Pick Items:</strong> {pickItems.length}</div>
            <div><strong>Dispatched Items:</strong> {dispatches.length}</div>
          </div>
        </div>
        
        {/* Financial Summary */}
        <PaymentSummary 
          totalValue={totalOrderValue}
          totalPaid={totalPaid}
          payments={orderPayments}
          title="Sales Financial Summary"
          valueLabel="Total Order Value"
          paidLabel="Amount Received"
          balanceLabel="Balance Due"
        />
      </div>
      
      {/* Order Items Details */}
      <div className="panel">
        <h3>Order Items & Dispatches</h3>
        <Table
          columns={[
            {header:'Lot Number', render: r => {
              const lotItem = s.lotItems.find(li => li.lot_item_id === r.lot_item_id)
              const lot = s.lots.find(l => l.lot_id === lotItem?.lot_id)
              return lot?.lot_number || '-'
            }},
            {header:'Product', render: r => {
              const lotItem = s.lotItems.find(li => li.lot_item_id === r.lot_item_id)
              const product = s.products.find(p => p.product_id === lotItem?.product_id)
              return product?.product_name || 'Unknown Product'
            }},
            {header:'Customer Mark', key:'customer_mark'},
            {header:'Planned Kg', render: r => {
              const sippam = 30 // Default sippam weight
              return (r.planned_bags * sippam + r.planned_loose_kg).toFixed(2)
            }},
            {header:'Actual Kg', render: r => r.actual_total_kg?.toFixed(2) || 'Not packed'},
            {header:'Sale Rate', render: r => `₹${Number(r.sale_rate_per_kg).toFixed(2)}/kg`},
            {header:'Planned Value', render: r => {
              const sippam = 30 // Default sippam weight
              const plannedKg = r.planned_bags * sippam + r.planned_loose_kg
              return `₹${(plannedKg * r.sale_rate_per_kg).toFixed(2)}`
            }},
            {header:'Actual Value', render: r => {
              const actualKg = r.actual_total_kg || 0
              return actualKg > 0 ? `₹${(actualKg * r.sale_rate_per_kg).toFixed(2)}` : '-'
            }},
            {header:'Status', render: r => (
              <span className={`status-badge status-${r.status.toLowerCase().replace(' ', '-')}`}>
                {r.status}
              </span>
            )}
          ]}
          rows={pickItems}
        />
      </div>
      
      {/* Payment Management */}
      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <Button 
          variant="primary" 
          onClick={() => setShowPaymentForm(!showPaymentForm)}
          disabled={totalOrderValue === 0}
        >
          {showPaymentForm ? 'Cancel' : 'Record Payment'}
        </Button>
        {totalOrderValue === 0 && (
          <span style={{ color: '#666', fontSize: '14px' }}>No dispatched items to record payment for</span>
        )}
      </div>
      
      {showPaymentForm && (
        <PaymentForm 
          title="Record Customer Payment"
          onSubmit={handleAddPayment}
          onCancel={() => setShowPaymentForm(false)}
        />
      )}
      
      {/* Payment History */}
      <PaymentHistory 
        payments={orderPayments}
        title="Customer Payment History"
      />
      
      <style jsx>{`
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          font-size: 14px;
        }
        
        .details-grid > div {
          padding: 4px 0;
          border-bottom: 1px solid #f0f0f0;
        }
      `}</style>
    </div>
  )
}
