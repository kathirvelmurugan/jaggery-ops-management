export function PaymentSummary({ 
  totalValue, 
  totalPaid,
  payments = [], // Add payments array for breakdown
  title = "Financial Summary",
  valueLabel = "Total Value",
  paidLabel = "Total Paid",
  balanceLabel = "Balance Due"
}) {
  const balance = totalValue - totalPaid
  const isOverpaid = balance < 0
  const isPaid = Math.abs(balance) < 0.01
  
  // Calculate payment method breakdown - handle both 'method' and 'payment_method' fields
  const cashPayments = payments.filter(p => (p.method || p.payment_method) === 'Cash')
  const rtgsPayments = payments.filter(p => (p.method || p.payment_method) === 'RTGS')
  const totalCash = cashPayments.reduce((sum, p) => sum + Number(p.amount || p.amount_paid || 0), 0)
  const totalRTGS = rtgsPayments.reduce((sum, p) => sum + Number(p.amount || p.amount_paid || 0), 0)

  return (
    <div className="panel">
      <h3>{title}</h3>
      
      {/* Main Financial Summary */}
      <div className="grid grid-4">
        <div className="financial-summary-item">
          <div className="label">{valueLabel}</div>
          <div className="value total">₹{Number(totalValue).toFixed(2)}</div>
        </div>
        <div className="financial-summary-item">
          <div className="label">{paidLabel}</div>
          <div className="value paid">₹{Number(totalPaid).toFixed(2)}</div>
        </div>
        <div className="financial-summary-item">
          <div className="label">{balanceLabel}</div>
          <div className={`value balance ${
            isPaid ? 'paid-full' : isOverpaid ? 'overpaid' : 'pending'
          }`}>
            ₹{Math.abs(balance).toFixed(2)}
            {isPaid && ' (Paid)'}
            {isOverpaid && ' (Overpaid)'}
          </div>
        </div>
        <div className="financial-summary-item">
          <div className="label">Payment Status</div>
          <div className={`status-badge ${
            isPaid ? 'status-paid' : balance > 0 ? 'status-pending' : 'status-overpaid'
          }`}>
            {isPaid ? 'PAID' : balance > 0 ? 'PENDING' : 'OVERPAID'}
          </div>
        </div>
      </div>
      
      {/* Payment Method Breakdown */}
      {payments.length > 0 && (
        <>
          <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: 14, color: '#666' }}>Payment Method Breakdown</h4>
          <div className="grid grid-3">
            <div className="breakdown-item">
              <div className="breakdown-label">Cash Payments</div>
              <div className="breakdown-value cash">₹{totalCash.toFixed(2)}</div>
              <div className="breakdown-count">({cashPayments.length} transactions)</div>
            </div>
            <div className="breakdown-item">
              <div className="breakdown-label">RTGS Payments</div>
              <div className="breakdown-value rtgs">₹{totalRTGS.toFixed(2)}</div>
              <div className="breakdown-count">({rtgsPayments.length} transactions)</div>
            </div>
            <div className="breakdown-item">
              <div className="breakdown-label">Total Transactions</div>
              <div className="breakdown-value total-trans">₹{(totalCash + totalRTGS).toFixed(2)}</div>
              <div className="breakdown-count">({payments.length} total)</div>
            </div>
          </div>
        </>
      )}
      
      <style jsx>{`
        .financial-summary-item {
          text-align: center;
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
        }
        
        .label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
          font-weight: 500;
        }
        
        .value {
          font-size: 18px;
          font-weight: bold;
        }
        
        .value.total {
          color: #2196F3;
        }
        
        .value.paid {
          color: #4CAF50;
        }
        
        .value.balance.pending {
          color: #FF9800;
        }
        
        .value.balance.paid-full {
          color: #4CAF50;
        }
        
        .value.balance.overpaid {
          color: #f44336;
        }
        
        .status-badge {
          font-size: 12px;
          font-weight: bold;
          padding: 4px 8px;
          border-radius: 12px;
          text-align: center;
        }
        
        .status-badge.status-paid {
          background: #e8f5e8;
          color: #4CAF50;
        }
        
        .status-badge.status-pending {
          background: #fff3e0;
          color: #FF9800;
        }
        
        .status-badge.status-overpaid {
          background: #ffebee;
          color: #f44336;
        }
        
        .breakdown-item {
          text-align: center;
          padding: 12px;
          border: 1px solid #f0f0f0;
          border-radius: 4px;
          background: #fafafa;
        }
        
        .breakdown-label {
          font-size: 11px;
          color: #666;
          margin-bottom: 4px;
          font-weight: 500;
        }
        
        .breakdown-value {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .breakdown-value.cash {
          color: #4CAF50;
        }
        
        .breakdown-value.rtgs {
          color: #2196F3;
        }
        
        .breakdown-value.total-trans {
          color: #9C27B0;
        }
        
        .breakdown-count {
          font-size: 10px;
          color: #999;
        }
      `}</style>
    </div>
  )
}