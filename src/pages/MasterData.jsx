import { useStore } from '../store/store'
import { Field } from '../components/Field'
import { Button } from '../components/Button'
import { Table } from '../components/Table'
import { RoleButton, PermissionGate } from '../components/RoleBasedAccess'
import { useState } from 'react'

// Enhanced Customer Management
function CustomerManagement() {
  const s = useStore()
  const [form, setForm] = useState({
    company_name: '',
    contact_person_name: '',
    bag_marking: '',
    address: '',
    mobile_primary: '',
    mobile_alternate: '',
    email: '',
    pincode: '',
    customer_since_year: new Date().getFullYear(),
    location_link: ''
  })
  const [editing, setEditing] = useState(null)

  const handleSubmit = async () => {
    if (!form.company_name.trim()) {
      alert('Company name is required')
      return
    }
    
    try {
      if (editing) {
        await s.updateItem('customers', 'customer_id', editing.customer_id, form)
        setEditing(null)
      } else {
        await s.addItem('customers', form)
      }
      
      // Reset form
      setForm({
        company_name: '',
        contact_person_name: '',
        bag_marking: '',
        address: '',
        mobile_primary: '',
        mobile_alternate: '',
        email: '',
        pincode: '',
        customer_since_year: new Date().getFullYear(),
        location_link: ''
      })
      
      alert(editing ? 'Customer updated successfully!' : 'Customer added successfully!')
    } catch (error) {
      console.error('Error saving customer:', error)
      alert('Error saving customer: ' + (error.message || 'Unknown error'))
    }
  }

  const handleEdit = (customer) => {
    setForm({
      company_name: customer.company_name || '',
      contact_person_name: customer.contact_person_name || '',
      bag_marking: customer.bag_marking || '',
      address: customer.address || '',
      mobile_primary: customer.mobile_primary || '',
      mobile_alternate: customer.mobile_alternate || '',
      email: customer.email || '',
      pincode: customer.pincode || '',
      customer_since_year: customer.customer_since_year || new Date().getFullYear(),
      location_link: customer.location_link || ''
    })
    setEditing(customer)
  }

  const handleDelete = async (customer) => {
    if (confirm(`Are you sure you want to delete customer "${customer.company_name}"?`)) {
      try {
        await s.removeItem('customers', 'customer_id', customer.customer_id)
        alert('Customer deleted successfully!')
      } catch (error) {
        console.error('Error deleting customer:', error)
        alert('Error deleting customer: ' + (error.message || 'Unknown error'))
      }
    }
  }

  return (
    <div className="panel">
      <h2>🏢 Customer Management</h2>
      
      {/* Customer Form */}
      <div className="master-form">
        <div className="grid grid-3">
          <Field label="Company Name *">
            <input 
              value={form.company_name} 
              onChange={e => setForm({...form, company_name: e.target.value})}
              placeholder="Enter company name"
            />
          </Field>
          <Field label="Contact Person">
            <input 
              value={form.contact_person_name} 
              onChange={e => setForm({...form, contact_person_name: e.target.value})}
              placeholder="Primary contact person"
            />
          </Field>
          <Field label="Bag Marking">
            <input 
              value={form.bag_marking} 
              onChange={e => setForm({...form, bag_marking: e.target.value})}
              placeholder="Customer bag identifier"
            />
          </Field>
        </div>
        
        <div className="grid grid-2">
          <Field label="Address">
            <textarea 
              value={form.address} 
              onChange={e => setForm({...form, address: e.target.value})}
              placeholder="Company address"
              rows={3}
            />
          </Field>
          <div>
            <div className="grid grid-2">
              <Field label="Primary Mobile">
                <input 
                  value={form.mobile_primary} 
                  onChange={e => setForm({...form, mobile_primary: e.target.value})}
                  placeholder="+91-9876543210"
                />
              </Field>
              <Field label="Alternate Mobile">
                <input 
                  value={form.mobile_alternate} 
                  onChange={e => setForm({...form, mobile_alternate: e.target.value})}
                  placeholder="+91-9876543211"
                />
              </Field>
            </div>
            <div className="grid grid-2">
              <Field label="Email">
                <input 
                  type="email"
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="company@email.com"
                />
              </Field>
              <Field label="Pincode">
                <input 
                  value={form.pincode} 
                  onChange={e => setForm({...form, pincode: e.target.value})}
                  placeholder="600001"
                />
              </Field>
            </div>
          </div>
        </div>
        
        <div className="grid grid-2">
          <Field label="Customer Since Year">
            <input 
              type="number"
              value={form.customer_since_year} 
              onChange={e => setForm({...form, customer_since_year: parseInt(e.target.value)})}
              min="2000"
              max={new Date().getFullYear()}
            />
          </Field>
          <Field label="Location Link (Google Maps)">
            <input 
              value={form.location_link} 
              onChange={e => setForm({...form, location_link: e.target.value})}
              placeholder="https://maps.google.com/..."
            />
          </Field>
        </div>
        
        <div className="form-actions">
          <Button variant="primary" onClick={handleSubmit}>
            {editing ? '✏️ Update Customer' : '➕ Add Customer'}
          </Button>
          {editing && (
            <Button variant="secondary" onClick={() => {
              setEditing(null)
              setForm({
                company_name: '',
                contact_person_name: '',
                bag_marking: '',
                address: '',
                mobile_primary: '',
                mobile_alternate: '',
                email: '',
                pincode: '',
                customer_since_year: new Date().getFullYear(),
                location_link: ''
              })
            }}>
              ❌ Cancel
            </Button>
          )}
        </div>
      </div>
      
      {/* Customer List */}
      <div className="master-list">
        <h3>Customer List ({s.customers.length})</h3>
        <Table
          columns={[
            { header: 'Company Name', key: 'company_name' },
            { header: 'Contact Person', key: 'contact_person_name' },
            { header: 'Bag Marking', key: 'bag_marking' },
            { header: 'Primary Mobile', key: 'mobile_primary' },
            { header: 'Email', key: 'email' },
            { header: 'Since', key: 'customer_since_year' },
            { 
              header: 'Actions', 
              render: customer => (
                <div className="action-buttons">
                  <Button variant="secondary" onClick={() => handleEdit(customer)}>
                    ✏️ Edit
                  </Button>
                  <RoleButton 
                    permission="delete"
                    variant="secondary" 
                    onClick={() => handleDelete(customer)}
                    style={{marginLeft: 8, color: 'var(--bad)'}}
                    disableIfNoAccess
                  >
                    🗑️ Delete
                  </RoleButton>
                </div>
              )
            }
          ]}
          rows={s.customers}
        />
      </div>
    </div>
  )
}

