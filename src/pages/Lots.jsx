
import { useStore } from '../store/store'
import { Field } from '../components/Field'
import { Table } from '../components/Table'
import { Button } from '../components/Button'
import { PaymentForm } from '../components/PaymentForm'
import { PaymentHistory } from '../components/PaymentHistory'
import { PaymentSummary } from '../components/PaymentSummary'
import { useState } from 'react'

export default function Lots(){
  const s = useStore()
  const addLot = s.addLot
  const addPurchasePayment = s.addPurchasePayment
  const [selectedLot, setSelectedLot] = useState(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [isMultiProduct, setIsMultiProduct] = useState(false)
  const [form, setForm] = useState({
    purchase_date: new Date().toISOString().slice(0,10),
    farmer_id: '',
    lot_number: '',
    warehouse_id: '',
    bay_number: '',
    initialAmountPaid: 0,
    initialPaymentMethod: 'Cash',
    initialPaymentRef: ''
  })
  const [products, setProducts] = useState([
    {
      id: Date.now(),
      product_id: '',
      initial_bags: 0,
      initial_loose_kg: 0,
      purchase_rate_per_kg: 0,
      warehouse_id: '',
      bay_number: ''
    }
  ])

  const farmers = s.farmers
  const productList = s.products
  const warehouses = s.warehouses
  const lots = s.lots

  const handleChange = (k, v) => setForm(f => ({...f, [k]: v}))
  
  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...products]
    updatedProducts[index] = { ...updatedProducts[index], [field]: value }
    setProducts(updatedProducts)
  }
  
  const addProduct = () => {
    setProducts([...products, {
      id: Date.now(),
      product_id: '',
      initial_bags: 0,
      initial_loose_kg: 0,
      purchase_rate_per_kg: 0,
      warehouse_id: form.warehouse_id || '',
      bay_number: form.bay_number || ''
    }])
  }
  
  const removeProduct = (index) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index))
    }
  }
  
  // Calculate totals
  const calculateTotals = () => {
    let totalKg = 0
    let totalValue = 0
    
    products.forEach(product => {
      const sippam = 30 // Default sippam weight
      const productKg = Number(product.initial_bags || 0) * sippam + Number(product.initial_loose_kg || 0)
      const productValue = productKg * Number(product.purchase_rate_per_kg || 0)
      totalKg += productKg
      totalValue += productValue
    })
    
    return { totalKg, totalValue }
  }
  
  const { totalKg, totalValue } = calculateTotals()

  const handleSubmit = async () => {
    if(!form.farmer_id || !form.lot_number){
      alert('Farmer and Lot Number are required')
      return
    }
    
    // Validate products
    const validProducts = products.filter(p => p.product_id && (p.initial_bags > 0 || p.initial_loose_kg > 0))
    if(validProducts.length === 0) {
      alert('Please add at least one product with quantity')
      return
    }
    
    try {
      // Prepare lot data for enhanced schema
      const lotData = {
        lot_number: form.lot_number,
        farmer_id: form.farmer_id,
        purchase_date: form.purchase_date,
        lotItems: validProducts.map(product => ({
          product_id: product.product_id,
          warehouse_id: product.warehouse_id || form.warehouse_id,
          bay_number: product.bay_number || form.bay_number,
          initial_bags: Number(product.initial_bags || 0),
          initial_loose_kg: Number(product.initial_loose_kg || 0),
          purchase_rate_per_kg: Number(product.purchase_rate_per_kg || 0)
        }))
      }
      
      const newLot = await addLot(lotData)
      
      if(Number(form.initialAmountPaid) > 0){
        await addPurchasePayment({ 
          lot_id: newLot.lot_id, 
          amount_paid: Number(form.initialAmountPaid), 
          payment_date: form.purchase_date,
          payment_method: form.initialPaymentMethod, 
          reference_details: form.initialPaymentRef 
        })
      }
      
      // Reset form
      setForm({
        purchase_date: new Date().toISOString().slice(0,10),
        farmer_id: '',
        lot_number: '',
        warehouse_id: '',
        bay_number: '',
        initialAmountPaid: 0,
        initialPaymentMethod: 'Cash',
        initialPaymentRef: ''
      })
      setProducts([{
        id: Date.now(),
        product_id: '',
        initial_bags: 0,
        initial_loose_kg: 0,
        purchase_rate_per_kg: 0,
        warehouse_id: '',
        bay_number: ''
      }])
      setIsMultiProduct(false)
      
      alert('Lot added successfully')
      
    } catch (error) {
      console.error('Error adding lot:', error)
      alert('Error adding lot: ' + (error.message || 'Unknown error'))
    }
  }

  return (
    <div className="grid">
      <div className="panel">
        <h2>Add New Lot</h2>
        
        {/* Basic Lot Information */}
        <div className="grid grid-4">
          <Field label="Purchase Date">
            <input type="date" value={form.purchase_date} onChange={e=>handleChange('purchase_date', e.target.value)} />
          </Field>
          <Field label="Farmer">
            <select value={form.farmer_id} onChange={e=>handleChange('farmer_id', e.target.value)}>
              <option value="">Select Farmer</option>
              {farmers.map(f => <option key={f.farmer_id} value={f.farmer_id}>{f.auction_name}</option>)}
            </select>
          </Field>
          <Field label="Lot Number">
            <input value={form.lot_number} onChange={e=>handleChange('lot_number', e.target.value)} placeholder="Unique lot number" />
          </Field>
          <Field label="Warehouse">
            <select value={form.warehouse_id} onChange={e=>handleChange('warehouse_id', e.target.value)}>
              <option value="">Select Warehouse</option>
              {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
            </select>
          </Field>
        </div>
        
        <div className="grid grid-2" style={{marginTop: 12}}>
          <Field label="Bay Number">
            <input value={form.bay_number} onChange={e=>handleChange('bay_number', e.target.value)} placeholder="Bay/Location" />
          </Field>
          <Field label="Lot Type">
            <select value={isMultiProduct ? 'multi' : 'single'} onChange={e => {
              const isMulti = e.target.value === 'multi'
              setIsMultiProduct(isMulti)
              if (!isMulti && products.length > 1) {
                setProducts([products[0]])
              }
            }}>
              <option value="single">Single Product Lot</option>
              <option value="multi">Multi-Product Lot</option>
            </select>
          </Field>
        </div>
        
        {/* Products Section */}
        <div style={{marginTop: 16}}>
          <div className="row" style={{justifyContent: 'space-between', alignItems: 'center'}}>
            <h3>Products in this Lot</h3>
            {isMultiProduct && (
              <Button variant="secondary" onClick={addProduct}>+ Add Product</Button>
            )}
          </div>
          
          {products.map((product, index) => (
            <div key={product.id} className="product-entry" style={{marginBottom: 16, padding: 16, border: '1px solid #e0e0e0', borderRadius: 8}}>
              <div className="row" style={{justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                <h4 style={{margin: 0}}>Product {index + 1}</h4>
                {isMultiProduct && products.length > 1 && (
                  <Button variant="secondary" onClick={() => removeProduct(index)}>Remove</Button>
                )}
              </div>
              
              <div className="grid grid-5">
                <Field label="Product Type">
                  <select 
                    value={product.product_id} 
                    onChange={e=>handleProductChange(index, 'product_id', e.target.value)}
                  >
                    <option value="">Select Product</option>
                    {productList.map(p => <option key={p.product_id} value={p.product_id}>{p.product_name}</option>)}
                  </select>
                </Field>
                <Field label="Bags (Sippam)">
                  <input 
                    type="number" 
                    value={product.initial_bags} 
                    onChange={e=>handleProductChange(index, 'initial_bags', e.target.value)} 
                  />
                </Field>
                <Field label="Loose Kg">
                  <input 
                    type="number" 
                    step="0.001"
                    value={product.initial_loose_kg} 
                    onChange={e=>handleProductChange(index, 'initial_loose_kg', e.target.value)} 
                  />
                </Field>
                <Field label="Rate per Kg (₹)">
                  <input 
                    type="number" 
                    step="0.01"
                    value={product.purchase_rate_per_kg} 
                    onChange={e=>handleProductChange(index, 'purchase_rate_per_kg', e.target.value)} 
                  />
                </Field>
                <Field label="Warehouse">
                  <select 
                    value={product.warehouse_id} 
                    onChange={e=>handleProductChange(index, 'warehouse_id', e.target.value)}
                  >
                    <option value="">Use Default</option>
                    {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
                  </select>
                </Field>
              </div>
              
              {/* Product Calculation */}
              {product.product_id && (
                <div className="product-calculation">
                  <div className="row">
                    <span>Total Kg: {((Number(product.initial_bags||0) * 30) + Number(product.initial_loose_kg||0)).toFixed(3)}</span>
                    <span>Value: ₹{(((Number(product.initial_bags||0) * 30) + Number(product.initial_loose_kg||0)) * Number(product.purchase_rate_per_kg||0)).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Lot Totals */}
        <div className="lot-totals">
          <h4>Lot Summary</h4>
          <div className="row">
            <div className="badge good">Total Kg: {totalKg.toFixed(2)}</div>
            <div className="badge good">Total Value: ₹{totalValue.toFixed(2)}</div>
            <div className="badge good">Products: {products.filter(p => p.product_id).length}</div>
          </div>
        </div>

        {/* Initial Payment Section */}
        <h3 style={{marginTop:16}}>Initial Payment (optional)</h3>
        <div className="grid grid-3">
          <Field label="Amount Paid">
            <input 
              type="number" 
              step="0.01"
              value={form.initialAmountPaid} 
              onChange={e=>handleChange('initialAmountPaid', e.target.value)} 
            />
          </Field>
          <Field label="Payment Method">
            <select value={form.initialPaymentMethod} onChange={e=>handleChange('initialPaymentMethod', e.target.value)}>
              <option>Cash</option>
              <option>RTGS</option>
            </select>
          </Field>
          <Field label="Reference/Notes">
            <input 
              value={form.initialPaymentRef} 
              onChange={e=>handleChange('initialPaymentRef', e.target.value)} 
            />
          </Field>
        </div>

        <div className="row" style={{marginTop:12}}>
          <Button variant="primary" onClick={handleSubmit}>
            Save Lot
          </Button>
        </div>
      </div>

      {!selectedLot ? (
        <div className="panel">
          <h2>Inventory</h2>
          <Table
            columns={[
              {header:'Lot #', key:'lot_number'},
              {header:'Products', render:r=> {
                const lotItems = s.lotItems.filter(li => li.lot_id === r.lot_id)
                return lotItems.map(li => {
                  const product = s.products.find(p => p.product_id === li.product_id)
                  return product?.product_name
                }).filter(Boolean).join(', ') || 'No products'
              }},
              {header:'Farmer', render:r=> {
                const farmer = s.farmers.find(f=>f.farmer_id===r.farmer_id)
                return farmer?.auction_name || '-'
              }},
              {header:'Purchase Date', key:'purchase_date'},
              {header:'Total Kg', render:r=> {
                const lotItems = s.lotItems.filter(li => li.lot_id === r.lot_id)
                const totalKg = lotItems.reduce((sum, li) => sum + li.current_total_kg, 0)
                return totalKg.toFixed(2)
              }},
              {header:'Total Purchase', render: r => {
                const lotItems = s.lotItems.filter(li => li.lot_id === r.lot_id)
                const totalValue = lotItems.reduce((sum, li) => sum + li.total_purchase_value, 0)
                return `₹${Number(totalValue || 0).toFixed(2)}`
              }},
              {header:'Product Count', render:r=> {
                const lotItems = s.lotItems.filter(li => li.lot_id === r.lot_id)
                return lotItems.length
              }},
              {header:'Actions', render: r => (
                <Button variant="secondary" onClick={() => setSelectedLot(r)}>View Details</Button>
              )}
            ]}
            rows={lots}
          />
        </div>
      ) : (
        <LotDetailsView 
          lot={selectedLot} 
          onBack={() => setSelectedLot(null)} 
          showPaymentForm={showPaymentForm}
          setShowPaymentForm={setShowPaymentForm}
        />
      )}
    </div>
  )
}

function LotDetailsView({ lot, onBack, showPaymentForm, setShowPaymentForm }) {
  const s = useStore()
  const addPurchasePayment = s.addPurchasePayment
  const farmers = s.farmers
  const productList = s.products
  const warehouses = s.warehouses
  
  // Get lot items and payments
  const lotItems = s.lotItems.filter(li => li.lot_id === lot.lot_id)
  const lotPayments = s.purchasePayments.filter(p => p.lot_id === lot.lot_id)
  const totalPaid = lotPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
  
  // Calculate total value from lot items
  const totalPurchaseValue = lotItems.reduce((sum, li) => sum + li.total_purchase_value, 0)
  const balance = totalPurchaseValue - totalPaid
  
  const farmer = farmers.find(f => f.farmer_id === lot.farmer_id)
  const warehouse = warehouses.find(w => w.warehouse_id === lot.warehouse_id)
  
  const handleAddPayment = (paymentData) => {
    addPurchasePayment({
      lot_id: lot.lot_id,
      amount_paid: paymentData.amount,
      payment_date: paymentData.paymentDate,
      payment_method: paymentData.method,
      reference_details: paymentData.reference
    })
    setShowPaymentForm(false)
    alert('Payment added successfully')
  }
  
  return (
    <div>
      <div className="row" style={{ marginBottom: 16, alignItems: 'center' }}>
        <Button variant="secondary" onClick={onBack}>← Back to Lots</Button>
        <h2 style={{ margin: 0 }}>Lot Details: {lot.lot_number}</h2>
      </div>
      
      <div className="grid grid-2">
        {/* Lot Information */}
        <div className="panel">
          <h3>Lot Information</h3>
          <div className="details-grid">
            <div><strong>Purchase Date:</strong> {lot.purchase_date}</div>
            <div><strong>Farmer:</strong> {farmer?.auction_name || '-'}</div>
            <div><strong>Warehouse:</strong> {warehouse?.warehouse_name || '-'}</div>
            <div><strong>Bay Number:</strong> {lot.bay_number || '-'}</div>
            <div><strong>Product Count:</strong> {lotItems.length}</div>
            <div><strong>Total Current Kg:</strong> {lotItems.reduce((sum, li) => sum + li.current_total_kg, 0).toFixed(2)}</div>
          </div>
        </div>
        
        {/* Financial Summary */}
        <PaymentSummary 
          totalValue={totalPurchaseValue || 0}
          totalPaid={totalPaid}
          payments={lotPayments}
          title="Purchase Financial Summary"
          valueLabel="Total Purchase Value"
          paidLabel="Amount Paid"
          balanceLabel="Balance to Pay"
        />
      </div>
      
      {/* Product Details */}
      <div className="panel">
        <h3>Products in this Lot</h3>
        <Table
          columns={[
            {header:'Product', render: li => {
              const product = productList.find(p => p.product_id === li.product_id)
              return product?.product_name || 'Unknown Product'
            }},
            {header:'Warehouse', render: li => {
              const warehouse = warehouses.find(w => w.warehouse_id === li.warehouse_id)
              return warehouse?.warehouse_name || '-'
            }},
            {header:'Bay Number', key:'bay_number'},
            {header:'Bags', key:'initial_bags'},
            {header:'Loose Kg', render: li => Number(li.initial_loose_kg).toFixed(2)},
            {header:'Initial Total Kg', render: li => Number(li.initial_total_kg).toFixed(2)},
            {header:'Current Kg', render: li => Number(li.current_total_kg).toFixed(2)},
            {header:'Rate/Kg', render: li => `₹${Number(li.purchase_rate_per_kg).toFixed(2)}`},
            {header:'Product Value', render: li => `₹${Number(li.total_purchase_value).toFixed(2)}`},
            {header:'Status', render: li => (
              <span className={`status-badge ${li.current_total_kg > 0 ? 'status-available' : 'status-sold'}`}>
                {li.current_total_kg > 0 ? 'Available' : 'Sold Out'}
              </span>
            )}
          ]}
          rows={lotItems}
        />
      </div>
      
      {/* Payment Management */}
      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <Button 
          variant="primary" 
          onClick={() => setShowPaymentForm(!showPaymentForm)}
        >
          {showPaymentForm ? 'Cancel' : 'Add Payment'}
        </Button>
      </div>
      
      {showPaymentForm && (
        <PaymentForm 
          title="Add Purchase Payment"
          onSubmit={handleAddPayment}
          onCancel={() => setShowPaymentForm(false)}
        />
      )}
      
      {/* Payment History */}
      <PaymentHistory 
        payments={lotPayments}
        title="Purchase Payment History"
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
        
        .status-badge.status-available {
          background: #e8f5e8;
          color: #4CAF50;
        }
        
        .status-badge.status-sold {
          background: #ffebee;
          color: #f44336;
        }
      `}</style>
    </div>
  )
}
