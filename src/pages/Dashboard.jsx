
import { useStore } from '../store/store'

export default function Dashboard(){
  const { lots, lotProducts, salesOrders, purchasePayments, salesPayments, products } = useStore()
  
  // Calculate total inventory from lotProducts (more accurate for multi-product lots)
  const totalInventory = lotProducts.reduce((s,lp)=> s + (lp.currentTotalKg||0), 0)
  const totalInventoryValue = lotProducts.reduce((s,lp)=> s + ((lp.currentTotalKg||0) * (lp.purchaseRate||0)), 0)
  
  const totalLots = lots.length
  const activeLots = lots.filter(l => lotProducts.some(lp => lp.lotId === l.id && lp.currentTotalKg > 0)).length
  const totalSO = salesOrders.length
  
  // Calculate farmer dues using totalPurchaseValue
  const farmerDues = lots.reduce((s,l)=> s + ((l.totalPurchaseValue||0) - purchasePayments.filter(p=>p.lotId===l.id).reduce((a,b)=>a+b.amount,0)),0)
  
  // Customer dues calculation remains the same
  const customerDues = salesOrders.reduce((s,o)=> {
    const items = useStore.getState().pickListItems.filter(p=>p.salesOrderId===o.id)
    const saleValue = items.reduce((a,p)=> a + ((p.actual_total_kg||0) * (p.saleRate||0)), 0)
    const paid = salesPayments.filter(sp=>sp.salesOrderId===o.id).reduce((a,b)=>a+b.amount,0)
    return s + (saleValue - paid)
  },0)
  
  // Product-wise inventory breakdown
  const productInventory = products.map(product => {
    const productStock = lotProducts
      .filter(lp => lp.productId === product.id)
      .reduce((sum, lp) => sum + lp.currentTotalKg, 0)
    return {
      name: product.name,
      stock: productStock
    }
  }).filter(p => p.stock > 0)

  return (
    <div className="grid">
      {/* Main KPIs */}
      <div className="grid grid-4">
        <div className="kpi"><div className="num">{totalInventory.toFixed(2)} kg</div><div className="label">Current Inventory</div></div>
        <div className="kpi"><div className="num">₹ {totalInventoryValue.toFixed(0)}</div><div className="label">Inventory Value</div></div>
        <div className="kpi"><div className="num">{activeLots} / {totalLots}</div><div className="label">Active Lots</div></div>
        <div className="kpi"><div className="num">{totalSO}</div><div className="label">Sales Orders</div></div>
        <div className="kpi"><div className="num">₹ {farmerDues.toFixed(0)}</div><div className="label">Farmer Dues (A/P)</div></div>
        <div className="kpi"><div className="num">₹ {customerDues.toFixed(0)}</div><div className="label">Customer Dues (A/R)</div></div>
      </div>
      
      {/* Product-wise Inventory Breakdown */}
      {productInventory.length > 0 && (
        <div className="panel">
          <h3>Current Stock by Product</h3>
          <div className="grid grid-4">
            {productInventory.map((product, index) => (
              <div key={index} className="kpi" style={{background: '#1a1a2e', border: '1px solid #334155'}}>
                <div className="num">{product.stock.toFixed(2)} kg</div>
                <div className="label">{product.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
