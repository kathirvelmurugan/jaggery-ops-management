
import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { db, handleSupabaseError, subscribeToTable } from '../lib/supabase'

// Initial state structure
const initialState = {
  // Meta/Settings
  meta: { sippamKgDefault: 30 },
  
  // Master data
  products: [],
  warehouses: [],
  farmers: [],
  customers: [],
  
  // Operational data
  lots: [],
  lotProducts: [],
  purchasePayments: [],
  salesOrders: [],
  pickListItems: [],
  dispatchConfirmations: [],
  salesPayments: [],
  
  // Loading states
  loading: {
    products: false,
    farmers: false,
    customers: false,
    warehouses: false,
    lots: false,
    lotProducts: false,
    purchasePayments: false,
    salesOrders: false,
    pickListItems: false,
    dispatchConfirmations: false,
    salesPayments: false,
  },
  
  // Error handling
  errors: {},
  
  // Initialization flag
  initialized: false,
}

export const useStore = create((set, get) => ({
  ...initialState,

  // =============================================================================
  // INITIALIZATION AND DATA LOADING
  // =============================================================================
  
  initializeStore: async () => {
    try {
      set({ loading: { ...get().loading, initialization: true } })
      
      // Load all data in parallel
      const [productsRes, farmersRes, customersRes, warehousesRes, settingsRes] = await Promise.all([
        db.products.getAll(),
        db.farmers.getAll(),
        db.customers.getAll(),
        db.warehouses.getAll(),
        db.settings.get(),
      ])
      
      // Handle results
      const products = productsRes.data || []
      const farmers = farmersRes.data || []
      const customers = customersRes.data || []
      const warehouses = warehousesRes.data || []
      const settings = settingsRes.data
      
      // Load operational data
      const [lotsRes, lotProductsRes, purchasePaymentsRes, salesOrdersRes, pickListItemsRes, salesPaymentsRes, dispatchConfirmationsRes] = await Promise.all([
        db.lots.getAll(),
        db.lotProducts.getAll(),
        db.purchasePayments.getAll(),
        db.salesOrders.getAll(),
        db.pickListItems.getAll(),
        db.salesPayments.getAll(),
        db.dispatchConfirmations.getAll(),
      ])
      
      const lots = lotsRes.data || []
      const lotProducts = lotProductsRes.data || []
      const purchasePayments = purchasePaymentsRes.data || []
      const salesOrders = salesOrdersRes.data || []
      const pickListItems = pickListItemsRes.data || []
      const salesPayments = salesPaymentsRes.data || []
      const dispatchConfirmations = dispatchConfirmationsRes.data || []
      
      // Update store
      set({
        products,
        farmers,
        customers,
        warehouses,
        lots,
        lotProducts,
        purchasePayments,
        salesOrders,
        pickListItems,
        salesPayments,
        dispatchConfirmations,
        meta: {
          sippamKgDefault: settings?.sippam_kg_default || 30,
        },
        initialized: true,
        loading: { ...initialState.loading },
      })
      
    } catch (error) {
      console.error('Store initialization error:', error)
      set({ 
        errors: { initialization: handleSupabaseError(error, 'initialization') },
        loading: { ...initialState.loading },
      })
    }
  },

  // =============================================================================
  // GENERIC CRUD OPERATIONS
  // =============================================================================
  
  addItem: async (key, item) => {
    try {
      set({ loading: { ...get().loading, [key]: true } })
      
      const result = await db[key].create(item)
      
      if (result.error) throw result.error
      
      // Update local state
      const currentItems = get()[key]
      set({ [key]: [...currentItems, result.data] })
      
      set({ loading: { ...get().loading, [key]: false } })
      return result.data
      
    } catch (error) {
      set({ 
        loading: { ...get().loading, [key]: false },
        errors: { ...get().errors, [key]: handleSupabaseError(error, `adding ${key}`) }
      })
      throw error
    }
  },
  
  updateItem: async (key, id, patch) => {
    try {
      set({ loading: { ...get().loading, [key]: true } })
      
      const result = await db[key].update(id, patch)
      
      if (result.error) throw result.error
      
      // Update local state
      const currentItems = get()[key]
      set({ 
        [key]: currentItems.map(item => 
          item.id === id ? { ...item, ...result.data } : item
        )
      })
      
      set({ loading: { ...get().loading, [key]: false } })
      return result.data
      
    } catch (error) {
      set({ 
        loading: { ...get().loading, [key]: false },
        errors: { ...get().errors, [key]: handleSupabaseError(error, `updating ${key}`) }
      })
      throw error
    }
  },
  
  removeItem: async (key, id) => {
    try {
      set({ loading: { ...get().loading, [key]: true } })
      
      const result = await db[key].delete(id)
      
      if (result.error) throw result.error
      
      // Update local state
      const currentItems = get()[key]
      set({ [key]: currentItems.filter(item => item.id !== id) })
      
      set({ loading: { ...get().loading, [key]: false } })
      
    } catch (error) {
      set({ 
        loading: { ...get().loading, [key]: false },
        errors: { ...get().errors, [key]: handleSupabaseError(error, `removing ${key}`) }
      })
      throw error
    }
  },

  // Domain helpers
  addLot: (lotData) => set((state) => {
    const lotId = uuid()
    
    // Create the main lot record (without product-specific data)
    const lotRecord = {
      id: lotId,
      purchaseDate: lotData.purchaseDate,
      farmerId: lotData.farmerId,
      lotNumber: lotData.lotNumber,
      warehouseId: lotData.warehouseId,
      bayNumber: lotData.bayNumber,
      status: 'Available',
      totalPurchaseValue: 0, // Will be calculated from products
      createdAt: new Date().toISOString()
    }
    
    // Create lot-product records
    const newLotProducts = []
    let totalPurchaseValue = 0
    
    if (lotData.products && lotData.products.length > 0) {
      // Multi-product lot
      lotData.products.forEach(product => {
        const sippamKg = Number(product.sippamKg || state.meta.sippamKgDefault || 30)
        const initialTotalKg = Number(product.numBags || 0) * sippamKg + Number(product.looseKg || 0)
        const productValue = initialTotalKg * Number(product.purchaseRate || 0)
        totalPurchaseValue += productValue
        
        newLotProducts.push({
          id: uuid(),
          lotId,
          productId: product.productId,
          numBags: Number(product.numBags || 0),
          looseKg: Number(product.looseKg || 0),
          sippamKg,
          purchaseRate: Number(product.purchaseRate || 0),
          initialTotalKg,
          currentTotalKg: initialTotalKg,
          productValue,
          status: 'Available'
        })
      })
    } else {
      // Single product lot (backward compatibility)
      const sippamKg = Number(lotData.sippamKg || state.meta.sippamKgDefault || 30)
      const initialTotalKg = Number(lotData.numBags || 0) * sippamKg + Number(lotData.looseKg || 0)
      const productValue = initialTotalKg * Number(lotData.purchaseRate || 0)
      totalPurchaseValue = productValue
      
      newLotProducts.push({
        id: uuid(),
        lotId,
        productId: lotData.productId,
        numBags: Number(lotData.numBags || 0),
        looseKg: Number(lotData.looseKg || 0),
        sippamKg,
        purchaseRate: Number(lotData.purchaseRate || 0),
        initialTotalKg,
        currentTotalKg: initialTotalKg,
        productValue,
        status: 'Available'
      })
    }
    
    lotRecord.totalPurchaseValue = totalPurchaseValue
    
    const lots = [...state.lots, lotRecord]
    const lotProducts = [...state.lotProducts, ...newLotProducts]
    const next = { ...state, lots, lotProducts }
    save(next)
    return next
  }),

  addPurchasePayment: (payment) => set((state) => {
    const id = uuid()
    const record = { id, ...payment, amount: Number(payment.amount||0), createdAt: new Date().toISOString() }
    const purchasePayments = [...state.purchasePayments, record]
    const next = { ...state, purchasePayments }
    save(next)
    return next
  }),

  addSalesOrder: (so) => set((state) => {
    const id = uuid()
    const record = {
      id,
      orderDate: so.orderDate,
      customerId: so.customerId,
      status: 'Draft',
      notes: so.notes || ''
    }
    const salesOrders = [...state.salesOrders, record]
    const next = { ...state, salesOrders }
    save(next)
    return next
  }),

  addPickItem: (pi) => set((state) => {
    const id = uuid()
    const record = {
      id,
      salesOrderId: pi.salesOrderId,
      lotId: pi.lotId,
      lotProductId: pi.lotProductId, // New field to specify which product in the lot
      customerMark: pi.customerMark || '',
      plannedBags: Number(pi.plannedBags||0),
      plannedLooseKg: Number(pi.plannedLooseKg||0),
      saleRate: Number(pi.saleRate||0),
      packagingType: pi.packagingType || 'Bag',
      status: 'To Be Packed'
    }
    const pickListItems = [...state.pickListItems, record]
    // update SO status
    const salesOrders = state.salesOrders.map(so => so.id===pi.salesOrderId ? { ...so, status: 'Packing in Progress' } : so)
    const next = { ...state, pickListItems, salesOrders }
    save(next)
    return next
  }),

  confirmPack: ({ pickItemId, actualBags, actualLooseKg }) => set((state) => {
    const pi = state.pickListItems.find(p => p.id === pickItemId)
    if(!pi) return state
    
    const lotProduct = state.lotProducts.find(lp => lp.id === pi.lotProductId)
    if(!lotProduct) return state
    
    const sippamKg = Number(lotProduct.sippamKg || state.meta.sippamKgDefault || 30)
    const actual_total_kg = Number(actualBags||0) * sippamKg + Number(actualLooseKg||0)

    // Deduct from lot product
    const lotProducts = state.lotProducts.map(lp => 
      lp.id === lotProduct.id ? 
        { ...lp, currentTotalKg: Math.max(0, (lp.currentTotalKg - actual_total_kg)) } : 
        lp
    )

    // Create dispatch confirmation
    const dc = {
      id: uuid(),
      pickItemId,
      actualBags: Number(actualBags||0),
      actualLooseKg: Number(actualLooseKg||0),
      actual_total_kg,
      createdAt: new Date().toISOString()
    }
    const dispatchConfirmations = [...state.dispatchConfirmations, dc]

    // Update pick item status
    const pickListItems = state.pickListItems.map(p => 
      p.id===pickItemId ? 
        { ...p, status: 'Packed', actualBags: dc.actualBags, actualLooseKg: dc.actualLooseKg, actual_total_kg: dc.actual_total_kg } : 
        p
    )

    // Maybe update SO status to 'Packed' if all items packed
    const soItem = state.salesOrders.find(so => so.id === pi.salesOrderId)
    let salesOrders = state.salesOrders
    if(soItem){
      const itemsForSO = pickListItems.filter(p => p.salesOrderId === soItem.id)
      const allPacked = itemsForSO.length>0 && itemsForSO.every(p => p.status === 'Packed')
      salesOrders = salesOrders.map(s => s.id===soItem.id ? { ...s, status: allPacked ? 'Packed' : s.status } : s)
    }

    const next = { ...state, lotProducts, dispatchConfirmations, pickListItems, salesOrders }
    save(next)
    return next
  }),

  addSalesPayment: (payment) => set((state) => {
    const id = uuid()
    const record = { id, ...payment, amount: Number(payment.amount||0), createdAt: new Date().toISOString() }
    const salesPayments = [...state.salesPayments, record]
    const next = { ...state, salesPayments }
    save(next)
    return next
  }),
}))
