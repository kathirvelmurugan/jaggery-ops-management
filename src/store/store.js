import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { db, handleSupabaseError } from '../lib/supabase'

// Initial state structure for enhanced schema
const initialState = {
  // Meta/Settings
  meta: { sippamKgDefault: 30 },
  
  // User Management
  currentUser: null,
  users: [],
  
  // Master data (enhanced schema)
  products: [],
  warehouses: [],
  farmers: [],
  customers: [],
  
  // Operational data (normalized structure)
  lots: [], // Header records only
  lotItems: [], // Individual product items within lots
  purchasePayments: [],
  salesOrders: [],
  picklistItems: [], // Updated naming
  dispatchConfirmations: [],
  salesPayments: [],
  
  // Loading states
  loading: false,
  
  // Error handling
  errors: {},
  
  // Initialization flag
  initialized: false,
}

export const useStore = create((set, get) => ({
  ...initialState,

  // =============================================================================
  // USER MANAGEMENT AND AUTHENTICATION
  // =============================================================================
  
  // User roles: 'admin', 'manager', 'dispatch'
  setCurrentUser: (user) => {
    set({ currentUser: user })
  },
  
  // Check user permissions
  hasPermission: (permission) => {
    const user = get().currentUser
    if (!user) return false
    
    const permissions = {
      admin: ['read', 'write', 'delete', 'financial'],
      manager: ['read', 'write', 'financial'],
      dispatch: ['read', 'write']
    }
    
    return permissions[user.role]?.includes(permission) || false
  },
  
  // Quick role checks
  isAdmin: () => get().currentUser?.role === 'admin',
  isManager: () => get().currentUser?.role === 'manager',
  isDispatch: () => get().currentUser?.role === 'dispatch',
  
  // Can see financial data
  canViewFinancials: () => {
    const user = get().currentUser
    return user?.role === 'admin' || user?.role === 'manager'
  },
  
  // Can delete records
  canDelete: () => get().currentUser?.role === 'admin',
  
  // User management
  addUser: async (userData) => {
    try {
      const userRecord = {
        username: userData.username,
        full_name: userData.fullName,
        role: userData.role,
        email: userData.email,
        is_active: true,
        created_at: new Date().toISOString()
      }
      
      // For demo purposes, we'll store users in local storage
      // In production, this would be handled by proper authentication
      const users = get().users
      const newUser = { ...userRecord, user_id: Date.now().toString() }
      set({ users: [...users, newUser] })
      
      return newUser
      
    } catch (error) {
      console.error('Error adding user:', error)
      throw error
    }
  },
  
  // Initialize default users for demo
  initializeDefaultUsers: () => {
    const defaultUsers = [
      {
        user_id: '1',
        username: 'admin',
        full_name: 'System Administrator',
        role: 'admin',
        email: 'admin@jaggeryops.com',
        is_active: true
      },
      {
        user_id: '2', 
        username: 'manager',
        full_name: 'Operations Manager',
        role: 'manager',
        email: 'manager@jaggeryops.com',
        is_active: true
      },
      {
        user_id: '3',
        username: 'dispatch',
        full_name: 'Dispatch Officer',
        role: 'dispatch',
        email: 'dispatch@jaggeryops.com',
        is_active: true
      }
    ]
    
    set({ 
      users: defaultUsers,
      currentUser: defaultUsers[0] // Default to admin for demo
    })
  },
  
  // =============================================================================
  // INITIALIZATION AND DATA LOADING
  // =============================================================================
  
  initializeStore: async () => {
    try {
      set({ loading: true })
      
      // Initialize default users for demo
      get().initializeDefaultUsers()
      
      // Load all master data in parallel
      const [productsRes, farmersRes, customersRes, warehousesRes] = await Promise.all([
        db.products.getAll(),
        db.farmers.getAll(),
        db.customers.getAll(),
        db.warehouses.getAll(),
      ])
      
      // Load operational data
      const [lotsRes, lotItemsRes, purchasePaymentsRes, salesOrdersRes, picklistItemsRes] = await Promise.all([
        db.lots.getAll(),
        db.lotItems.getAll(),
        db.purchasePayments.getAll(),
        db.salesOrders.getAll(),
        db.picklistItems.getAll(),
      ])
      
      // Update store with enhanced schema data
      set({
        // Master data - direct mapping for enhanced schema
        products: productsRes.data || [],
        farmers: farmersRes.data || [],
        customers: customersRes.data || [],
        warehouses: warehousesRes.data || [],
        
        // Operational data - enhanced schema
        lots: lotsRes.data || [],
        lotItems: lotItemsRes.data || [],
        purchasePayments: purchasePaymentsRes.data || [],
        salesOrders: salesOrdersRes.data || [],
        picklistItems: picklistItemsRes.data || [],
        
        initialized: true,
        loading: false,
      })
      
      console.log('Store initialized successfully with user roles')
      
    } catch (error) {
      console.error('Store initialization error:', error)
      set({ 
        errors: { initialization: handleSupabaseError(error, 'initialization') },
        loading: false,
      })
    }
  },

  // =============================================================================
  // GENERIC CRUD OPERATIONS FOR ENHANCED SCHEMA
  // =============================================================================
  
  addItem: async (key, item) => {
    try {
      const result = await db[key].create(item)
      if (result.error) throw result.error
      
      const currentItems = get()[key]
      set({ [key]: [...currentItems, result.data] })
      return result.data
      
    } catch (error) {
      set({ 
        errors: { ...get().errors, [key]: handleSupabaseError(error, `adding ${key}`) }
      })
      throw error
    }
  },
  
  updateItem: async (key, idField, id, patch) => {
    try {
      // Map table keys to their corresponding update functions
      const updateFunctions = {
        products: (id, patch) => db.products.update(id, patch),
        farmers: (id, patch) => db.farmers.update(id, patch),
        customers: (id, patch) => db.customers.update(id, patch),
        warehouses: (id, patch) => db.warehouses.update(id, patch),
        lots: (id, patch) => db.lots.update(id, patch),
        lotItems: (id, patch) => db.lotItems.update(id, patch),
        purchasePayments: (id, patch) => db.purchasePayments.update(id, patch),
        salesOrders: (id, patch) => db.salesOrders.update(id, patch),
        picklistItems: (id, patch) => db.picklistItems.update(id, patch),
        salesPayments: (id, patch) => db.salesPayments.update(id, patch),
      }
      
      const updateFn = updateFunctions[key]
      if (!updateFn) throw new Error(`No update function for ${key}`)
      
      const result = await updateFn(id, patch)
      if (result.error) throw result.error
      
      const currentItems = get()[key]
      set({ 
        [key]: currentItems.map(item => 
          item[idField] === id ? { ...item, ...result.data } : item
        )
      })
      return result.data
      
    } catch (error) {
      set({ 
        errors: { ...get().errors, [key]: handleSupabaseError(error, `updating ${key}`) }
      })
      throw error
    }
  },
  
  removeItem: async (key, idField, id) => {
    try {
      // Map table keys to their corresponding delete functions
      const deleteFunctions = {
        products: (id) => db.products.delete(id),
        farmers: (id) => db.farmers.delete(id),
        customers: (id) => db.customers.delete(id),
        warehouses: (id) => db.warehouses.delete(id),
        lots: (id) => db.lots.delete(id),
        lotItems: (id) => db.lotItems.delete(id),
        purchasePayments: (id) => db.purchasePayments.delete(id),
        salesOrders: (id) => db.salesOrders.delete(id),
        picklistItems: (id) => db.picklistItems.delete(id),
        salesPayments: (id) => db.salesPayments.delete(id),
      }
      
      const deleteFn = deleteFunctions[key]
      if (!deleteFn) throw new Error(`No delete function for ${key}`)
      
      const result = await deleteFn(id)
      if (result.error) throw result.error
      
      const currentItems = get()[key]
      set({ [key]: currentItems.filter(item => item[idField] !== id) })
      
    } catch (error) {
      set({ 
        errors: { ...get().errors, [key]: handleSupabaseError(error, `removing ${key}`) }
      })
      throw error
    }
  },

  // =============================================================================
  // DOMAIN-SPECIFIC OPERATIONS FOR ENHANCED SCHEMA
  // =============================================================================
  
  // Lot operations with normalized structure
  addLot: async (lotData) => {
    try {
      // Check for duplicate lot number
      const existingCheck = await db.lots.getByNumber(lotData.lot_number)
      if (existingCheck.data && existingCheck.data.length > 0) {
        throw new Error(`Lot number '${lotData.lot_number}' already exists. Please use a unique lot number.`)
      }
      
      // Create lot header record (normalized structure)
      const lotRecord = {
        lot_number: lotData.lot_number,
        farmer_id: lotData.farmer_id,
        purchase_date: lotData.purchase_date,
      }
      
      const lotResult = await db.lots.create(lotRecord)
      if (lotResult.error) throw lotResult.error
      
      // Create lot items if provided
      if (lotData.lotItems && lotData.lotItems.length > 0) {
        const lotItemsWithLotId = lotData.lotItems.map(item => {
          const initialTotalKg = Number(item.initial_bags || 0) * 30 + Number(item.initial_loose_kg || 0)
          const totalPurchaseValue = initialTotalKg * Number(item.purchase_rate_per_kg || 0)
          
          return {
            lot_id: lotResult.data.lot_id,
            product_id: item.product_id,
            warehouse_id: item.warehouse_id,
            bay_number: item.bay_number || null,
            initial_bags: Number(item.initial_bags || 0),
            initial_loose_kg: Number(item.initial_loose_kg || 0),
            initial_total_kg: initialTotalKg,
            current_total_kg: initialTotalKg,
            purchase_rate_per_kg: Number(item.purchase_rate_per_kg || 0),
            total_purchase_value: totalPurchaseValue,
          }
        })
        
        const lotItemsResult = await db.lotItems.bulkCreate(lotItemsWithLotId)
        if (lotItemsResult.error) throw lotItemsResult.error
        
        // Update local state
        const currentLotItems = get().lotItems
        set({ lotItems: [...currentLotItems, ...(lotItemsResult.data || [])] })
      }
      
      // Update lots in state
      const currentLots = get().lots
      set({ lots: [...currentLots, lotResult.data] })
      
      return lotResult.data
      
    } catch (error) {
      set({ 
        errors: { ...get().errors, lots: handleSupabaseError(error, 'adding lot') }
      })
      throw error
    }
  },

  addPurchasePayment: async (payment) => {
    try {
      const paymentData = {
        lot_id: payment.lot_id,
        amount_paid: Number(payment.amount_paid || 0),
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        reference_details: payment.reference_details,
      }
      
      const result = await db.purchasePayments.create(paymentData)
      if (result.error) throw result.error
      
      const currentPayments = get().purchasePayments
      set({ purchasePayments: [...currentPayments, result.data] })
      
      return result.data
      
    } catch (error) {
      set({ 
        errors: { ...get().errors, purchasePayments: handleSupabaseError(error, 'adding purchase payment') }
      })
      throw error
    }
  },

  addSalesOrder: async (so) => {
    try {
      const orderData = {
        customer_id: so.customer_id,
        order_date: so.order_date,
        notes: so.notes || '',
      }
      
      const result = await db.salesOrders.create(orderData)
      if (result.error) throw result.error
      
      const currentOrders = get().salesOrders
      set({ salesOrders: [...currentOrders, result.data] })
      
      return result.data
      
    } catch (error) {
      set({ 
        errors: { ...get().errors, salesOrders: handleSupabaseError(error, 'adding sales order') }
      })
      throw error
    }
  },

  addPickItem: async (pi) => {
    try {
      const itemData = {
        order_id: pi.order_id,
        lot_item_id: pi.lot_item_id, // Now links to specific lot item
        customer_mark: pi.customer_mark,
        planned_bags: Number(pi.planned_bags || 0),
        planned_loose_kg: Number(pi.planned_loose_kg || 0),
        sale_rate_per_kg: Number(pi.sale_rate_per_kg || 0),
        packaging_type: pi.packaging_type || 'Bag',
      }
      
      const result = await db.picklistItems.create(itemData)
      if (result.error) throw result.error
      
      const currentItems = get().picklistItems
      set({ picklistItems: [...currentItems, result.data] })
      
      return result.data
      
    } catch (error) {
      set({ 
        errors: { ...get().errors, picklistItems: handleSupabaseError(error, 'adding pick item') }
      })
      throw error
    }
  },
  confirmPack: async ({ pickItemId, actualBags, actualLooseKg }) => {
    try {
      const pi = get().picklistItems.find(p => p.picklist_item_id === pickItemId)
      if (!pi) throw new Error('Pick item not found')
      
      const lotItem = get().lotItems.find(li => li.lot_item_id === pi.lot_item_id)
      if (!lotItem) throw new Error('Lot item not found')
      
      const sippamKg = 30 // Default sippam weight
      const actualTotalKg = Number(actualBags || 0) * sippamKg + Number(actualLooseKg || 0)
      
      // Update lot item quantity
      const newCurrentKg = Math.max(0, lotItem.current_total_kg - actualTotalKg)
      await db.lotItems.update(lotItem.lot_item_id, { current_total_kg: newCurrentKg })
      
      // Update pick item status
      await db.picklistItems.update(pickItemId, {
        status: 'Packed'
      })
      
      // Create dispatch confirmation
      await db.dispatchConfirmations.create({
        picklist_item_id: pickItemId,
        actual_bags: Number(actualBags || 0),
        actual_loose_kg: Number(actualLooseKg || 0),
        actual_total_kg: actualTotalKg,
      })
      
      // Update local state
      const currentLotItems = get().lotItems
      set({
        lotItems: currentLotItems.map(li => 
          li.lot_item_id === lotItem.lot_item_id ? { ...li, current_total_kg: newCurrentKg } : li
        )
      })
      
      const currentPickItems = get().picklistItems
      set({
        picklistItems: currentPickItems.map(p => 
          p.picklist_item_id === pickItemId ? { ...p, status: 'Packed' } : p
        )
      })
      
      return { success: true }
      
    } catch (error) {
      set({ 
        errors: { ...get().errors, confirmPack: handleSupabaseError(error, 'confirming pack') }
      })
      throw error
    }
  },

  addSalesPayment: async (payment) => {
    try {
      const paymentData = {
        order_id: payment.order_id,
        amount_paid: Number(payment.amount_paid || 0),
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        reference_details: payment.reference_details,
      }
      
      const result = await db.salesPayments.create(paymentData)
      if (result.error) throw result.error
      
      const currentPayments = get().salesPayments
      set({ salesPayments: [...currentPayments, result.data] })
      
      return result.data
      
    } catch (error) {
      set({ 
        errors: { ...get().errors, salesPayments: handleSupabaseError(error, 'adding sales payment') }
      })
      throw error
    }
  },

  // Helper methods for enhanced schema
  updateSalesOrderStatus: async (orderId, status) => {
    try {
      await db.salesOrders.update(orderId, { status })
      
      const currentOrders = get().salesOrders
      set({
        salesOrders: currentOrders.map(so => 
          so.order_id === orderId ? { ...so, status } : so
        )
      })
      
    } catch (error) {
      console.error('Error updating sales order status:', error)
    }
  },

  // Enhanced schema utility methods
  getLotWithItems: async (lotId) => {
    try {
      const result = await db.queries.getLotWithItems(lotId)
      if (result.error) throw result.error
      return result.data
    } catch (error) {
      console.error('Error getting lot with items:', error)
      throw error
    }
  },

  getAvailableInventory: async () => {
    try {
      const result = await db.lotItems.getAvailableInventory()
      if (result.error) throw result.error
      return result.data || []
    } catch (error) {
      console.error('Error getting available inventory:', error)
      throw error
    }
  },

  getPackingQueue: async () => {
    try {
      const result = await db.picklistItems.getPackingQueue()
      if (result.error) throw result.error
      return result.data || []
    } catch (error) {
      console.error('Error getting packing queue:', error)
      throw error
    }
  },

  // Settings for enhanced schema
  setMeta: async (patch) => {
    try {
      const currentMeta = get().meta
      const newMeta = { ...currentMeta, ...patch }
      
      await db.settings.upsert({
        setting_key: 'sippam_kg_default',
        setting_value: String(newMeta.sippamKgDefault),
        description: 'Default weight of one sippam/bag in kg'
      })
      
      set({ meta: newMeta })
      
    } catch (error) {
      set({ 
        errors: { ...get().errors, meta: handleSupabaseError(error, 'updating settings') }
      })
      throw error
    }
  },

  // Clear errors
  clearError: (key) => {
    const errors = { ...get().errors }
    delete errors[key]
    set({ errors })
  },

  // Reset store to initial state
  resetStore: () => {
    set(initialState)
  },
}))