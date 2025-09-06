
import { useStore } from '../store/store'
import { Table } from '../components/Table'

export default function Reports(){
  const s = useStore()
  
  // Accounts Payable - Updated for enhanced schema
  const apRows = s.lots.map(l => {
    const lotItems = s.lotItems.filter(li => li.lot_id === l.lot_id)
    const totalPurchaseValue = lotItems.reduce((sum, li) => sum + li.total_purchase_value, 0)
    const paid = s.purchasePayments.filter(p=>p.lot_id===l.lot_id).reduce((a,b)=>a+b.amount_paid,0)
    const balance = totalPurchaseValue - paid
    return {
      farmer: s.farmers.find(f=>f.farmer_id===l.farmer_id)?.auction_name || '-',
      lot: l.lot_number,
      purchaseDate: l.purchase_date,
      total: totalPurchaseValue,
      paid, balance
    }
  })

  // Accounts Receivable - Updated for enhanced schema
  const arRows = s.salesOrders.map(o => {
    const items = s.picklistItems.filter(p=>p.order_id===o.order_id)
    const saleValue = items.reduce((a,p)=> a + ((p.actual_total_kg||0) * (p.sale_rate_per_kg||0)), 0)
    const paid = s.salesPayments.filter(sp=>sp.order_id===o.order_id).reduce((a,b)=>a+b.amount_paid,0)
    const balance = saleValue - paid
    return {
      customer: s.customers.find(c=>c.customer_id===o.customer_id)?.company_name || '-',
      order: o.order_id.slice(0,8),
      orderDate: o.order_date,
      total: saleValue,
      paid, balance
    }
  })
  
  // Product-wise inventory report - Updated for enhanced schema
  const inventoryRows = s.products.map(product => {
    const productLotItems = s.lotItems.filter(li => li.product_id === product.product_id)
    const totalStock = productLotItems.reduce((sum, li) => sum + li.current_total_kg, 0)
    const totalValue = productLotItems.reduce((sum, li) => sum + (li.current_total_kg * li.purchase_rate_per_kg), 0)
    const avgPurchaseRate = totalStock > 0 ? totalValue / totalStock : 0
    const lotsCount = productLotItems.filter(li => li.current_total_kg > 0).length
    
    return {
      productName: product.product_name,
      totalStock: totalStock,
      totalValue: totalValue,
      avgPurchaseRate: avgPurchaseRate,
      lotsCount: lotsCount
    }
  }).filter(row => row.totalStock > 0) // Only show products with stock
  
  // Lot-wise detailed inventory - Updated for enhanced schema
  const lotInventoryRows = s.lots.map(lot => {
    const farmer = s.farmers.find(f => f.farmer_id === lot.farmer_id)
    const lotItems = s.lotItems.filter(li => li.lot_id === lot.lot_id && li.current_total_kg > 0)
    
    return lotItems.map(li => {
      const product = s.products.find(p => p.product_id === li.product_id)
      const warehouse = s.warehouses.find(w => w.warehouse_id === li.warehouse_id)
      return {
        lotNumber: lot.lot_number,
        farmer: farmer?.auction_name || 'Unknown',
        warehouse: warehouse?.warehouse_name || 'Unknown',
        productName: product?.product_name || 'Unknown Product',
        currentStock: li.current_total_kg,
        initialStock: li.initial_total_kg,
        purchaseRate: li.purchase_rate_per_kg,
        currentValue: li.current_total_kg * li.purchase_rate_per_kg,
        purchaseDate: lot.purchase_date,
        bayNumber: li.bay_number || '-'
      }
    })
  }).flat().filter(row => row.currentStock > 0)

  return (
    <div className="grid">
      {/* Product-wise Inventory Summary */}
      <div className="panel">
        <h2>Inventory Summary by Product</h2>
        <Table columns={[
          {header:'Product', key:'productName'},
          {header:'Total Stock (kg)', render:r=>`${r.totalStock.toFixed(2)} kg`},
          {header:'Avg Purchase Rate', render:r=>`₹${r.avgPurchaseRate.toFixed(2)}/kg`},
          {header:'Total Value', render:r=>`₹${r.totalValue.toFixed(2)}`},
          {header:'Active Lots', key:'lotsCount'},
        ]} rows={inventoryRows} />
      </div>
      
      {/* Detailed Lot-wise Inventory */}
      <div className="panel">
        <h2>Detailed Inventory by Lot & Product</h2>
        <Table columns={[
          {header:'Lot #', key:'lotNumber'},
          {header:'Farmer', key:'farmer'},
          {header:'Product', key:'productName'},
          {header:'Current Stock', render:r=>`${r.currentStock.toFixed(2)} kg`},
          {header:'Purchase Rate', render:r=>`₹${r.purchaseRate.toFixed(2)}/kg`},
          {header:'Current Value', render:r=>`₹${r.currentValue.toFixed(2)}`},
          {header:'Warehouse', key:'warehouse'},
          {header:'Bay #', key:'bayNumber'},
          {header:'Purchase Date', key:'purchaseDate'},
        ]} rows={lotInventoryRows} />
      </div>
    
      {/* Accounts Payable */}
      <div className="panel">
        <h2>Accounts Payable (Farmer Dues)</h2>
        <Table columns={[
          {header:'Farmer', key:'farmer'},
          {header:'Lot #', key:'lot'},
          {header:'Purchase Date', key:'purchaseDate'},
          {header:'Total Purchase', render:r=>`₹ ${r.total.toFixed(2)}`},
          {header:'Paid', render:r=>`₹ ${r.paid.toFixed(2)}`},
          {header:'Balance', render:r=>`₹ ${r.balance.toFixed(2)}`},
        ]} rows={apRows} />
      </div>

      {/* Accounts Receivable */}
      <div className="panel">
        <h2>Accounts Receivable (Customer Dues)</h2>
        <Table columns={[
          {header:'Customer', key:'customer'},
          {header:'Order', key:'order'},
          {header:'Order Date', key:'orderDate'},
          {header:'Total Sale', render:r=>`₹ ${r.total.toFixed(2)}`},
          {header:'Paid', render:r=>`₹ ${r.paid.toFixed(2)}`},
          {header:'Balance', render:r=>`₹ ${r.balance.toFixed(2)}`},
        ]} rows={arRows} />
      </div>
    </div>
  )
}