// Enhanced Farmer Management
function FarmerManagement() {
  const s = useStore()
  const [form, setForm] = useState({
    auction_name: '',
    billing_name: '',
    contact_person_name: '',
    address: '',
    mobile_primary: '',
    mobile_alternate: '',
    email: '',
    pincode: '',
    farmer_since_year: new Date().getFullYear(),
    location_link: ''
  })
  const [editing, setEditing] = useState(null)

  const handleSubmit = async () => {
    if (!form.auction_name.trim() || !form.billing_name.trim()) {
      alert('Both auction name and billing name are required')
      return
    }
    
    try {
      if (editing) {
        await s.updateItem('farmers', 'farmer_id', editing.farmer_id, form)
        setEditing(null)
      } else {
        await s.addItem('farmers', form)
      }
      
      // Reset form
      setForm({
        auction_name: '',
        billing_name: '',
        contact_person_name: '',
        address: '',
        mobile_primary: '',
        mobile_alternate: '',
        email: '',
        pincode: '',
        farmer_since_year: new Date().getFullYear(),
        location_link: ''
      })
      
      alert(editing ? 'Farmer updated successfully!' : 'Farmer added successfully!')
    } catch (error) {
      console.error('Error saving farmer:', error)
      alert('Error saving farmer: ' + (error.message || 'Unknown error'))
    }
  }

  const handleEdit = (farmer) => {
    setForm({
      auction_name: farmer.auction_name || '',
      billing_name: farmer.billing_name || '',
      contact_person_name: farmer.contact_person_name || '',
      address: farmer.address || '',
      mobile_primary: farmer.mobile_primary || '',
      mobile_alternate: farmer.mobile_alternate || '',
      email: farmer.email || '',
      pincode: farmer.pincode || '',
      farmer_since_year: farmer.farmer_since_year || new Date().getFullYear(),
      location_link: farmer.location_link || ''
    })
    setEditing(farmer)
  }

  const handleDelete = async (farmer) => {
    if (confirm(`Are you sure you want to delete farmer "${farmer.auction_name}"?`)) {
      try {
        await s.removeItem('farmers', 'farmer_id', farmer.farmer_id)
        alert('Farmer deleted successfully!')
      } catch (error) {
        console.error('Error deleting farmer:', error)
        alert('Error deleting farmer: ' + (error.message || 'Unknown error'))
      }
    }
  }

  return (
    <div className="panel">
      <h2>🌾 Farmer Management</h2>
      
      {/* Farmer Form */}
      <div className="master-form">
        <div className="grid grid-3">
          <Field label="Auction Name *">
            <input 
              value={form.auction_name} 
              onChange={e => setForm({...form, auction_name: e.target.value})}
              placeholder="Name used at auction"
            />
          </Field>
          <Field label="Billing Name *">
            <input 
              value={form.billing_name} 
              onChange={e => setForm({...form, billing_name: e.target.value})}
              placeholder="Legal/payment name"
            />
          </Field>
          <Field label="Contact Person">
            <input 
              value={form.contact_person_name} 
              onChange={e => setForm({...form, contact_person_name: e.target.value})}
              placeholder="Primary contact person"
            />
          </Field>
        </div>
        
        <div className="grid grid-2">
          <Field label="Address">
            <textarea 
              value={form.address} 
              onChange={e => setForm({...form, address: e.target.value})}
              placeholder="Farm/office address"
              rows={3}
            />
          </Field>
          <div>
            <div className="grid grid-2">
              <Field label="Primary Mobile">
                <input 
                  value={form.mobile_primary} 
                  onChange={e => setForm({...form, mobile_primary: e.target.value})}
                  placeholder="+91-9876543210"
                />
              </Field>
              <Field label="Alternate Mobile">
                <input 
                  value={form.mobile_alternate} 
                  onChange={e => setForm({...form, mobile_alternate: e.target.value})}
                  placeholder="+91-9876543211"
                />
              </Field>
            </div>
            <div className="grid grid-2">
              <Field label="Email">
                <input 
                  type="email"
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="farmer@email.com"
                />
              </Field>
              <Field label="Pincode">
                <input 
                  value={form.pincode} 
                  onChange={e => setForm({...form, pincode: e.target.value})}
                  placeholder="600001"
                />
              </Field>
            </div>
          </div>
        </div>
        
        <div className="grid grid-2">
          <Field label="Farmer Since Year">
            <input 
              type="number"
              value={form.farmer_since_year} 
              onChange={e => setForm({...form, farmer_since_year: parseInt(e.target.value)})}
              min="2000"
              max={new Date().getFullYear()}
            />
          </Field>
          <Field label="Location Link (Google Maps)">
            <input 
              value={form.location_link} 
              onChange={e => setForm({...form, location_link: e.target.value})}
              placeholder="https://maps.google.com/..."
            />
          </Field>
        </div>
        
        <div className="form-actions">
          <Button variant="primary" onClick={handleSubmit}>
            {editing ? '✏️ Update Farmer' : '➕ Add Farmer'}
          </Button>
          {editing && (
            <Button variant="secondary" onClick={() => {
              setEditing(null)
              setForm({
                auction_name: '',
                billing_name: '',
                contact_person_name: '',
                address: '',
                mobile_primary: '',
                mobile_alternate: '',
                email: '',
                pincode: '',
                farmer_since_year: new Date().getFullYear(),
                location_link: ''
              })
            }}>
              ❌ Cancel
            </Button>
          )}
        </div>
      </div>
      
      {/* Farmer List */}
      <div className="master-list">
        <h3>Farmer List ({s.farmers.length})</h3>
        <Table
          columns={[
            { header: 'Auction Name', key: 'auction_name' },
            { header: 'Billing Name', key: 'billing_name' },
            { header: 'Contact Person', key: 'contact_person_name' },
            { header: 'Primary Mobile', key: 'mobile_primary' },
            { header: 'Email', key: 'email' },
            { header: 'Since', key: 'farmer_since_year' },
            { 
              header: 'Actions', 
              render: farmer => (
                <div className="action-buttons">
                  <Button variant="secondary" onClick={() => handleEdit(farmer)}>
                    ✏️ Edit
                  </Button>
                  <RoleButton 
                    permission="delete"
                    variant="secondary" 
                    onClick={() => handleDelete(farmer)}
                    style={{marginLeft: 8, color: 'var(--bad)'}}
                    disableIfNoAccess
                  >
                    🗑️ Delete
                  </RoleButton>
                </div>
              )
            }
          ]}
          rows={s.farmers}
        />
      </div>
    </div>
  )
}

