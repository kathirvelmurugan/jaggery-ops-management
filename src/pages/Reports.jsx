
import { useStore } from '../store/store'
import { Table } from '../components/Table'

export default function Reports(){
  const s = useStore()
  
  // Accounts Payable - Updated to use totalPurchaseValue from new lot structure
  const apRows = s.lots.map(l => {
    const paid = s.purchasePayments.filter(p=>p.lotId===l.id).reduce((a,b)=>a+b.amount,0)
    const balance = (l.totalPurchaseValue||0) - paid
    return {
      farmer: s.farmers.find(f=>f.id===l.farmerId)?.name || '-',
      lot: l.lotNumber,
      purchaseDate: l.purchaseDate,
      total: l.totalPurchaseValue||0,
      paid, balance
    }
  })

  // Accounts Receivable - No changes needed, already working correctly
  const arRows = s.salesOrders.map(o => {
    const items = s.pickListItems.filter(p=>p.salesOrderId===o.id)
    const saleValue = items.reduce((a,p)=> a + ((p.actual_total_kg||0) * (p.saleRate||0)), 0)
    const paid = s.salesPayments.filter(sp=>sp.salesOrderId===o.id).reduce((a,b)=>a+b.amount,0)
    const balance = saleValue - paid
    return {
      customer: s.customers.find(c=>c.id===o.customerId)?.name || '-',
      order: o.id.slice(0,8),
      orderDate: o.orderDate,
      total: saleValue,
      paid, balance
    }
  })
  
  // NEW: Product-wise inventory report
  const inventoryRows = s.products.map(product => {
    const productLots = s.lotProducts.filter(lp => lp.productId === product.id)
    const totalStock = productLots.reduce((sum, lp) => sum + lp.currentTotalKg, 0)
    const totalValue = productLots.reduce((sum, lp) => sum + (lp.currentTotalKg * lp.purchaseRate), 0)
    const avgPurchaseRate = totalStock > 0 ? totalValue / totalStock : 0
    const lotsCount = productLots.filter(lp => lp.currentTotalKg > 0).length
    
    return {
      productName: product.name,
      totalStock: totalStock,
      totalValue: totalValue,
      avgPurchaseRate: avgPurchaseRate,
      lotsCount: lotsCount
    }
  }).filter(row => row.totalStock > 0) // Only show products with stock
  
  // NEW: Lot-wise detailed inventory
  const lotInventoryRows = s.lots.map(lot => {
    const farmer = s.farmers.find(f => f.id === lot.farmerId)
    const warehouse = s.warehouses.find(w => w.id === lot.warehouseId)
    const lotProducts = s.lotProducts.filter(lp => lp.lotId === lot.id && lp.currentTotalKg > 0)
    
    return lotProducts.map(lp => {
      const product = s.products.find(p => p.id === lp.productId)
      return {
        lotNumber: lot.lotNumber,
        farmer: farmer?.name || 'Unknown',
        warehouse: warehouse?.name || 'Unknown',
        productName: product?.name || 'Unknown Product',
        currentStock: lp.currentTotalKg,
        initialStock: lp.initialTotalKg,
        purchaseRate: lp.purchaseRate,
        currentValue: lp.currentTotalKg * lp.purchaseRate,
        purchaseDate: lot.purchaseDate
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
