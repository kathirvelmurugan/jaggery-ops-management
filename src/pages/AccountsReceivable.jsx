import { useStore } from '../store/store'
import { Table } from '../components/Table'
import { Field } from '../components/Field'
import { useState } from 'react'

export default function AccountsReceivable() {
  const s = useStore()
  const [filters, setFilters] = useState({
    customerId: '',
    dateFrom: '',
    dateTo: ''
  })

  // Calculate customer dues
  const customerDues = s.customers.map(customer => {
    // Get all sales orders for this customer
    const customerOrders = s.salesOrders.filter(order => {
      let matchesCustomer = order.customerId === customer.id
      let matchesDate = true
      
      if (filters.customerId && order.customerId !== filters.customerId) {
        matchesCustomer = false
      }
      
      if (filters.dateFrom && order.orderDate < filters.dateFrom) {
        matchesDate = false
      }
      
      if (filters.dateTo && order.orderDate > filters.dateTo) {
        matchesDate = false
      }
      
      return matchesCustomer && matchesDate
    })

    if (customerOrders.length === 0) return null

    // Calculate totals for this customer
    let totalOrderValue = 0
    let totalPaid = 0

    customerOrders.forEach(order => {
      // Calculate order value from dispatched items
      const pickItems = s.pickListItems.filter(p => p.salesOrderId === order.id)
      const dispatches = s.dispatchConfirmations.filter(d => 
        pickItems.some(p => p.id === d.pickItemId)
      )
      
      const orderValue = dispatches.reduce((sum, d) => {
        const pickItem = pickItems.find(p => p.id === d.pickItemId)
        return sum + (d.actual_total_kg * (pickItem?.saleRate || 0))
      }, 0)
      
      totalOrderValue += orderValue
      
      // Calculate payments for this order
      const orderPayments = s.salesPayments.filter(p => p.salesOrderId === order.id)
      const orderPaid = orderPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      totalPaid += orderPaid
    })
    
    const balanceDue = totalOrderValue - totalPaid
    
    // Only include customers with non-zero balance or if no customer filter is applied
    if (balanceDue === 0 && filters.customerId) return null

    return {
      customerId: customer.id,
      customerName: customer.name,
      ordersCount: customerOrders.length,
      totalOrderValue,
      totalPaid,
      balanceDue,
      orders: customerOrders
    }
  }).filter(Boolean)

  // Sort by balance due (highest first)
  customerDues.sort((a, b) => b.balanceDue - a.balanceDue)

  // Create detailed rows for order-wise breakdown
  const detailedRows = []
  customerDues.forEach(customer => {
    customer.orders.forEach((order, index) => {
      // Calculate order value
      const pickItems = s.pickListItems.filter(p => p.salesOrderId === order.id)
      const dispatches = s.dispatchConfirmations.filter(d => 
        pickItems.some(p => p.id === d.pickItemId)
      )
      
      const orderValue = dispatches.reduce((sum, d) => {
        const pickItem = pickItems.find(p => p.id === d.pickItemId)
        return sum + (d.actual_total_kg * (pickItem?.saleRate || 0))
      }, 0)
      
      const orderPayments = s.salesPayments.filter(p => p.salesOrderId === order.id)
      const orderPaid = orderPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const orderBalance = orderValue - orderPaid
      
      detailedRows.push({
        id: `${customer.customerId}-${order.id}`,
        customerName: index === 0 ? customer.customerName : '', // Show customer name only for first order
        orderIdShort: order.id.slice(0, 8),
        orderDate: order.orderDate,
        orderStatus: order.status,
        totalOrderValue: orderValue,
        totalPaid: orderPaid,
        balanceDue: orderBalance,
        isSubRow: index > 0
      })
    })
  })

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      customerId: '',
      dateFrom: '',
      dateTo: ''
    })
  }

  return (
    <div className="grid">
      {/* Filters */}
      <div className="panel">
        <h2>Accounts Receivable - Customer Dues</h2>
        <div className="grid grid-4">
          <Field label="Filter by Customer">
            <select 
              value={filters.customerId} 
              onChange={e => handleFilterChange('customerId', e.target.value)}
            >
              <option value="">All Customers</option>
              {s.customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="From Date">
            <input 
              type="date" 
              value={filters.dateFrom} 
              onChange={e => handleFilterChange('dateFrom', e.target.value)}
            />
          </Field>
          <Field label="To Date">
            <input 
              type="date" 
              value={filters.dateTo} 
              onChange={e => handleFilterChange('dateTo', e.target.value)}
            />
          </Field>
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button 
              className="btn secondary" 
              onClick={clearFilters}
              style={{ height: 'fit-content' }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-3">
        <div className="panel summary-card">
          <h3>Total Customers</h3>
          <div className="summary-value">{customerDues.length}</div>
        </div>
        <div className="panel summary-card">
          <h3>Total Sales Value</h3>
          <div className="summary-value">
            ₹{customerDues.reduce((sum, c) => sum + c.totalOrderValue, 0).toFixed(2)}
          </div>
        </div>
        <div className="panel summary-card">
          <h3>Total Outstanding</h3>
          <div className="summary-value outstanding">
            ₹{customerDues.reduce((sum, c) => sum + c.balanceDue, 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Customer Summary Table */}
      <div className="panel">
        <h3>Customer-wise Summary</h3>
        <Table
          columns={[
            { header: 'Customer Name', key: 'customerName' },
            { header: 'Orders Count', key: 'ordersCount' },
            { 
              header: 'Total Sales Value', 
              render: r => `₹${Number(r.totalOrderValue).toFixed(2)}` 
            },
            { 
              header: 'Total Received', 
              render: r => `₹${Number(r.totalPaid).toFixed(2)}` 
            },
            { 
              header: 'Balance Due', 
              render: r => (
                <span className={r.balanceDue > 0 ? 'balance-due' : 'balance-paid'}>
                  ₹{Number(r.balanceDue).toFixed(2)}
                </span>
              )
            }
          ]}
          rows={customerDues}
        />
      </div>

      {/* Detailed Order-wise Breakdown */}
      <div className="panel">
        <h3>Order-wise Breakdown</h3>
        <Table
          columns={[
            { header: 'Customer Name', key: 'customerName' },
            { header: 'Order ID', key: 'orderIdShort' },
            { header: 'Order Date', key: 'orderDate' },
            { header: 'Status', key: 'orderStatus' },
            { 
              header: 'Order Value', 
              render: r => `₹${Number(r.totalOrderValue).toFixed(2)}` 
            },
            { 
              header: 'Received', 
              render: r => `₹${Number(r.totalPaid).toFixed(2)}` 
            },
            { 
              header: 'Balance Due', 
              render: r => (
                <span className={r.balanceDue > 0 ? 'balance-due' : 'balance-paid'}>
                  ₹{Number(r.balanceDue).toFixed(2)}
                </span>
              )
            }
          ]}
          rows={detailedRows}
        />
      </div>

      <style jsx>{`
        .summary-card {
          text-align: center;
          padding: 20px;
        }
        
        .summary-card h3 {
          margin: 0 0 12px 0;
          color: #666;
          font-size: 14px;
          font-weight: 500;
        }
        
        .summary-value {
          font-size: 24px;
          font-weight: bold;
          color: #2196F3;
        }
        
        .summary-value.outstanding {
          color: #FF9800;
        }
        
        .balance-due {
          color: #FF9800;
          font-weight: bold;
        }
        
        .balance-paid {
          color: #4CAF50;
          font-weight: bold;
        }
      `}</style>
    </div>
  )
}