// Enhanced Warehouse Management
function WarehouseManagement() {
  const s = useStore()
  const [form, setForm] = useState({
    warehouse_name: '',
    address: '',
    contact_person_name: '',
    contact_number: '',
    pincode: '',
    location_link: ''
  })
  const [editing, setEditing] = useState(null)

  const handleSubmit = async () => {
    if (!form.warehouse_name.trim()) {
      alert('Warehouse name is required')
      return
    }
    
    try {
      if (editing) {
        await s.updateItem('warehouses', 'warehouse_id', editing.warehouse_id, form)
        setEditing(null)
      } else {
        await s.addItem('warehouses', form)
      }
      
      // Reset form
      setForm({
        warehouse_name: '',
        address: '',
        contact_person_name: '',
        contact_number: '',
        pincode: '',
        location_link: ''
      })
      
      alert(editing ? 'Warehouse updated successfully!' : 'Warehouse added successfully!')
    } catch (error) {
      console.error('Error saving warehouse:', error)
      alert('Error saving warehouse: ' + (error.message || 'Unknown error'))
    }
  }

  const handleEdit = (warehouse) => {
    setForm({
      warehouse_name: warehouse.warehouse_name || '',
      address: warehouse.address || '',
      contact_person_name: warehouse.contact_person_name || '',
      contact_number: warehouse.contact_number || '',
      pincode: warehouse.pincode || '',
      location_link: warehouse.location_link || ''
    })
    setEditing(warehouse)
  }

  const handleDelete = async (warehouse) => {
    if (confirm(`Are you sure you want to delete warehouse "${warehouse.warehouse_name}"?`)) {
      try {
        await s.removeItem('warehouses', 'warehouse_id', warehouse.warehouse_id)
        alert('Warehouse deleted successfully!')
      } catch (error) {
        console.error('Error deleting warehouse:', error)
        alert('Error deleting warehouse: ' + (error.message || 'Unknown error'))
      }
    }
  }

  return (
    <div className="panel">
      <h2>🏢 Warehouse Management</h2>
      
      {/* Warehouse Form */}
      <div className="master-form">
        <div className="grid grid-2">
          <Field label="Warehouse Name *">
            <input 
              value={form.warehouse_name} 
              onChange={e => setForm({...form, warehouse_name: e.target.value})}
              placeholder="Enter warehouse name"
            />
          </Field>
          <Field label="Contact Person">
            <input 
              value={form.contact_person_name} 
              onChange={e => setForm({...form, contact_person_name: e.target.value})}
              placeholder="Manager/supervisor name"
            />
          </Field>
        </div>
        
        <div className="grid grid-2">
          <Field label="Address">
            <textarea 
              value={form.address} 
              onChange={e => setForm({...form, address: e.target.value})}
              placeholder="Warehouse address"
              rows={3}
            />
          </Field>
          <div>
            <div className="grid grid-2">
              <Field label="Contact Number">
                <input 
                  value={form.contact_number} 
                  onChange={e => setForm({...form, contact_number: e.target.value})}
                  placeholder="+91-9876543210"
                />
              </Field>
              <Field label="Pincode">
                <input 
                  value={form.pincode} 
                  onChange={e => setForm({...form, pincode: e.target.value})}
                  placeholder="600001"
                />
              </Field>
            </div>
            <Field label="Location Link (Google Maps)">
              <input 
                value={form.location_link} 
                onChange={e => setForm({...form, location_link: e.target.value})}
                placeholder="https://maps.google.com/..."
              />
            </Field>
          </div>
        </div>
        
        <div className="form-actions">
          <Button variant="primary" onClick={handleSubmit}>
            {editing ? '✏️ Update Warehouse' : '➕ Add Warehouse'}
          </Button>
          {editing && (
            <Button variant="secondary" onClick={() => {
              setEditing(null)
              setForm({
                warehouse_name: '',
                address: '',
                contact_person_name: '',
                contact_number: '',
                pincode: '',
                location_link: ''
              })
            }}>
              ❌ Cancel
            </Button>
          )}
        </div>
      </div>
      
      {/* Warehouse List */}
      <div className="master-list">
        <h3>Warehouse List ({s.warehouses.length})</h3>
        <Table
          columns={[
            { header: 'Warehouse Name', key: 'warehouse_name' },
            { header: 'Contact Person', key: 'contact_person_name' },
            { header: 'Contact Number', key: 'contact_number' },
            { header: 'Address', key: 'address' },
            { header: 'Pincode', key: 'pincode' },
            { 
              header: 'Actions', 
              render: warehouse => (
                <div className="action-buttons">
                  <Button variant="secondary" onClick={() => handleEdit(warehouse)}>
                    ✏️ Edit
                  </Button>
                  <RoleButton 
                    permission="delete"
                    variant="secondary" 
                    onClick={() => handleDelete(warehouse)}
                    style={{marginLeft: 8, color: 'var(--bad)'}}
                    disableIfNoAccess
                  >
                    🗑️ Delete
                  </RoleButton>
                </div>
              )
            }
          ]}
          rows={s.warehouses}
        />
      </div>
    </div>
  )
}

