import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Database service layer for type safety and consistency
export const db = {
  // Products
  products: {
    getAll: () => supabase.from('products').select('*').order('name'),
    create: (product) => supabase.from('products').insert(product).select().single(),
    update: (id, updates) => supabase.from('products').update(updates).eq('id', id).select().single(),
    delete: (id) => supabase.from('products').delete().eq('id', id),
  },

  // Farmers
  farmers: {
    getAll: () => supabase.from('farmers').select('*').order('name'),
    create: (farmer) => supabase.from('farmers').insert(farmer).select().single(),
    update: (id, updates) => supabase.from('farmers').update(updates).eq('id', id).select().single(),
    delete: (id) => supabase.from('farmers').delete().eq('id', id),
  },

  // Customers
  customers: {
    getAll: () => supabase.from('customers').select('*').order('name'),
    create: (customer) => supabase.from('customers').insert(customer).select().single(),
    update: (id, updates) => supabase.from('customers').update(updates).eq('id', id).select().single(),
    delete: (id) => supabase.from('customers').delete().eq('id', id),
  },

  // Warehouses
  warehouses: {
    getAll: () => supabase.from('warehouses').select('*').order('name'),
    create: (warehouse) => supabase.from('warehouses').insert(warehouse).select().single(),
    update: (id, updates) => supabase.from('warehouses').update(updates).eq('id', id).select().single(),
    delete: (id) => supabase.from('warehouses').delete().eq('id', id),
  },

  // Lots
  lots: {
    getAll: () => supabase.from('lots').select('*').order('created_at', { ascending: false }),
    create: (lot) => supabase.from('lots').insert(lot).select().single(),
    update: (id, updates) => supabase.from('lots').update(updates).eq('id', id).select().single(),
    delete: (id) => supabase.from('lots').delete().eq('id', id),
    getByNumber: (lotNumber) => supabase.from('lots').select('*').ilike('lot_number', lotNumber),
  },

  // Lot Products
  lotProducts: {
    getAll: () => supabase.from('lot_products').select('*'),
    getByLotId: (lotId) => supabase.from('lot_products').select('*').eq('lot_id', lotId),
    create: (lotProduct) => supabase.from('lot_products').insert(lotProduct).select().single(),
    update: (id, updates) => supabase.from('lot_products').update(updates).eq('id', id).select().single(),
    delete: (id) => supabase.from('lot_products').delete().eq('id', id),
    bulkCreate: (lotProducts) => supabase.from('lot_products').insert(lotProducts).select(),
  },

  // Purchase Payments
  purchasePayments: {
    getAll: () => supabase.from('purchase_payments').select('*').order('created_at', { ascending: false }),
    getByLotId: (lotId) => supabase.from('purchase_payments').select('*').eq('lot_id', lotId).order('created_at', { ascending: false }),
    create: (payment) => supabase.from('purchase_payments').insert(payment).select().single(),
    update: (id, updates) => supabase.from('purchase_payments').update(updates).eq('id', id).select().single(),
    delete: (id) => supabase.from('purchase_payments').delete().eq('id', id),
  },

  // Sales Orders
  salesOrders: {
    getAll: () => supabase.from('sales_orders').select('*').order('created_at', { ascending: false }),
    create: (order) => supabase.from('sales_orders').insert(order).select().single(),
    update: (id, updates) => supabase.from('sales_orders').update(updates).eq('id', id).select().single(),
    delete: (id) => supabase.from('sales_orders').delete().eq('id', id),
  },

  // Pick List Items
  pickListItems: {
    getAll: () => supabase.from('pick_list_items').select('*').order('created_at', { ascending: false }),
    getBySalesOrderId: (salesOrderId) => supabase.from('pick_list_items').select('*').eq('sales_order_id', salesOrderId),
    create: (item) => supabase.from('pick_list_items').insert(item).select().single(),
    update: (id, updates) => supabase.from('pick_list_items').update(updates).eq('id', id).select().single(),
    delete: (id) => supabase.from('pick_list_items').delete().eq('id', id),
  },

  // Dispatch Confirmations
  dispatchConfirmations: {
    getAll: () => supabase.from('dispatch_confirmations').select('*').order('created_at', { ascending: false }),
    create: (confirmation) => supabase.from('dispatch_confirmations').insert(confirmation).select().single(),
    update: (id, updates) => supabase.from('dispatch_confirmations').update(updates).eq('id', id).select().single(),
    delete: (id) => supabase.from('dispatch_confirmations').delete().eq('id', id),
  },

  // Sales Payments
  salesPayments: {
    getAll: () => supabase.from('sales_payments').select('*').order('created_at', { ascending: false }),
    getBySalesOrderId: (salesOrderId) => supabase.from('sales_payments').select('*').eq('sales_order_id', salesOrderId).order('created_at', { ascending: false }),
    create: (payment) => supabase.from('sales_payments').insert(payment).select().single(),
    update: (id, updates) => supabase.from('sales_payments').update(updates).eq('id', id).select().single(),
    delete: (id) => supabase.from('sales_payments').delete().eq('id', id),
  },

  // Settings/Meta
  settings: {
    get: () => supabase.from('settings').select('*').limit(1).single(),
    upsert: (settings) => supabase.from('settings').upsert(settings).select().single(),
  },
}

// Real-time subscriptions helper
export const subscribeToTable = (tableName, callback) => {
  return supabase
    .channel(`${tableName}_changes`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: tableName 
      }, 
      callback
    )
    .subscribe()
}

// Helper function for error handling
export const handleSupabaseError = (error, context = '') => {
  console.error(`Supabase error${context ? ' in ' + context : ''}:`, error)
  
  if (error?.message) {
    // User-friendly error messages
    const userMessage = error.message.includes('duplicate key value') 
      ? 'This record already exists. Please use a different value.'
      : error.message.includes('foreign key constraint')
      ? 'Cannot delete this record as it is being used elsewhere.'
      : error.message.includes('check constraint')
      ? 'Invalid data format. Please check your inputs.'
      : 'An error occurred. Please try again.'
    
    return userMessage
  }
  
  return 'An unexpected error occurred. Please try again.'
}