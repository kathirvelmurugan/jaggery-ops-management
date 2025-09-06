import { useStore } from '../store/store'
import { Table } from '../components/Table'
import { Field } from '../components/Field'
import { useState } from 'react'

export default function AccountsPayable() {
  const s = useStore()
  const [filters, setFilters] = useState({
    farmerId: '',
    dateFrom: '',
    dateTo: ''
  })

  // Calculate farmer dues
  const farmerDues = s.farmers.map(farmer => {
    // Get all lots for this farmer
    const farmerLots = s.lots.filter(lot => {
      let matchesFarmer = lot.farmerId === farmer.id
      let matchesDate = true
      
      if (filters.farmerId && lot.farmerId !== filters.farmerId) {
        matchesFarmer = false
      }
      
      if (filters.dateFrom && lot.purchaseDate < filters.dateFrom) {
        matchesDate = false
      }
      
      if (filters.dateTo && lot.purchaseDate > filters.dateTo) {
        matchesDate = false
      }
      
      return matchesFarmer && matchesDate
    })

    if (farmerLots.length === 0) return null

    // Calculate totals for this farmer
    const totalPurchaseValue = farmerLots.reduce((sum, lot) => sum + lot.total_purchase_value, 0)
    
    const totalPaid = farmerLots.reduce((sum, lot) => {
      const lotPayments = s.purchasePayments.filter(p => p.lotId === lot.id)
      return sum + lotPayments.reduce((pSum, payment) => pSum + Number(payment.amount), 0)
    }, 0)
    
    const balanceDue = totalPurchaseValue - totalPaid
    
    // Only include farmers with non-zero balance or if no farmer filter is applied
    if (balanceDue === 0 && filters.farmerId) return null

    return {
      farmerId: farmer.id,
      farmerName: farmer.name,
      lotsCount: farmerLots.length,
      totalPurchaseValue,
      totalPaid,
      balanceDue,
      lots: farmerLots
    }
  }).filter(Boolean)

  // Sort by balance due (highest first)
  farmerDues.sort((a, b) => b.balanceDue - a.balanceDue)

  // Create detailed rows for lot-wise breakdown
  const detailedRows = []
  farmerDues.forEach(farmer => {
    farmer.lots.forEach((lot, index) => {
      const lotPayments = s.purchasePayments.filter(p => p.lotId === lot.id)
      const lotPaid = lotPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const lotBalance = lot.total_purchase_value - lotPaid
      
      detailedRows.push({
        id: `${farmer.farmerId}-${lot.id}`,
        farmerName: index === 0 ? farmer.farmerName : '', // Show farmer name only for first lot
        lotNumber: lot.lotNumber,
        purchaseDate: lot.purchaseDate,
        totalPurchaseValue: lot.total_purchase_value,
        totalPaid: lotPaid,
        balanceDue: lotBalance,
        isSubRow: index > 0
      })
    })
  })

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      farmerId: '',
      dateFrom: '',
      dateTo: ''
    })
  }

  return (
    <div className="grid">
      {/* Filters */}
      <div className="panel">
        <h2>Accounts Payable - Farmer Dues</h2>
        <div className="grid grid-4">
          <Field label="Filter by Farmer">
            <select 
              value={filters.farmerId} 
              onChange={e => handleFilterChange('farmerId', e.target.value)}
            >
              <option value="">All Farmers</option>
              {s.farmers.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
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
          <h3>Total Farmers</h3>
          <div className="summary-value">{farmerDues.length}</div>
        </div>
        <div className="panel summary-card">
          <h3>Total Purchase Value</h3>
          <div className="summary-value">
            ₹{farmerDues.reduce((sum, f) => sum + f.totalPurchaseValue, 0).toFixed(2)}
          </div>
        </div>
        <div className="panel summary-card">
          <h3>Total Outstanding</h3>
          <div className="summary-value outstanding">
            ₹{farmerDues.reduce((sum, f) => sum + f.balanceDue, 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Farmer Summary Table */}
      <div className="panel">
        <h3>Farmer-wise Summary</h3>
        <Table
          columns={[
            { header: 'Farmer Name', key: 'farmerName' },
            { header: 'Lots Count', key: 'lotsCount' },
            { 
              header: 'Total Purchase Value', 
              render: r => `₹${Number(r.totalPurchaseValue).toFixed(2)}` 
            },
            { 
              header: 'Total Paid', 
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
          rows={farmerDues}
        />
      </div>

      {/* Detailed Lot-wise Breakdown */}
      <div className="panel">
        <h3>Lot-wise Breakdown</h3>
        <Table
          columns={[
            { header: 'Farmer Name', key: 'farmerName' },
            { header: 'Lot Number', key: 'lotNumber' },
            { header: 'Purchase Date', key: 'purchaseDate' },
            { 
              header: 'Purchase Value', 
              render: r => `₹${Number(r.totalPurchaseValue).toFixed(2)}` 
            },
            { 
              header: 'Paid', 
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