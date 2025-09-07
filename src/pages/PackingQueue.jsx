
import { useStore } from '../store/store'
import { Field } from '../components/Field'
import { Button } from '../components/Button'
import { useState } from 'react'

export default function PackingQueue(){
  const s = useStore()
  
  // Safe data access with enhanced schema
  const picklistItems = s.picklistItems || []
  const lots = s.lots || []
  const lotItems = s.lotItems || []
  const products = s.products || []
  const customers = s.customers || []
  const salesOrders = s.salesOrders || []
  const warehouses = s.warehouses || []
  
  // Filter items to be packed
  const queue = picklistItems.filter(p => p.status === 'To Be Packed')
  const packedItems = picklistItems.filter(p => p.status === 'Packed')

  const [form, setForm] = useState({})

  const confirm = (picklistItemId) => {
    const vals = form[picklistItemId] || { actualBags:0, actualLooseKg:0 }
    const actualBags = Number(vals.actualBags||0)
    const actualLooseKg = Number(vals.actualLooseKg||0)
    
    if(actualBags === 0 && actualLooseKg === 0) {
      alert('Please enter actual packed quantity')
      return
    }
    
    // Use the store method to confirm packing
    if (s.confirmPack) {
      s.confirmPack({ pickItemId: picklistItemId, actualBags, actualLooseKg })
    } else {
      // Fallback update method
      s.updateItem('picklistItems', 'picklist_item_id', picklistItemId, {
        status: 'Packed',
        actual_bags: actualBags,
        actual_loose_kg: actualLooseKg,
        actual_total_kg: actualBags * 30 + actualLooseKg // Default sippam
      })
    }
    
    // Clear the form for this item
    const newForm = {...form}
    delete newForm[picklistItemId]
    setForm(newForm)
    
    alert('Packing confirmed successfully')
  }

  const getItemDetails = (item) => {
    // Enhanced schema mappings
    const lotItem = lotItems.find(li => li.lot_item_id === item.lot_item_id)
    const lot = lots.find(l => l.lot_id === lotItem?.lot_id)
    const product = products.find(p => p.product_id === lotItem?.product_id)
    const salesOrder = salesOrders.find(so => so.order_id === item.order_id)
    const customer = customers.find(c => c.customer_id === salesOrder?.customer_id)
    const warehouse = warehouses.find(w => w.warehouse_id === lotItem?.warehouse_id)
    
    const sippam = 30 // Default sippam weight
    const plannedTotalKg = (item.planned_bags || 0) * sippam + (item.planned_loose_kg || 0)
    const plannedValue = plannedTotalKg * (item.sale_rate_per_kg || 0)
    
    return { 
      lot, lotItem, product, salesOrder, customer, warehouse,
      plannedTotalKg, plannedValue, sippam 
    }
  }

  return (
    <div className="grid">
      <div className="panel">
        <h2>Packing Queue - Items to Pack ({queue.length})</h2>
        {queue.length===0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No items to pack</h3>
            <p>Items will appear here when sales orders are confirmed.</p>
          </div>
        ) : (
          <div className="queue-items">
            {queue.map(item => {
              const { 
                lot, lotItem, product, salesOrder, customer, warehouse,
                plannedTotalKg, plannedValue, sippam 
              } = getItemDetails(item)
              
              const formData = form[item.picklist_item_id] || { actualBags:0, actualLooseKg:0 }
              const actualTotalKg = Number(formData.actualBags||0) * sippam + Number(formData.actualLooseKg||0)
              const actualValue = actualTotalKg * (item.sale_rate_per_kg || 0)
              
              return (
                <div key={item.picklist_item_id} className="packing-item">
                  {/* Header */}
                  <div className="packing-header">
                    <div className="customer-info">
                      <h4>{customer?.company_name || customer?.contact_person_name || 'Unknown Customer'}</h4>
                      <span className="order-info">
                        Order: {salesOrder?.order_id?.slice(0,8)} | Date: {salesOrder?.order_date}
                      </span>
                    </div>
                    <span className="status-badge status-to-be-packed">{item.status}</span>
                  </div>
                  
                  {/* Lot and Product Details */}
                  <div className="grid grid-4 lot-details">
                    <div><strong>Lot:</strong> {lot?.lot_number || 'N/A'}</div>
                    <div><strong>Product:</strong> {product?.product_name || 'Unknown Product'}</div>
                    <div><strong>Available:</strong> {lotItem?.current_total_kg?.toFixed(2) || 0} kg</div>
                    <div><strong>Customer Mark:</strong> {item.customer_mark || '-'}</div>
                  </div>
                  <div className="grid grid-2 lot-details">
                    <div><strong>Packaging:</strong> {item.packaging_type || 'Bag'}</div>
                    <div><strong>Purchase Rate:</strong> ₹{lotItem?.purchase_rate_per_kg?.toFixed(2) || 0}/kg</div>
                  </div>
                  
                  {/* Planned vs Actual */}
                  <div className="grid grid-2 planned-actual">
                    <div className="planned-section">
                      <h5>Planned</h5>
                      <div className="details">
                        <div>Bags: {item.planned_bags || 0} × {sippam}kg = {((item.planned_bags || 0) * sippam).toFixed(2)}kg</div>
                        <div>Loose: {item.planned_loose_kg || 0}kg</div>
                        <div><strong>Total: {plannedTotalKg.toFixed(2)}kg</strong></div>
                        <div>Rate: ₹{item.sale_rate_per_kg || 0}/kg</div>
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
                            onChange={e=>setForm({...form, [item.picklist_item_id]: { ...formData, actualBags:e.target.value}})}
                            placeholder="0"
                          />
                        </Field>
                        <Field label="Actual Loose Kg">
                          <input 
                            type="number" 
                            step="0.01"
                            value={formData.actualLooseKg} 
                            onChange={e=>setForm({...form, [item.picklist_item_id]: { ...formData, actualLooseKg:e.target.value}})}
                            placeholder="0.00"
                          />
                        </Field>
                      </div>
                      
                      {actualTotalKg > 0 && (
                        <div className="actual-calculation">
                          <div>Total: {actualTotalKg.toFixed(2)}kg</div>
                          <div><strong>Actual Value: ₹{actualValue.toFixed(2)}</strong></div>
                          <div className={actualTotalKg !== plannedTotalKg ? 'variance negative' : 'variance positive'}>
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
                      onClick={()=>confirm(item.picklist_item_id)}
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
              const { lot, lotItem, product, salesOrder, customer } = getItemDetails(item)
              const actualValue = (item.actual_total_kg || 0) * (item.sale_rate_per_kg || 0)
              
              return (
                <div key={item.picklist_item_id} className="packed-item">
                  <div className="row">
                    <div>
                      <strong>{customer?.company_name || customer?.contact_person_name || 'Unknown'}</strong> | 
                      Lot: {lot?.lot_number} | 
                      Product: {product?.product_name || 'Unknown'} |
                      Packed: {item.actual_total_kg?.toFixed(2) || 0}kg | 
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
          padding: 60px 20px;
          color: var(--muted);
        }
        
        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }
        
        .empty-state h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: var(--text);
        }
        
        .empty-state p {
          margin: 0;
          font-size: 14px;
        }
        
        .packing-item {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          background: var(--panel);
          box-shadow: var(--shadow);
        }
        
        .packing-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }
        
        .customer-info h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          color: var(--text);
        }
        
        .order-info {
          font-size: 12px;
          color: var(--muted);
        }
        
        .lot-details {
          background: var(--nav-bg);
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 16px;
          font-size: 13px;
        }
        
        .lot-details strong {
          color: var(--text);
        }
        
        .planned-actual {
          margin-bottom: 16px;
        }
        
        .planned-section, .actual-section {
          padding: 16px;
          border-radius: 8px;
          background: var(--nav-bg);
        }
        
        .planned-section h5, .actual-section h5 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: var(--accent);
          font-weight: 600;
        }
        
        .details {
          font-size: 13px;
          line-height: 1.5;
        }
        
        .details div {
          margin-bottom: 4px;
        }
        
        .packing-inputs {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }
        
        .packing-inputs .field {
          flex: 1;
        }
        
        .actual-calculation {
          background: rgba(34, 211, 238, 0.1);
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          border: 1px solid rgba(34, 211, 238, 0.2);
        }
        
        .actual-calculation div {
          margin-bottom: 2px;
        }
        
        .variance {
          font-weight: 600;
        }
        
        .variance.positive {
          color: var(--good);
        }
        
        .variance.negative {
          color: var(--warning);
        }
        
        .packing-actions {
          text-align: center;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }
        
        .packed-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .packed-item {
          background: var(--nav-bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 12px;
        }
        
        .packed-item .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        
        .status-badge {
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .status-badge.status-to-be-packed {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
        
        .status-badge.status-packed {
          background: rgba(16, 185, 129, 0.1);
          color: var(--good);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        
        @media (max-width: 768px) {
          .packing-item {
            padding: 16px;
            margin: 16px 0;
          }
          
          .packing-header {
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
          }
          
          .grid.grid-4 {
            grid-template-columns: 1fr 1fr;
          }
          
          .grid.grid-2 {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .packing-inputs {
            flex-direction: column;
            gap: 8px;
          }
        }
        
        @media (max-width: 480px) {
          .grid.grid-4 {
            grid-template-columns: 1fr;
          }
          
          .lot-details {
            padding: 8px;
            font-size: 12px;
          }
        }
      `}</style>
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