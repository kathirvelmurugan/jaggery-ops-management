import { useState } from 'react'
import { Field } from './Field'
import { Button } from './Button'

export function PaymentForm({ onSubmit, onCancel, title = "Add Payment" }) {
  const [form, setForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    method: 'Cash',
    reference: ''
  })

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = () => {
    if (!form.amount || Number(form.amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }
    
    onSubmit({
      amount: Number(form.amount),
      paymentDate: form.paymentDate,
      method: form.method,
      reference: form.reference
    })

    // Reset form
    setForm({
      amount: '',
      paymentDate: new Date().toISOString().slice(0, 10),
      method: 'Cash',
      reference: ''
    })
  }

  return (
    <div className="panel">
      <h3>{title}</h3>
      <div className="grid grid-2">
        <Field label="Amount (₹)">
          <input 
            type="number" 
            value={form.amount} 
            onChange={e => handleChange('amount', e.target.value)}
            placeholder="Enter amount"
            step="0.01"
          />
        </Field>
        <Field label="Payment Date">
          <input 
            type="date" 
            value={form.paymentDate} 
            onChange={e => handleChange('paymentDate', e.target.value)}
          />
        </Field>
        <Field label="Payment Method">
          <select 
            value={form.method} 
            onChange={e => handleChange('method', e.target.value)}
          >
            <option value="Cash">Cash</option>
            <option value="RTGS">RTGS</option>
          </select>
        </Field>
        <Field label="Reference/Notes">
          <input 
            value={form.reference} 
            onChange={e => handleChange('reference', e.target.value)}
            placeholder="UTR number, notes, etc."
          />
        </Field>
      </div>
      <div className="row" style={{ marginTop: 12, gap: 8 }}>
        <Button variant="primary" onClick={handleSubmit}>
          Add Payment
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}