// Enhanced Product Management
function ProductManagement() {
  const s = useStore()
  const [form, setForm] = useState({
    product_name: '',
    is_active: true
  })
  const [editing, setEditing] = useState(null)

  const handleSubmit = async () => {
    if (!form.product_name.trim()) {
      alert('Product name is required')
      return
    }
    
    try {
      if (editing) {
        await s.updateItem('products', 'product_id', editing.product_id, form)
        setEditing(null)
      } else {
        await s.addItem('products', form)
      }
      
      // Reset form
      setForm({
        product_name: '',
        is_active: true
      })
      
      alert(editing ? 'Product updated successfully!' : 'Product added successfully!')
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error saving product: ' + (error.message || 'Unknown error'))
    }
  }

  const handleEdit = (product) => {
    setForm({
      product_name: product.product_name || '',
      is_active: product.is_active !== false
    })
    setEditing(product)
  }

  const handleDelete = async (product) => {
    if (confirm(`Are you sure you want to delete product "${product.product_name}"?`)) {
      try {
        await s.removeItem('products', 'product_id', product.product_id)
        alert('Product deleted successfully!')
      } catch (error) {
        console.error('Error deleting product:', error)
        alert('Error deleting product: ' + (error.message || 'Unknown error'))
      }
    }
  }

  return (
    <div className="panel">
      <h2>🍯 Product Management</h2>
      
      {/* Product Form */}
      <div className="master-form">
        <div className="grid grid-2">
          <Field label="Product Name *">
            <input 
              value={form.product_name} 
              onChange={e => setForm({...form, product_name: e.target.value})}
              placeholder="e.g., Urundai Vellam"
            />
          </Field>
          <Field label="Status">
            <select 
              value={form.is_active} 
              onChange={e => setForm({...form, is_active: e.target.value === 'true'})}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </Field>
        </div>
        
        <div className="form-actions">
          <Button variant="primary" onClick={handleSubmit}>
            {editing ? '✏️ Update Product' : '➕ Add Product'}
          </Button>
          {editing && (
            <Button variant="secondary" onClick={() => {
              setEditing(null)
              setForm({
                product_name: '',
                is_active: true
              })
            }}>
              ❌ Cancel
            </Button>
          )}
        </div>
      </div>
      
      {/* Product List */}
      <div className="master-list">
        <h3>Product List ({s.products.length})</h3>
        <Table
          columns={[
            { header: 'Product Name', key: 'product_name' },
            { 
              header: 'Status', 
              render: product => (
                <span className={`badge ${product.is_active ? 'good' : 'bad'}`}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </span>
              )
            },
            { 
              header: 'Actions', 
              render: product => (
                <div className="action-buttons">
                  <Button variant="secondary" onClick={() => handleEdit(product)}>
                    ✏️ Edit
                  </Button>
                  <RoleButton 
                    permission="delete"
                    variant="secondary" 
                    onClick={() => handleDelete(product)}
                    style={{marginLeft: 8, color: 'var(--bad)'}}
                    disableIfNoAccess
                  >
                    🗑️ Delete
                  </RoleButton>
                </div>
              )
            }
          ]}
          rows={s.products}
        />
      </div>
    </div>
  )
}

