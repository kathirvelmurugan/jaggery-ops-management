
import { useStore } from '../store/store'
import { Link } from 'react-router-dom'

export default function Dashboard(){
  const { 
    lots, lotItems, salesOrders, purchasePayments, salesPayments, 
    products, farmers, customers, initialized, loading 
  } = useStore()
  
  // Show loading state if data is not ready
  if (!initialized || loading) {
    return (
      <div className="dashboard">
        <div className="panel">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
            <h3>Loading Dashboard...</h3>
            <p style={{ color: 'var(--muted)', margin: 0 }}>Fetching your data...</p>
          </div>
        </div>
      </div>
    )
  }
  
  // Safely calculate metrics with fallbacks
  const safeArray = (arr) => Array.isArray(arr) ? arr : []
  const safeNumber = (num) => typeof num === 'number' ? num : 0
  
  const safeLotItems = safeArray(lotItems)
  const safeLots = safeArray(lots)
  const safeSalesOrders = safeArray(salesOrders)
  const safePurchasePayments = safeArray(purchasePayments)
  const safeSalesPayments = safeArray(salesPayments)
  const safeProducts = safeArray(products)
  const safeFarmers = safeArray(farmers)
  const safeCustomers = safeArray(customers)
  
  // Calculate total inventory from lotItems (enhanced schema)
  const totalInventory = safeLotItems.reduce((s,li)=> s + safeNumber(li.current_total_kg), 0)
  const totalInventoryValue = safeLotItems.reduce((s,li)=> {
    const kg = safeNumber(li.current_total_kg)
    const rate = safeNumber(li.purchase_rate_per_kg)
    return s + (kg * rate)
  }, 0)
  
  const totalLots = safeLots.length
  const activeLots = safeLots.filter(l => {
    return safeLotItems.some(li => li.lot_id === l.lot_id && safeNumber(li.current_total_kg) > 0)
  }).length
  const totalSO = safeSalesOrders.length
  
  // Calculate farmer dues using enhanced schema
  const farmerDues = safeLots.reduce((s,l)=> {
    const lotItemsForLot = safeLotItems.filter(li => li.lot_id === l.lot_id)
    const totalPurchaseValue = lotItemsForLot.reduce((sum, li) => sum + safeNumber(li.total_purchase_value), 0)
    const paid = safePurchasePayments
      .filter(p=>p.lot_id===l.lot_id)
      .reduce((a,b)=>a+safeNumber(b.amount_paid),0)
    return s + Math.max(0, totalPurchaseValue - paid)
  },0)
  
  // Product-wise inventory breakdown with enhanced schema
  const productInventory = safeProducts.map(product => {
    const productStock = safeLotItems
      .filter(li => li.product_id === product.product_id)
      .reduce((sum, li) => sum + safeNumber(li.current_total_kg), 0)
    return {
      name: product.product_name || 'Unknown Product',
      stock: productStock,
      id: product.product_id
    }
  }).filter(p => p.stock > 0)
  
  // Quick stats
  const quickStats = [
    { icon: '📦', label: 'Total Lots', value: totalLots, link: '/lots' },
    { icon: '🌾', label: 'Farmers', value: safeFarmers.length, link: '/master' },
    { icon: '🏢', label: 'Customers', value: safeCustomers.length, link: '/master' },
    { icon: '🛒', label: 'Sales Orders', value: totalSO, link: '/sales-orders' },
  ]

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <div className="panel welcome-panel">
        <div className="welcome-content">
          <div>
            <h2>🚀 Welcome to Jaggery OMS</h2>
            <p className="welcome-text">Manage your jaggery operations efficiently with real-time inventory tracking and financial management.</p>
          </div>
          <div className="quick-actions">
            <Link to="/lots" className="btn btn-primary">
              📦 Add New Lot
            </Link>
            <Link to="/sales-orders" className="btn btn-secondary">
              🛒 Create Sales Order
            </Link>
          </div>
        </div>
      </div>
      
      {/* Main KPIs */}
      <div className="grid grid-2">
        <div className="panel kpi-panel">
          <h3>📊 Inventory Overview</h3>
          <div className="grid grid-2">
            <div className="kpi inventory-kpi">
              <div className="num">{totalInventory.toFixed(1)} kg</div>
              <div className="label">Current Stock</div>
            </div>
            <div className="kpi inventory-kpi">
              <div className="num">₹{(totalInventoryValue/1000).toFixed(0)}K</div>
              <div className="label">Inventory Value</div>
            </div>
            <div className="kpi">
              <div className="num">{activeLots}/{totalLots}</div>
              <div className="label">Active Lots</div>
            </div>
            <div className="kpi">
              <div className="num">{productInventory.length}</div>
              <div className="label">Products in Stock</div>
            </div>
          </div>
        </div>
        
        <div className="panel kpi-panel">
          <h3>💰 Financial Overview</h3>
          <div className="grid grid-2">
            <div className="kpi financial-kpi">
              <div className="num">₹{(farmerDues/1000).toFixed(0)}K</div>
              <div className="label">Farmer Dues</div>
            </div>
            <div className="kpi financial-kpi">
              <div className="num">{safePurchasePayments.length}</div>
              <div className="label">Purchase Payments</div>
            </div>
            <div className="kpi">
              <div className="num">{safeSalesPayments.length}</div>
              <div className="label">Sales Payments</div>
            </div>
            <div className="kpi">
              <div className="num">₹{((totalInventoryValue + farmerDues)/1000).toFixed(0)}K</div>
              <div className="label">Total Business Value</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Product Stock Overview */}
      {productInventory.length > 0 && (
        <div className="panel">
          <h3>🍯 Product Stock Levels</h3>
          <div className="product-grid">
            {productInventory.map((product) => (
              <div key={product.id} className="product-card">
                <div className="product-icon">🍯</div>
                <div className="product-info">
                  <div className="product-name">{product.name}</div>
                  <div className="product-stock">{product.stock.toFixed(1)} kg</div>
                </div>
                <div className="product-status">
                  <span className={`badge ${product.stock > 100 ? 'good' : product.stock > 50 ? 'warn' : 'bad'}`}>
                    {product.stock > 100 ? 'Good' : product.stock > 50 ? 'Low' : 'Critical'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Quick Stats */}
      <div className="panel">
        <h3>📈 Quick Stats</h3>
        <div className="quick-stats">
          {quickStats.map((stat, index) => (
            <Link key={index} to={stat.link} className="stat-card">
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-content">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      {totalInventory === 0 && (
        <div className="panel empty-state">
          <div className="empty-content">
            <div className="empty-icon">📦</div>
            <h3>No Inventory Found</h3>
            <p>Start by adding your first lot to begin tracking inventory.</p>
            <Link to="/lots" className="btn btn-primary">
              ➕ Add First Lot
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
