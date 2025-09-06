import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import { db, handleSupabaseError } from '../lib/supabase'

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
  loading: false,
  
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
      set({ loading: true })
      
      // Load all data in parallel
      const [productsRes, farmersRes, customersRes, warehousesRes] = await Promise.all([
        db.products.getAll(),
        db.farmers.getAll(),
        db.customers.getAll(),
        db.warehouses.getAll(),
      ])
      
      // Load operational data
      const [lotsRes, lotProductsRes, purchasePaymentsRes, salesOrdersRes, pickListItemsRes] = await Promise.all([
        db.lots.getAll(),
        db.lotProducts.getAll(),
        db.purchasePayments.getAll(),
        db.salesOrders.getAll(),
        db.pickListItems.getAll(),
      ])
      
      // Update store with data, mapping database field names to frontend field names
      set({
        products: productsRes.data || [],
        farmers: farmersRes.data || [],
        customers: customersRes.data || [],
        warehouses: warehousesRes.data || [],
        lots: (lotsRes.data || []).map(lot => ({
          ...lot,
          lotNumber: lot.lot_number,
          farmerId: lot.farmer_id,
          warehouseId: lot.warehouse_id,
          purchaseDate: lot.purchase_date,
          bayNumber: lot.bay_number,
          totalPurchaseValue: lot.total_purchase_value,
          createdAt: lot.created_at,
        })),
        lotProducts: (lotProductsRes.data || []).map(lp => ({
          ...lp,
          lotId: lp.lot_id,
          productId: lp.product_id,
          numBags: lp.num_bags,
          looseKg: lp.loose_kg,
          sippamKg: lp.sippam_kg,
          purchaseRate: lp.purchase_rate,
          initialTotalKg: lp.initial_total_kg,
          currentTotalKg: lp.current_total_kg,
          productValue: lp.product_value,
        })),
        purchasePayments: (purchasePaymentsRes.data || []).map(pp => ({
          ...pp,
          lotId: pp.lot_id,
          paymentDate: pp.payment_date,
          createdAt: pp.created_at,
        })),
        salesOrders: (salesOrdersRes.data || []).map(so => ({
          ...so,
          customerId: so.customer_id,
          orderDate: so.order_date,
          createdAt: so.created_at,
        })),
        pickListItems: (pickListItemsRes.data || []).map(pli => ({
          ...pli,
          salesOrderId: pli.sales_order_id,
          lotId: pli.lot_id,
          lotProductId: pli.lot_product_id,
          customerMark: pli.customer_mark,
          plannedBags: pli.planned_bags,
          plannedLooseKg: pli.planned_loose_kg,
          saleRate: pli.sale_rate,
          packagingType: pli.packaging_type,
          actualBags: pli.actual_bags,
          actualLooseKg: pli.actual_loose_kg,
          actualTotalKg: pli.actual_total_kg,
        })),
        initialized: true,
        loading: false,
      })
      
    } catch (error) {
      console.error('Store initialization error:', error)
      set({ 
        errors: { initialization: handleSupabaseError(error, 'initialization') },
        loading: false,
      })
    }
  },

  // =============================================================================
  // GENERIC CRUD OPERATIONS
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
  
  updateItem: async (key, id, patch) => {
    try {
      const result = await db[key].update(id, patch)
      if (result.error) throw result.error
      
      const currentItems = get()[key]
      set({ 
        [key]: currentItems.map(item => 
          item.id === id ? { ...item, ...result.data } : item
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
  
  removeItem: async (key, id) => {
    try {
      const result = await db[key].delete(id)
      if (result.error) throw result.error
      
      const currentItems = get()[key]
      set({ [key]: currentItems.filter(item => item.id !== id) })
      
    } catch (error) {
      set({ 
        errors: { ...get().errors, [key]: handleSupabaseError(error, `removing ${key}`) }
      })
      throw error
    }
  },

  // =============================================================================
  // DOMAIN-SPECIFIC OPERATIONS
  // =============================================================================
  
  // Lot operations
  addLot: async (lotData) => {
    try {
      // Check for duplicate lot number
      const existingCheck = await db.lots.getByNumber(lotData.lotNumber)
      if (existingCheck.data && existingCheck.data.length > 0) {
        throw new Error(`Lot number '${lotData.lotNumber}' already exists. Please use a unique lot number.`)
      }
      
      // Calculate total purchase value
      let totalPurchaseValue = 0
      const productsToCreate = []
      
      if (lotData.products && lotData.products.length > 0) {
        lotData.products.forEach(product => {
          const sippamKg = Number(product.sippamKg || get().meta.sippamKgDefault || 30)
          const initialTotalKg = Number(product.numBags || 0) * sippamKg + Number(product.looseKg || 0)
          const productValue = initialTotalKg * Number(product.purchaseRate || 0)
          totalPurchaseValue += productValue
          
          productsToCreate.push({
            product_id: product.productId,
            num_bags: Number(product.numBags || 0),
            loose_kg: Number(product.looseKg || 0),
            sippam_kg: sippamKg,
            purchase_rate: Number(product.purchaseRate || 0),
            current_total_kg: initialTotalKg,
          })
        })
      }
      
      // Create lot record
      const lotRecord = {
        lot_number: lotData.lotNumber,
        farmer_id: lotData.farmerId,
        warehouse_id: lotData.warehouseId,
        purchase_date: lotData.purchaseDate,
        bay_number: lotData.bayNumber,
        total_purchase_value: totalPurchaseValue,
      }
      
      const lotResult = await db.lots.create(lotRecord)
      if (lotResult.error) throw lotResult.error
      
      // Create lot products
      if (productsToCreate.length > 0) {
        const lotProductsWithLotId = productsToCreate.map(product => ({
          ...product,
          lot_id: lotResult.data.id,
        }))
        
        const lotProductsResult = await db.lotProducts.bulkCreate(lotProductsWithLotId)
        if (lotProductsResult.error) throw lotProductsResult.error
        
        // Update local state
        const currentLotProducts = get().lotProducts
        const newLotProducts = (lotProductsResult.data || []).map(lp => ({
          ...lp,
          lotId: lp.lot_id,
          productId: lp.product_id,
          numBags: lp.num_bags,
          looseKg: lp.loose_kg,
          sippamKg: lp.sippam_kg,
          purchaseRate: lp.purchase_rate,
          initialTotalKg: lp.initial_total_kg,
          currentTotalKg: lp.current_total_kg,
          productValue: lp.product_value,
        }))
        
        set({ lotProducts: [...currentLotProducts, ...newLotProducts] })
      }
      
      // Update lots in state
      const currentLots = get().lots
      const newLot = {
        ...lotResult.data,
        lotNumber: lotResult.data.lot_number,
        farmerId: lotResult.data.farmer_id,
        warehouseId: lotResult.data.warehouse_id,
        purchaseDate: lotResult.data.purchase_date,
        bayNumber: lotResult.data.bay_number,
        totalPurchaseValue: lotResult.data.total_purchase_value,
        createdAt: lotResult.data.created_at,
      }
      set({ lots: [...currentLots, newLot] })
      
      return newLot
      
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
        lot_id: payment.lotId,
        amount: Number(payment.amount || 0),
        payment_date: payment.paymentDate,
        method: payment.method,
        reference: payment.reference,
      }
      
      const result = await db.purchasePayments.create(paymentData)
      if (result.error) throw result.error
      
      const currentPayments = get().purchasePayments
      const newPayment = {
        ...result.data,
        lotId: result.data.lot_id,
        paymentDate: result.data.payment_date,
        createdAt: result.data.created_at,
      }
      set({ purchasePayments: [...currentPayments, newPayment] })
      
      return newPayment
      
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
        customer_id: so.customerId,
        order_date: so.orderDate,
        notes: so.notes || '',
      }
      
      const result = await db.salesOrders.create(orderData)
      if (result.error) throw result.error
      
      const currentOrders = get().salesOrders
      const newOrder = {
        ...result.data,
        customerId: result.data.customer_id,
        orderDate: result.data.order_date,
        createdAt: result.data.created_at,
      }
      set({ salesOrders: [...currentOrders, newOrder] })
      
      return newOrder
      
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
        sales_order_id: pi.salesOrderId,
        lot_id: pi.lotId,
        lot_product_id: pi.lotProductId,
        customer_mark: pi.customerMark || '',
        planned_bags: Number(pi.plannedBags || 0),
        planned_loose_kg: Number(pi.plannedLooseKg || 0),
        sale_rate: Number(pi.saleRate || 0),
        packaging_type: pi.packagingType || 'Bag',
      }
      
      const result = await db.pickListItems.create(itemData)
      if (result.error) throw result.error
      
      // Update sales order status
      await get().updateSalesOrderStatus(pi.salesOrderId, 'Packing in Progress')
      
      const currentItems = get().pickListItems
      const newItem = {
        ...result.data,
        salesOrderId: result.data.sales_order_id,
        lotId: result.data.lot_id,
        lotProductId: result.data.lot_product_id,
        customerMark: result.data.customer_mark,
        plannedBags: result.data.planned_bags,
        plannedLooseKg: result.data.planned_loose_kg,
        saleRate: result.data.sale_rate,
        packagingType: result.data.packaging_type,
      }
      set({ pickListItems: [...currentItems, newItem] })
      
      return newItem
      
    } catch (error) {
      set({ 
        errors: { ...get().errors, pickListItems: handleSupabaseError(error, 'adding pick item') }
      })
      throw error
    }
  },

  confirmPack: async ({ pickItemId, actualBags, actualLooseKg }) => {
    try {
      const pi = get().pickListItems.find(p => p.id === pickItemId)
      if (!pi) throw new Error('Pick item not found')
      
      const lotProduct = get().lotProducts.find(lp => lp.id === pi.lotProductId)
      if (!lotProduct) throw new Error('Lot product not found')
      
      const sippamKg = Number(lotProduct.sippamKg || get().meta.sippamKgDefault || 30)
      const actualTotalKg = Number(actualBags || 0) * sippamKg + Number(actualLooseKg || 0)
      
      // Update lot product quantity
      const newCurrentKg = Math.max(0, lotProduct.currentTotalKg - actualTotalKg)
      await db.lotProducts.update(lotProduct.id, { current_total_kg: newCurrentKg })
      
      // Update pick item status
      await db.pickListItems.update(pickItemId, {
        status: 'Packed',
        actual_bags: Number(actualBags || 0),
        actual_loose_kg: Number(actualLooseKg || 0),
        actual_total_kg: actualTotalKg,
      })
      
      // Update local state
      const currentLotProducts = get().lotProducts
      set({
        lotProducts: currentLotProducts.map(lp => 
          lp.id === lotProduct.id ? { ...lp, currentTotalKg: newCurrentKg } : lp
        )
      })
      
      const currentPickItems = get().pickListItems
      set({
        pickListItems: currentPickItems.map(p => 
          p.id === pickItemId ? { 
            ...p, 
            status: 'Packed',
            actualBags: Number(actualBags || 0),
            actualLooseKg: Number(actualLooseKg || 0),
            actualTotalKg,
          } : p
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
        sales_order_id: payment.salesOrderId,
        amount: Number(payment.amount || 0),
        payment_date: payment.paymentDate,
        method: payment.method,
        reference: payment.reference,
      }
      
      const result = await db.salesPayments.create(paymentData)
      if (result.error) throw result.error
      
      const currentPayments = get().salesPayments
      const newPayment = {
        ...result.data,
        salesOrderId: result.data.sales_order_id,
        paymentDate: result.data.payment_date,
        createdAt: result.data.created_at,
      }
      set({ salesPayments: [...currentPayments, newPayment] })
      
      return newPayment
      
    } catch (error) {
      set({ 
        errors: { ...get().errors, salesPayments: handleSupabaseError(error, 'adding sales payment') }
      })
      throw error
    }
  },

  // Helper methods
  updateSalesOrderStatus: async (orderId, status) => {
    try {
      await db.salesOrders.update(orderId, { status })
      
      const currentOrders = get().salesOrders
      set({
        salesOrders: currentOrders.map(so => 
          so.id === orderId ? { ...so, status } : so
        )
      })
      
    } catch (error) {
      console.error('Error updating sales order status:', error)
    }
  },

  // Settings
  setMeta: async (patch) => {
    try {
      const currentMeta = get().meta
      const newMeta = { ...currentMeta, ...patch }
      
      await db.settings.upsert({
        sippam_kg_default: newMeta.sippamKgDefault,
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
}))