export default function MasterData(){
  const [activeTab, setActiveTab] = useState('customers')
  
  const tabs = [
    { key: 'customers', label: '🏢 Customers', component: CustomerManagement },
    { key: 'farmers', label: '🌾 Farmers', component: FarmerManagement },
    { key: 'warehouses', label: '🏢 Warehouses', component: WarehouseManagement },
    { key: 'products', label: '🍯 Products', component: ProductManagement }
  ]

  const ActiveComponent = tabs.find(tab => tab.key === activeTab)?.component || CustomerManagement

  return (
    <div className="master-data-container">
      {/* Tab Navigation */}
      <div className="panel">
        <div className="tab-navigation">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Active Component */}
      <ActiveComponent />
      
      <style jsx>{`
        .master-data-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .tab-navigation {
          display: flex;
          gap: 4px;
          background: var(--nav-bg);
          padding: 4px;
          border-radius: 8px;
        }
        
        .tab-button {
          flex: 1;
          padding: 12px 16px;
          border: none;
          background: transparent;
          color: var(--muted);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
          font-size: 14px;
        }
        
        .tab-button:hover {
          background: var(--panel);
          color: var(--text);
        }
        
        .tab-button.active {
          background: var(--accent);
          color: white;
          font-weight: 600;
        }
        
        .master-form {
          margin-bottom: 24px;
          padding: 20px;
          background: var(--nav-bg);
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        
        .master-list {
          margin-top: 24px;
        }
        
        .master-list h3 {
          margin-bottom: 16px;
          color: var(--text);
          font-size: 16px;
          font-weight: 600;
        }
        
        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }
        
        .action-buttons {
          display: flex;
          gap: 8px;
        }
        
        .action-buttons button {
          font-size: 12px;
          padding: 6px 10px;
        }
        
        /* Ensure grid layouts work properly */
        .grid {
          display: grid;
          gap: 16px;
        }
        
        .grid-2 {
          grid-template-columns: 1fr 1fr;
        }
        
        .grid-3 {
          grid-template-columns: repeat(3, 1fr);
        }
        
        /* Field styling */
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .field label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
        }
        
        .field input,
        .field textarea,
        .field select {
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 4px;
          background: var(--panel);
          color: var(--text);
          font-size: 14px;
        }
        
        @media (max-width: 768px) {
          .tab-navigation {
            flex-direction: column;
          }
          
          .tab-button {
            text-align: center;
          }
          
          .master-form .grid-3 {
            grid-template-columns: 1fr;
          }
          
          .master-form .grid-2 {
            grid-template-columns: 1fr;
          }
          
          .form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}