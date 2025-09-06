
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
    purchaseDate: new Date().toISOString().slice(0,10),
    farmerId: '',
    lotNumber: '',
    warehouseId: '',
    bayNumber: '',
    initialAmountPaid: 0,
    initialPaymentMethod: 'Cash',
    initialPaymentRef: ''
  })
  const [products, setProducts] = useState([
    {
      id: Date.now(),
      productId: '',
      numBags: 0,
      looseKg: 0,
      purchaseRate: 0,
      sippamKg: s.meta.sippamKgDefault
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
      productId: '',
      numBags: 0,
      looseKg: 0,
      purchaseRate: 0,
      sippamKg: s.meta.sippamKgDefault
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
      const sippam = Number(product.sippamKg || s.meta.sippamKgDefault || 30)
      const productKg = Number(product.numBags || 0) * sippam + Number(product.looseKg || 0)
      const productValue = productKg * Number(product.purchaseRate || 0)
      totalKg += productKg
      totalValue += productValue
    })
    
    return { totalKg, totalValue }
  }
  
  const { totalKg, totalValue } = calculateTotals()

  const handleSubmit = () => {
    if(!form.farmerId || !form.warehouseId || !form.lotNumber){
      alert('Farmer, Warehouse, Lot Number are required')
      return
    }
    
    // Validate products
    const validProducts = products.filter(p => p.productId && (p.numBags > 0 || p.looseKg > 0))
    if(validProducts.length === 0) {
      alert('Please add at least one product with quantity')
      return
    }
    
    // Check for duplicate lot number
    const existingLot = lots.find(lot => lot.lotNumber.toLowerCase() === form.lotNumber.toLowerCase())
    if(existingLot){
      alert(`Lot number '${form.lotNumber}' already exists. Please use a unique lot number.`)
      return
    }
    
    // Prepare lot data
    const lotData = {
      ...form,
      products: validProducts
    }
    
    addLot(lotData)
    const state = useStore.getState()
    const newLot = state.lots[state.lots.length-1]
    
    if(Number(form.initialAmountPaid) > 0){
      addPurchasePayment({ 
        lotId: newLot.id, 
        amount: Number(form.initialAmountPaid), 
        paymentDate: form.purchaseDate,
        method: form.initialPaymentMethod, 
        reference: form.initialPaymentRef 
      })
    }
    
    // Reset form
    setForm({
      purchaseDate: new Date().toISOString().slice(0,10),
      farmerId: '',
      lotNumber: '',
      warehouseId: '',
      bayNumber: '',
      initialAmountPaid: 0,
      initialPaymentMethod: 'Cash',
      initialPaymentRef: ''
    })
    setProducts([{
      id: Date.now(),
      productId: '',
      numBags: 0,
      looseKg: 0,
      purchaseRate: 0,
      sippamKg: s.meta.sippamKgDefault
    }])
    setIsMultiProduct(false)
    
    alert('Lot added successfully')
  }

  return (
    <div className="grid">
      <div className="panel">
        <h2>Add New Lot</h2>
        
        {/* Basic Lot Information */}
        <div className="grid grid-4">
          <Field label="Purchase Date">
            <input type="date" value={form.purchaseDate} onChange={e=>handleChange('purchaseDate', e.target.value)} />
          </Field>
          <Field label="Farmer">
            <select value={form.farmerId} onChange={e=>handleChange('farmerId', e.target.value)}>
              <option value="">Select Farmer</option>
              {farmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
          <Field label="Lot Number">
            <input value={form.lotNumber} onChange={e=>handleChange('lotNumber', e.target.value)} placeholder="Unique lot number" />
          </Field>
          <Field label="Warehouse">
            <select value={form.warehouseId} onChange={e=>handleChange('warehouseId', e.target.value)}>
              <option value="">Select Warehouse</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
        </div>
        
        <div className="grid grid-2" style={{marginTop: 12}}>
          <Field label="Bay Number">
            <input value={form.bayNumber} onChange={e=>handleChange('bayNumber', e.target.value)} placeholder="Bay/Location" />
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
                    value={product.productId} 
                    onChange={e=>handleProductChange(index, 'productId', e.target.value)}
                  >
                    <option value="">Select Product</option>
                    {productList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="Bags (Sippam)">
                  <input 
                    type="number" 
                    value={product.numBags} 
                    onChange={e=>handleProductChange(index, 'numBags', e.target.value)} 
                  />
                </Field>
                <Field label="Loose Kg">
                  <input 
                    type="number" 
                    step="0.01"
                    value={product.looseKg} 
                    onChange={e=>handleProductChange(index, 'looseKg', e.target.value)} 
                  />
                </Field>
                <Field label="Rate per Kg (₹)">
                  <input 
                    type="number" 
                    step="0.01"
                    value={product.purchaseRate} 
                    onChange={e=>handleProductChange(index, 'purchaseRate', e.target.value)} 
                  />
                </Field>
                <Field label="Sippam Kg">
                  <input 
                    type="number" 
                    value={product.sippamKg} 
                    onChange={e=>handleProductChange(index, 'sippamKg', e.target.value)} 
                    placeholder={s.meta.sippamKgDefault}
                  />
                </Field>
              </div>
              
              {/* Product Calculation */}
              {product.productId && (
                <div className="product-calculation" style={{marginTop: 8, padding: 8, backgroundColor: '#f8f9fa', borderRadius: 4}}>
                  <div className="row">
                    <span>Total Kg: {((Number(product.numBags||0) * Number(product.sippamKg||s.meta.sippamKgDefault||30)) + Number(product.looseKg||0)).toFixed(2)}</span>
                    <span>Value: ₹{(((Number(product.numBags||0) * Number(product.sippamKg||s.meta.sippamKgDefault||30)) + Number(product.looseKg||0)) * Number(product.purchaseRate||0)).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Lot Totals */}
        <div className="lot-totals" style={{marginTop: 16, padding: 16, backgroundColor: '#e8f5e8', borderRadius: 8}}>
          <h4 style={{margin: '0 0 8px 0'}}>Lot Summary</h4>
          <div className="row">
            <div className="badge good">Total Kg: {totalKg.toFixed(2)}</div>
            <div className="badge good">Total Value: ₹{totalValue.toFixed(2)}</div>
            <div className="badge">Products: {products.filter(p => p.productId).length}</div>
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
              {header:'Lot #', key:'lotNumber'},
              {header:'Products', render:r=> {
                const lotProducts = s.lotProducts.filter(lp => lp.lotId === r.id)
                return lotProducts.map(lp => {
                  const product = s.products.find(p => p.id === lp.productId)
                  return product?.name
                }).filter(Boolean).join(', ') || 'No products'
              }},
              {header:'Farmer', render:r=> {
                const farmer = s.farmers.find(f=>f.id===r.farmerId)
                return farmer?.name || '-'
              }},
              {header:'Purchase Date', key:'purchaseDate'},
              {header:'Total Kg', render:r=> {
                const lotProducts = s.lotProducts.filter(lp => lp.lotId === r.id)
                const totalKg = lotProducts.reduce((sum, lp) => sum + lp.currentTotalKg, 0)
                return totalKg.toFixed(2)
              }},
              {header:'Total Purchase', render: r => `₹${Number(r.totalPurchaseValue || 0).toFixed(2)}`},
              {header:'Product Count', render:r=> {
                const lotProducts = s.lotProducts.filter(lp => lp.lotId === r.id)
                return lotProducts.length
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
  
  // Get lot products and payments
  const lotProducts = s.lotProducts.filter(lp => lp.lotId === lot.id)
  const lotPayments = s.purchasePayments.filter(p => p.lotId === lot.id)
  const totalPaid = lotPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const balance = (lot.totalPurchaseValue || 0) - totalPaid
  
  const farmer = farmers.find(f => f.id === lot.farmerId)
  const warehouse = warehouses.find(w => w.id === lot.warehouseId)
  
  const handleAddPayment = (paymentData) => {
    addPurchasePayment({
      lotId: lot.id,
      amount: paymentData.amount,
      paymentDate: paymentData.paymentDate,
      method: paymentData.method,
      reference: paymentData.reference
    })
    setShowPaymentForm(false)
    alert('Payment added successfully')
  }
  
  return (
    <div>
      <div className="row" style={{ marginBottom: 16, alignItems: 'center' }}>
        <Button variant="secondary" onClick={onBack}>← Back to Lots</Button>
        <h2 style={{ margin: 0 }}>Lot Details: {lot.lotNumber}</h2>
      </div>
      
      <div className="grid grid-2">
        {/* Lot Information */}
        <div className="panel">
          <h3>Lot Information</h3>
          <div className="details-grid">
            <div><strong>Purchase Date:</strong> {lot.purchaseDate}</div>
            <div><strong>Farmer:</strong> {farmer?.name || '-'}</div>
            <div><strong>Warehouse:</strong> {warehouse?.name || '-'}</div>
            <div><strong>Bay Number:</strong> {lot.bayNumber || '-'}</div>
            <div><strong>Product Count:</strong> {lotProducts.length}</div>
            <div><strong>Total Current Kg:</strong> {lotProducts.reduce((sum, lp) => sum + lp.currentTotalKg, 0).toFixed(2)}</div>
          </div>
        </div>
        
        {/* Financial Summary */}
        <PaymentSummary 
          totalValue={lot.totalPurchaseValue || 0}
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
            {header:'Product', render: lp => {
              const product = productList.find(p => p.id === lp.productId)
              return product?.name || 'Unknown Product'
            }},
            {header:'Bags', key:'numBags'},
            {header:'Loose Kg', render: lp => Number(lp.looseKg).toFixed(2)},
            {header:'Sippam Kg', key:'sippamKg'},
            {header:'Initial Total Kg', render: lp => Number(lp.initialTotalKg).toFixed(2)},
            {header:'Current Kg', render: lp => Number(lp.currentTotalKg).toFixed(2)},
            {header:'Rate/Kg', render: lp => `₹${Number(lp.purchaseRate).toFixed(2)}`},
            {header:'Product Value', render: lp => `₹${Number(lp.productValue).toFixed(2)}`},
            {header:'Status', render: lp => (
              <span className={`status-badge ${lp.currentTotalKg > 0 ? 'status-available' : 'status-sold'}`}>
                {lp.currentTotalKg > 0 ? 'Available' : 'Sold Out'}
              </span>
            )}
          ]}
          rows={lotProducts}
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
