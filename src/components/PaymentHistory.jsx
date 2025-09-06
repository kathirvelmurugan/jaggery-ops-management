import { Table } from './Table'

export function PaymentHistory({ payments, title = "Payment History" }) {
  if (!payments || payments.length === 0) {
    return (
      <div className="panel">
        <h3>{title}</h3>
        <p style={{ color: '#666', fontStyle: 'italic' }}>No payments recorded</p>
      </div>
    )
  }

  const columns = [
    { 
      header: 'Date', 
      render: (payment) => new Date(payment.paymentDate).toLocaleDateString() 
    },
    { 
      header: 'Amount', 
      render: (payment) => `₹${Number(payment.amount).toFixed(2)}` 
    },
    { header: 'Method', key: 'method' },
    { 
      header: 'Reference', 
      render: (payment) => payment.reference || '-' 
    },
    { 
      header: 'Recorded On', 
      render: (payment) => payment.createdAt ? 
        new Date(payment.createdAt).toLocaleString() : '-' 
    }
  ]

  return (
    <div className="panel">
      <h3>{title}</h3>
      <Table columns={columns} rows={payments} />
    </div>
  )
}