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
      render: (payment) => {
        const date = payment.payment_date || payment.paymentDate
        return date ? new Date(date).toLocaleDateString() : '-'
      }
    },
    { 
      header: 'Amount', 
      render: (payment) => `₹${Number(payment.amount_paid || payment.amount || 0).toFixed(2)}` 
    },
    { 
      header: 'Method', 
      render: (payment) => payment.payment_method || payment.method || '-'
    },
    { 
      header: 'Reference', 
      render: (payment) => payment.reference_details || payment.reference || '-' 
    },
    { 
      header: 'Recorded On', 
      render: (payment) => {
        const date = payment.created_at || payment.createdAt
        return date ? new Date(date).toLocaleString() : '-'
      }
    }
  ]

  return (
    <div className="panel">
      <h3>{title}</h3>
      <Table columns={columns} rows={payments} />
    </div>
  )
}