
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
  const [form, setForm] = useState({ orderDate: new Date().toISOString().slice(0,10), customerId: '', notes: '' })

  return (
    <div className="panel">
      <h2>Create Sales Order</h2>
      <div className="grid grid-3">
        <Field label="Order Date"><input type="date" value={form.orderDate} onChange={e=>setForm({...form, orderDate:e.target.value})} /></Field>
        <Field label="Customer">
          <select value={form.customerId} onChange={e=>setForm({...form, customerId:e.target.value})}>
            <option value="">Select</option>
            {s.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Notes"><input value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} /></Field>
      </div>
      <Button className="primary" onClick={()=>{
        if(!form.customerId) return alert('Select customer')
        addSalesOrder(form)
        alert('Sales order created')
      }}>Save</Button>
    </div>
  )
}

function PickListCreator(){
  const s = useStore()
  const [form, setForm] = useState({
    salesOrderId:'',
    lotId:'',
    lotProductId:'', // New field for specific product in lot
    customerMark:'',
    plannedBags:0, 
    plannedLooseKg:0,
    saleRate:0, 
    packagingType:'Bag'
  })
  const [selectedLot, setSelectedLot] = useState(null)
  const [selectedLotProduct, setSelectedLotProduct] = useState(null)
  const [availableLotProducts, setAvailableLotProducts] = useState([])

  // Get lots that have available products
  const availableLots = s.lots.filter(l => {
    const lotProducts = s.lotProducts.filter(lp => lp.lotId === l.id && lp.currentTotalKg > 0)
    return lotProducts.length > 0
  })
  
  // Calculate planned total kg and value
  const sippamKg = selectedLotProduct?.sippamKg || s.meta.sippamKgDefault || 30
  const plannedTotalKg = Number(form.plannedBags||0) * sippamKg + Number(form.plannedLooseKg||0)
  const plannedValue = plannedTotalKg * Number(form.saleRate||0)
  
  const handleLotChange = (lotId) => {
    // Reset product selection when lot changes
    setForm({...form, lotId, lotProductId: '', saleRate: 0})
    const lot = availableLots.find(l => l.id === lotId)
    setSelectedLot(lot)
    setSelectedLotProduct(null)
    
    // Get available products for this lot
    if (lot) {
      const lotProducts = s.lotProducts.filter(lp => lp.lotId === lotId && lp.currentTotalKg > 0)
      setAvailableLotProducts(lotProducts)
    } else {
      setAvailableLotProducts([])
    }
  }
  
  const handleLotProductChange = (lotProductId) => {
    setForm({...form, lotProductId})
    const lotProduct = availableLotProducts.find(lp => lp.id === lotProductId)
    setSelectedLotProduct(lotProduct)
    
    // Auto-populate sale rate with purchase rate + margin (suggested)
    if (lotProduct && form.saleRate === 0) {
      const suggestedRate = Number(lotProduct.purchaseRate) * 1.1 // 10% margin suggestion
      setForm(prev => ({...prev, saleRate: suggestedRate.toFixed(2)}))
    }
  }

  return (
    <div className="panel">
      <h2>Create Pick List Item</h2>
      <div className="grid grid-3">
        <Field label="Sales Order">
          <select value={form.salesOrderId} onChange={e=>setForm({...form, salesOrderId:e.target.value})}>
            <option value="">Select Sales Order</option>
            {s.salesOrders.map(o => {
              const customer = s.customers.find(c=>c.id===o.customerId)
              return (
                <option key={o.id} value={o.id}>
                  {o.id.slice(0,8)} — {customer?.name} ({o.orderDate})
                </option>
              )
            })}
          </select>
        </Field>
        <Field label="Lot">
          <select value={form.lotId} onChange={e=>handleLotChange(e.target.value)}>
            <option value="">Select Lot</option>
            {availableLots.map(l => {
              const totalAvailableKg = s.lotProducts
                .filter(lp => lp.lotId === l.id && lp.currentTotalKg > 0)
                .reduce((sum, lp) => sum + lp.currentTotalKg, 0)
              return (
                <option key={l.id} value={l.id}>
                  {l.lotNumber} - {totalAvailableKg.toFixed(2)}kg available
                </option>
              )
            })}
          </select>
        </Field>
        <Field label="Product">
          <select 
            value={form.lotProductId} 
            onChange={e=>handleLotProductChange(e.target.value)}
            disabled={!form.lotId}
          >
            <option value="">Select Product</option>
            {availableLotProducts.map(lp => {
              const product = s.products.find(p => p.id === lp.productId)
              return (
                <option key={lp.id} value={lp.id}>
                  {product?.name || 'Unknown Product'} - {lp.currentTotalKg.toFixed(2)}kg @ ₹{lp.purchaseRate}/kg
                </option>
              )
            })}
          </select>
        </Field>
        <Field label="Customer Mark">
          <input 
            value={form.customerMark} 
            onChange={e=>setForm({...form, customerMark:e.target.value})} 
            placeholder="Customer reference"
          />
        </Field>
        <Field label="Planned Bags (Sippam)">
          <input 
            type="number" 
            value={form.plannedBags} 
            onChange={e=>setForm({...form, plannedBags:e.target.value})} 
          />
        </Field>
        <Field label="Planned Loose Kg">
          <input 
            type="number" 
            step="0.01"
            value={form.plannedLooseKg} 
            onChange={e=>setForm({...form, plannedLooseKg:e.target.value})} 
          />
        </Field>
        <Field label="Sale Rate per Kg (₹)">
          <input 
            type="number" 
            step="0.01"
            value={form.saleRate} 
            onChange={e=>setForm({...form, saleRate:e.target.value})} 
            placeholder="Enter sale price"
          />
        </Field>
        <Field label="Packaging Type">
          <select value={form.packagingType} onChange={e=>setForm({...form, packagingType:e.target.value})}>
            <option>Bag</option>
            <option>Box</option>
          </select>
        </Field>
      </div>
      
      {/* Live Calculation Display */}
      {selectedLot && selectedLotProduct && (
        <div className="calculation-summary" style={{marginTop: 12, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 4}}>
          <h4 style={{margin: '0 0 8px 0', fontSize: 14}}>Calculation Summary</h4>
          <div className="grid grid-4">
            <div><strong>Lot:</strong> {selectedLot.lotNumber}</div>
            <div><strong>Product:</strong> {s.products.find(p => p.id === selectedLotProduct.productId)?.name || 'Unknown'}</div>
            <div><strong>Available:</strong> {selectedLotProduct.currentTotalKg.toFixed(2)} kg</div>
            <div><strong>Planned Total:</strong> {plannedTotalKg.toFixed(2)} kg</div>
          </div>
          <div className="grid grid-2" style={{marginTop: 8}}>
            <div><strong>Estimated Value:</strong> ₹{plannedValue.toFixed(2)}</div>
            <div><strong>Margin:</strong> ₹{(Number(form.saleRate) - Number(selectedLotProduct.purchaseRate)).toFixed(2)}/kg</div>
          </div>
          <div style={{marginTop: 8, fontSize: 12, color: '#666'}}>
            Purchase Rate: ₹{selectedLotProduct.purchaseRate}/kg | Sale Rate: ₹{form.saleRate}/kg
          </div>
        </div>
      )}
      
      <div className="row" style={{marginTop: 12}}>
        <Button className="primary" onClick={()=>{
          if(!form.salesOrderId || !form.lotId) {
            alert('Please select Sales Order and Lot')
            return
          }
          if(!form.lotProductId) {
            alert('Please select a specific product from the lot')
            return
          }
          if(Number(form.saleRate) <= 0) {
            alert('Please enter a valid sale rate')
            return
          }
          if(plannedTotalKg <= 0) {
            alert('Please enter planned quantity (bags or loose kg)')
            return
          }
          if(plannedTotalKg > selectedLotProduct.currentTotalKg) {
            alert(`Planned quantity (${plannedTotalKg}kg) exceeds available quantity (${selectedLotProduct.currentTotalKg}kg)`)
            return
          }
          
          s.addPickItem(form)
          
          // Reset form
          setForm({
            salesOrderId:'',
            lotId:'',
            lotProductId:'',
            customerMark:'',
            plannedBags:0, 
            plannedLooseKg:0,
            saleRate:0, 
            packagingType:'Bag'
          })
          setSelectedLot(null)
          setSelectedLotProduct(null)
          setAvailableLotProducts([])
          
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
    const customer = s.customers.find(c=>c.id===o.customerId)?.name || '-'
    const items = s.pickListItems.filter(p=>p.salesOrderId===o.id)
    const saleValue = items.reduce((a,p)=> a + ((p.actual_total_kg||0) * (p.saleRate||0)), 0)
    const paid = s.salesPayments.filter(sp=>sp.salesOrderId===o.id).reduce((a,b)=>a+b.amount,0)
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
                {header:'Order ID', render:r=>r.id.slice(0,8)},
                {header:'Customer', key:'customer'},
                {header:'Order Date', key:'orderDate'},
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
  const customer = s.customers.find(c => c.id === order.customerId)
  const pickItems = s.pickListItems.filter(p => p.salesOrderId === order.id)
  const dispatches = s.dispatchConfirmations.filter(d => 
    pickItems.some(p => p.id === d.pickItemId)
  )
  
  // Calculate financial data
  const totalOrderValue = dispatches.reduce((sum, d) => {
    const pickItem = pickItems.find(p => p.id === d.pickItemId)
    return sum + (d.actual_total_kg * (pickItem?.saleRate || 0))
  }, 0)
  
  const orderPayments = s.salesPayments.filter(p => p.salesOrderId === order.id)
  const totalPaid = orderPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  
  const handleAddPayment = (paymentData) => {
    addSalesPayment({
      salesOrderId: order.id,
      amount: paymentData.amount,
      paymentDate: paymentData.paymentDate,
      method: paymentData.method,
      reference: paymentData.reference
    })
    setShowPaymentForm(false)
    alert('Payment recorded successfully')
  }
  
  return (
    <div>
      <div className="row" style={{ marginBottom: 16, alignItems: 'center' }}>
        <Button variant="secondary" onClick={onBack}>← Back to Sales Orders</Button>
        <h2 style={{ margin: 0 }}>Sales Order Details: {order.id.slice(0, 8)}</h2>
      </div>
      
      <div className="grid grid-2">
        {/* Order Information */}
        <div className="panel">
          <h3>Order Information</h3>
          <div className="details-grid">
            <div><strong>Order Date:</strong> {order.orderDate}</div>
            <div><strong>Customer:</strong> {customer?.name || '-'}</div>
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
              const lot = s.lots.find(l => l.id === r.lotId)
              return lot?.lotNumber || '-'
            }},
            {header:'Customer Mark', key:'customerMark'},
            {header:'Planned Kg', render: r => {
              const sippam = s.meta.sippamKgDefault || 30
              return (r.plannedBags * sippam + r.plannedLooseKg).toFixed(2)
            }},
            {header:'Actual Kg', render: r => r.actual_total_kg?.toFixed(2) || 'Not packed'},
            {header:'Sale Rate', render: r => `₹${Number(r.saleRate).toFixed(2)}/kg`},
            {header:'Planned Value', render: r => {
              const sippam = s.meta.sippamKgDefault || 30
              const plannedKg = r.plannedBags * sippam + r.plannedLooseKg
              return `₹${(plannedKg * r.saleRate).toFixed(2)}`
            }},
            {header:'Actual Value', render: r => {
              const actualKg = r.actual_total_kg || 0
              return actualKg > 0 ? `₹${(actualKg * r.saleRate).toFixed(2)}` : '-'
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
