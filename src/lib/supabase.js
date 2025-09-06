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

// Database service layer for enhanced schema with normalized structure
export const db = {
  // Products (Updated for enhanced schema)
  products: {
    getAll: () => supabase.from('products').select('*').order('product_name'),
    create: (product) => supabase.from('products').insert(product).select().single(),
    update: (productId, updates) => supabase.from('products').update(updates).eq('product_id', productId).select().single(),
    delete: (productId) => supabase.from('products').delete().eq('product_id', productId),
  },

  // Farmers (Updated for enhanced schema)
  farmers: {
    getAll: () => supabase.from('farmers').select('*').order('auction_name'),
    create: (farmer) => supabase.from('farmers').insert(farmer).select().single(),
    update: (farmerId, updates) => supabase.from('farmers').update(updates).eq('farmer_id', farmerId).select().single(),
    delete: (farmerId) => supabase.from('farmers').delete().eq('farmer_id', farmerId),
  },

  // Customers (Updated for enhanced schema)
  customers: {
    getAll: () => supabase.from('customers').select('*').order('company_name'),
    create: (customer) => supabase.from('customers').insert(customer).select().single(),
    update: (customerId, updates) => supabase.from('customers').update(updates).eq('customer_id', customerId).select().single(),
    delete: (customerId) => supabase.from('customers').delete().eq('customer_id', customerId),
  },

  // Warehouses (Updated for enhanced schema)
  warehouses: {
    getAll: () => supabase.from('warehouses').select('*').order('warehouse_name'),
    create: (warehouse) => supabase.from('warehouses').insert(warehouse).select().single(),
    update: (warehouseId, updates) => supabase.from('warehouses').update(updates).eq('warehouse_id', warehouseId).select().single(),
    delete: (warehouseId) => supabase.from('warehouses').delete().eq('warehouse_id', warehouseId),
  },

  // Lots (Header table for purchases)
  lots: {
    getAll: () => supabase.from('lots').select(`
      *,
      farmers:farmer_id(farmer_id, auction_name, billing_name)
    `).order('created_at', { ascending: false }),
    create: (lot) => supabase.from('lots').insert(lot).select().single(),
    update: (lotId, updates) => supabase.from('lots').update(updates).eq('lot_id', lotId).select().single(),
    delete: (lotId) => supabase.from('lots').delete().eq('lot_id', lotId),
    getByNumber: (lotNumber) => supabase.from('lots').select('*').ilike('lot_number', lotNumber),
  },

  // Lot Items (Individual products within lots)
  lotItems: {
    getAll: () => supabase.from('lot_items').select(`
      *,
      lots:lot_id(lot_id, lot_number, purchase_date),
      products:product_id(product_id, product_name),
      warehouses:warehouse_id(warehouse_id, warehouse_name)
    `).order('created_at', { ascending: false }),
    getByLotId: (lotId) => supabase.from('lot_items').select(`
      *,
      products:product_id(product_id, product_name),
      warehouses:warehouse_id(warehouse_id, warehouse_name)
    `).eq('lot_id', lotId),
    create: (lotItem) => supabase.from('lot_items').insert(lotItem).select().single(),
    update: (lotItemId, updates) => supabase.from('lot_items').update(updates).eq('lot_item_id', lotItemId).select().single(),
    delete: (lotItemId) => supabase.from('lot_items').delete().eq('lot_item_id', lotItemId),
    bulkCreate: (lotItems) => supabase.from('lot_items').insert(lotItems).select(),
    getAvailableInventory: () => supabase.from('lot_items').select(`
      *,
      lots:lot_id(lot_id, lot_number, purchase_date),
      products:product_id(product_id, product_name),
      warehouses:warehouse_id(warehouse_id, warehouse_name)
    `).gt('current_total_kg', 0).order('created_at'),
  },

  // Purchase Payments (Links to lot header)
  purchasePayments: {
    getAll: () => supabase.from('purchase_payments').select(`
      *,
      lots:lot_id(lot_id, lot_number, purchase_date)
    `).order('created_at', { ascending: false }),
    getByLotId: (lotId) => supabase.from('purchase_payments').select('*').eq('lot_id', lotId).order('created_at', { ascending: false }),
    create: (payment) => supabase.from('purchase_payments').insert(payment).select().single(),
    update: (paymentId, updates) => supabase.from('purchase_payments').update(updates).eq('payment_id', paymentId).select().single(),
    delete: (paymentId) => supabase.from('purchase_payments').delete().eq('payment_id', paymentId),
  },

  // Sales Orders
  salesOrders: {
    getAll: () => supabase.from('sales_orders').select(`
      *,
      customers:customer_id(customer_id, company_name, contact_person_name, bag_marking)
    `).order('created_at', { ascending: false }),
    create: (order) => supabase.from('sales_orders').insert(order).select().single(),
    update: (orderId, updates) => supabase.from('sales_orders').update(updates).eq('order_id', orderId).select().single(),
    delete: (orderId) => supabase.from('sales_orders').delete().eq('order_id', orderId),
  },

  // Pick List Items (Now links to specific LotItems)
  picklistItems: {
    getAll: () => supabase.from('picklist_items').select(`
      *,
      sales_orders:order_id(order_id, order_date, status),
      lot_items:lot_item_id(
        lot_item_id, 
        current_total_kg,
        lots:lot_id(lot_id, lot_number),
        products:product_id(product_id, product_name),
        warehouses:warehouse_id(warehouse_id, warehouse_name)
      )
    `).order('created_at', { ascending: false }),
    getBySalesOrderId: (orderId) => supabase.from('picklist_items').select(`
      *,
      lot_items:lot_item_id(
        lot_item_id,
        current_total_kg,
        lots:lot_id(lot_id, lot_number),
        products:product_id(product_id, product_name),
        warehouses:warehouse_id(warehouse_id, warehouse_name)
      )
    `).eq('order_id', orderId),
    create: (item) => supabase.from('picklist_items').insert(item).select().single(),
    update: (picklistItemId, updates) => supabase.from('picklist_items').update(updates).eq('picklist_item_id', picklistItemId).select().single(),
    delete: (picklistItemId) => supabase.from('picklist_items').delete().eq('picklist_item_id', picklistItemId),
    getPackingQueue: () => supabase.from('picklist_items').select(`
      *,
      sales_orders:order_id(
        order_id, 
        order_date,
        customers:customer_id(customer_id, company_name, contact_person_name)
      ),
      lot_items:lot_item_id(
        lot_item_id,
        current_total_kg,
        lots:lot_id(lot_id, lot_number, farmers:farmer_id(farmer_id, auction_name)),
        products:product_id(product_id, product_name),
        warehouses:warehouse_id(warehouse_id, warehouse_name)
      )
    `).eq('status', 'To Be Packed').order('created_at'),
  },

  // Dispatch Confirmations
  dispatchConfirmations: {
    getAll: () => supabase.from('dispatch_confirmations').select(`
      *,
      picklist_items:picklist_item_id(*)
    `).order('created_at', { ascending: false }),
    create: (confirmation) => supabase.from('dispatch_confirmations').insert(confirmation).select().single(),
    update: (dispatchId, updates) => supabase.from('dispatch_confirmations').update(updates).eq('dispatch_id', dispatchId).select().single(),
    delete: (dispatchId) => supabase.from('dispatch_confirmations').delete().eq('dispatch_id', dispatchId),
  },

  // Sales Payments
  salesPayments: {
    getAll: () => supabase.from('sales_payments').select(`
      *,
      sales_orders:order_id(order_id, order_date)
    `).order('created_at', { ascending: false }),
    getByOrderId: (orderId) => supabase.from('sales_payments').select('*').eq('order_id', orderId).order('created_at', { ascending: false }),
    create: (payment) => supabase.from('sales_payments').insert(payment).select().single(),
    update: (paymentId, updates) => supabase.from('sales_payments').update(updates).eq('payment_id', paymentId).select().single(),
    delete: (paymentId) => supabase.from('sales_payments').delete().eq('payment_id', paymentId),
  },

  // Settings/Meta
  settings: {
    get: () => supabase.from('settings').select('*').limit(1).single(),
    upsert: (settings) => supabase.from('settings').upsert(settings).select().single(),
    getByKey: (key) => supabase.from('settings').select('*').eq('setting_key', key).single(),
  },

  // Complex queries for business operations
  queries: {
    // Get complete lot information with all items
    getLotWithItems: (lotId) => supabase.from('lots').select(`
      *,
      farmers:farmer_id(farmer_id, auction_name, billing_name),
      lot_items:lot_id(
        *,
        products:product_id(product_id, product_name),
        warehouses:warehouse_id(warehouse_id, warehouse_name)
      ),
      purchase_payments:lot_id(*)
    `).eq('lot_id', lotId).single(),

    // Get sales order with all items and inventory details
    getSalesOrderWithItems: (orderId) => supabase.from('sales_orders').select(`
      *,
      customers:customer_id(customer_id, company_name, contact_person_name, bag_marking),
      picklist_items:order_id(
        *,
        lot_items:lot_item_id(
          *,
          lots:lot_id(lot_id, lot_number),
          products:product_id(product_id, product_name),
          warehouses:warehouse_id(warehouse_id, warehouse_name)
        )
      ),
      sales_payments:order_id(*)
    `).eq('order_id', orderId).single(),

    // Get inventory summary by product
    getInventorySummary: () => supabase.from('lot_items').select(`
      product_id,
      products:product_id(product_id, product_name),
      current_total_kg.sum(),
      purchase_rate_per_kg.avg()
    `).gt('current_total_kg', 0).group('product_id'),

    // Get farmer purchase summary
    getFarmerPurchaseSummary: () => supabase.rpc('get_farmer_purchase_summary'),

    // Get customer sales summary
    getCustomerSalesSummary: () => supabase.rpc('get_customer_sales_summary'),
  },
}

// Real-time subscriptions helper for enhanced schema
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

// Subscribe to multiple related tables for complete lot tracking
export const subscribeToLotChanges = (callback) => {
  return supabase
    .channel('lot_tracking')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lots' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lot_items' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_payments' }, callback)
    .subscribe()
}

// Subscribe to sales order changes
export const subscribeToSalesChanges = (callback) => {
  return supabase
    .channel('sales_tracking')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_orders' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'picklist_items' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_confirmations' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_payments' }, callback)
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