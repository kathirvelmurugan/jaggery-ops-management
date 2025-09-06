
import { useStore } from '../store/store'
import { Field } from '../components/Field'
import { Button } from '../components/Button'
import { useState } from 'react'

export default function PackingQueue(){
  const s = useStore()
  const queue = s.pickListItems.filter(p => p.status === 'To Be Packed')
  const packedItems = s.pickListItems.filter(p => p.status === 'Packed')

  const [form, setForm] = useState({})

  const confirm = (id) => {
    const vals = form[id] || { actualBags:0, actualLooseKg:0 }
    const actualBags = Number(vals.actualBags||0)
    const actualLooseKg = Number(vals.actualLooseKg||0)
    
    if(actualBags === 0 && actualLooseKg === 0) {
      alert('Please enter actual packed quantity')
      return
    }
    
    s.confirmPack({ pickItemId:id, actualBags, actualLooseKg })
    
    // Clear the form for this item
    const newForm = {...form}
    delete newForm[id]
    setForm(newForm)
    
    alert('Packing confirmed successfully')
  }

  const formatPackingDetails = (item) => {
    const lot = s.lots.find(l=>l.id===item.lotId)
    const lotProduct = s.lotProducts.find(lp => lp.id === item.lotProductId)
    const product = s.products.find(p => p.id === lotProduct?.productId)
    const sippam = lotProduct?.sippamKg || s.meta.sippamKgDefault || 30
    const plannedTotalKg = item.plannedBags * sippam + item.plannedLooseKg
    const plannedValue = plannedTotalKg * item.saleRate
    return { plannedTotalKg, plannedValue, sippam, lotProduct, product }
  }

  return (
    <div className="grid">
      <div className="panel">
        <h2>Packing Queue - Items to Pack ({queue.length})</h2>
        {queue.length===0 ? (
          <div className="empty-state">
            <p>No items to pack.</p>
            <small>Items will appear here when sales orders are confirmed.</small>
          </div>
        ) : (
          <div className="queue-items">
            {queue.map(item => {
              const lot = s.lots.find(l=>l.id===item.lotId)
              const so = s.salesOrders.find(o=>o.id===item.salesOrderId)
              const cust = s.customers.find(c=>c.id===so?.customerId)
              const { plannedTotalKg, plannedValue, sippam, lotProduct, product } = formatPackingDetails(item)
              const formData = form[item.id] || { actualBags:0, actualLooseKg:0 }
              const actualTotalKg = Number(formData.actualBags||0) * sippam + Number(formData.actualLooseKg||0)
              const actualValue = actualTotalKg * item.saleRate
              
              return (
                <div key={item.id} className="packing-item">
                  {/* Header */}
                  <div className="packing-header">
                    <div className="customer-info">
                      <h4>{cust?.name || 'Unknown Customer'}</h4>
                      <span className="order-info">Order: {so?.id.slice(0,8)} | Date: {so?.orderDate}</span>
                    </div>
                    <span className="status-badge status-to-be-packed">{item.status}</span>
                  </div>
                  
                  {/* Lot and Product Details */}
                  <div className="grid grid-4 lot-details">
                    <div><strong>Lot:</strong> {lot?.lotNumber || 'N/A'}</div>
                    <div><strong>Product:</strong> {product?.name || 'Unknown Product'}</div>
                    <div><strong>Available:</strong> {lotProduct?.currentTotalKg?.toFixed(2) || 0} kg</div>
                    <div><strong>Customer Mark:</strong> {item.customerMark || '-'}</div>
                  </div>
                  <div className="grid grid-2 lot-details">
                    <div><strong>Packaging:</strong> {item.packagingType}</div>
                    <div><strong>Purchase Rate:</strong> ₹{lotProduct?.purchaseRate || 0}/kg</div>
                  </div>
                  
                  {/* Planned vs Actual */}
                  <div className="grid grid-2 planned-actual">
                    <div className="planned-section">
                      <h5>Planned</h5>
                      <div className="details">
                        <div>Bags: {item.plannedBags} × {sippam}kg = {(item.plannedBags * sippam).toFixed(2)}kg</div>
                        <div>Loose: {item.plannedLooseKg}kg</div>
                        <div><strong>Total: {plannedTotalKg.toFixed(2)}kg</strong></div>
                        <div>Rate: ₹{item.saleRate}/kg</div>
                        <div><strong>Value: ₹{plannedValue.toFixed(2)}</strong></div>
                      </div>
                    </div>
                    
                    <div className="actual-section">
                      <h5>Actual Packing</h5>
                      <div className="row packing-inputs">
                        <Field label="Actual Bags">
                          <input 
                            type="number" 
                            value={formData.actualBags} 
                            onChange={e=>setForm({...form, [item.id]: { ...formData, actualBags:e.target.value}})}
                            placeholder="0"
                          />
                        </Field>
                        <Field label="Actual Loose Kg">
                          <input 
                            type="number" 
                            step="0.01"
                            value={formData.actualLooseKg} 
                            onChange={e=>setForm({...form, [item.id]: { ...formData, actualLooseKg:e.target.value}})}
                            placeholder="0.00"
                          />
                        </Field>
                      </div>
                      
                      {actualTotalKg > 0 && (
                        <div className="actual-calculation">
                          <div>Total: {actualTotalKg.toFixed(2)}kg</div>
                          <div><strong>Actual Value: ₹{actualValue.toFixed(2)}</strong></div>
                          <div className={actualTotalKg > plannedTotalKg ? 'variance negative' : actualTotalKg < plannedTotalKg ? 'variance negative' : 'variance positive'}>
                            Variance: {(actualTotalKg - plannedTotalKg).toFixed(2)}kg
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action */}
                  <div className="packing-actions">
                    <Button 
                      variant="primary" 
                      onClick={()=>confirm(item.id)}
                      disabled={actualTotalKg === 0}
                    >
                      Confirm Packing
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* Recently Packed Items */}
      {packedItems.length > 0 && (
        <div className="panel">
          <h3>Recently Packed Items ({packedItems.slice(-5).length})</h3>
          <div className="packed-items">
            {packedItems.slice(-5).reverse().map(item => {
              const lot = s.lots.find(l=>l.id===item.lotId)
              const lotProduct = s.lotProducts.find(lp => lp.id === item.lotProductId)
              const product = s.products.find(p => p.id === lotProduct?.productId)
              const so = s.salesOrders.find(o=>o.id===item.salesOrderId)
              const cust = s.customers.find(c=>c.id===so?.customerId)
              const actualValue = (item.actual_total_kg || 0) * item.saleRate
              
              return (
                <div key={item.id} className="packed-item">
                  <div className="row">
                    <div>
                      <strong>{cust?.name}</strong> | Lot: {lot?.lotNumber} | 
                      Product: {product?.name || 'Unknown'} |
                      Packed: {item.actual_total_kg?.toFixed(2)}kg | 
                      Value: ₹{actualValue.toFixed(2)}
                    </div>
                    <span className="status-badge status-packed">Packed</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      <style jsx>{`
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #666;
        }
        
        .packing-item {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          background: #fafafa;
        }
        
        .packing-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .customer-info h4 {
          margin: 0 0 4px 0;
          color: #333;
        }
        
        .order-info {
          font-size: 12px;
          color: #666;
        }
        
        .lot-details {
          margin: 12px 0;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .planned-actual {
          margin: 16px 0;
          gap: 16px;
        }
        
        .planned-section, .actual-section {
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .planned-section {
          background: #e8f5e8;
        }
        
        .actual-section {
          background: #fff3e0;
        }
        
        .planned-section h5, .actual-section h5 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #333;
        }
        
        .details {
          font-size: 13px;
          line-height: 1.4;
        }
        
        .packing-inputs {
          gap: 12px;
          margin-bottom: 12px;
        }
        
        .actual-calculation {
          font-size: 13px;
          padding: 8px;
          background: #f0f0f0;
          border-radius: 4px;
        }
        
        .variance.positive {
          color: #4CAF50;
        }
        
        .variance.negative {
          color: #FF9800;
        }
        
        .packing-actions {
          margin-top: 16px;
          text-align: right;
        }
        
        .packed-items {
          max-height: 300px;
          overflow-y: auto;
        }
        
        .packed-item {
          padding: 8px 12px;
          margin: 8px 0;
          background: #e8f5e8;
          border-radius: 4px;
          font-size: 13px;
        }
        
        .status-badge.status-to-be-packed {
          background: #fff3e0;
          color: #FF9800;
        }
        
        .status-badge.status-packed {
          background: #e8f5e8;
          color: #4CAF50;
        }
      `}</style>
    </div>
  )
}