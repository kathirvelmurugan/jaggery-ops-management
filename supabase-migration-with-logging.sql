-- =============================================================================
-- JAGGERY OMS – ROBUST MIGRATION WITH COMPREHENSIVE LOGGING
-- Handles existing tables safely and provides detailed migration logs
-- =============================================================================

-- Create logging table first (if it doesn't exist)
CREATE TABLE IF NOT EXISTS migration_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    operation VARCHAR(100),
    table_name VARCHAR(100),
    status VARCHAR(20), -- SUCCESS, ERROR, INFO
    message TEXT,
    error_details TEXT
);

-- Function to log migration steps
CREATE OR REPLACE FUNCTION log_migration_step(
    p_operation VARCHAR(100),
    p_table_name VARCHAR(100) DEFAULT NULL,
    p_status VARCHAR(20) DEFAULT 'INFO',
    p_message TEXT DEFAULT NULL,
    p_error_details TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO migration_logs (operation, table_name, status, message, error_details)
    VALUES (p_operation, p_table_name, p_status, p_message, p_error_details);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MIGRATION START
-- =============================================================================
SELECT log_migration_step('MIGRATION_START', NULL, 'INFO', 'Starting Jaggery OMS Enhanced Schema Migration', NULL);

-- 0) EXTENSIONS
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    PERFORM log_migration_step('CREATE_EXTENSION', 'uuid-ossp', 'SUCCESS', 'UUID extension enabled', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_EXTENSION', 'uuid-ossp', 'ERROR', 'Failed to create extension', SQLERRM);
END $$;

-- =============================================================================
-- 1) SAFE TABLE DROPPING WITH LOGGING
-- =============================================================================
DO $$
DECLARE
    table_list TEXT[] := ARRAY[
        'dispatch_confirmations',
        'picklist_items', 
        'pick_list_items',
        'sales_payments',
        'sales_orders',
        'purchase_payments',
        'lot_items',
        'lot_products',
        'lots',
        'users',
        'roles',
        'warehouses',
        'customers',
        'farmers',
        'products',
        'settings'
    ];
    table_name TEXT;
    table_exists BOOLEAN;
BEGIN
    FOREACH table_name IN ARRAY table_list
    LOOP
        -- Check if table exists
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = table_name
        ) INTO table_exists;
        
        IF table_exists THEN
            EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', table_name);
            PERFORM log_migration_step('DROP_TABLE', table_name, 'SUCCESS', 'Table dropped successfully', NULL);
        ELSE
            PERFORM log_migration_step('DROP_TABLE', table_name, 'INFO', 'Table did not exist, skipping', NULL);
        END IF;
    END LOOP;
    
    -- Drop old functions
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    PERFORM log_migration_step('DROP_FUNCTION', 'update_updated_at_column', 'SUCCESS', 'Function dropped successfully', NULL);
    
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('DROP_TABLES', NULL, 'ERROR', 'Error during table dropping phase', SQLERRM);
    RAISE;
END $$;

-- =============================================================================
-- 2) CREATE MASTER DATA TABLES WITH LOGGING
-- =============================================================================

-- Products Table
DO $$
BEGIN
    CREATE TABLE products (
        product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_name VARCHAR(100) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    PERFORM log_migration_step('CREATE_TABLE', 'products', 'SUCCESS', 'Products table created successfully', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_TABLE', 'products', 'ERROR', 'Failed to create products table', SQLERRM);
    RAISE;
END $$;

-- Farmers Table
DO $$
BEGIN
    CREATE TABLE farmers (
        farmer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        auction_name VARCHAR(100) NOT NULL,
        billing_name VARCHAR(100) NOT NULL,
        contact_person_name VARCHAR(100),
        address TEXT,
        pincode VARCHAR(10),
        mobile_primary VARCHAR(15),
        mobile_alternate VARCHAR(15),
        email VARCHAR(100),
        farmer_since_year INTEGER,
        location_link TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    PERFORM log_migration_step('CREATE_TABLE', 'farmers', 'SUCCESS', 'Farmers table created successfully', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_TABLE', 'farmers', 'ERROR', 'Failed to create farmers table', SQLERRM);
    RAISE;
END $$;

-- Customers Table
DO $$
BEGIN
    CREATE TABLE customers (
        customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_name VARCHAR(100) NOT NULL,
        contact_person_name VARCHAR(100),
        bag_marking VARCHAR(50),
        address TEXT,
        pincode VARCHAR(10),
        mobile_primary VARCHAR(15),
        mobile_alternate VARCHAR(15),
        email VARCHAR(100),
        customer_since_year INTEGER,
        location_link TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    PERFORM log_migration_step('CREATE_TABLE', 'customers', 'SUCCESS', 'Customers table created successfully', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_TABLE', 'customers', 'ERROR', 'Failed to create customers table', SQLERRM);
    RAISE;
END $$;

-- Warehouses Table
DO $$
BEGIN
    CREATE TABLE warehouses (
        warehouse_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        warehouse_name VARCHAR(100) NOT NULL UNIQUE,
        address TEXT,
        pincode VARCHAR(10),
        contact_person_name VARCHAR(100),
        contact_number VARCHAR(15),
        location_link TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    PERFORM log_migration_step('CREATE_TABLE', 'warehouses', 'SUCCESS', 'Warehouses table created successfully', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_TABLE', 'warehouses', 'ERROR', 'Failed to create warehouses table', SQLERRM);
    RAISE;
END $$;

-- Roles Table
DO $$
BEGIN
    CREATE TABLE roles (
        role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        role_name VARCHAR(50) NOT NULL UNIQUE CHECK (role_name IN ('admin','manager','dispatch')),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    PERFORM log_migration_step('CREATE_TABLE', 'roles', 'SUCCESS', 'Roles table created successfully', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_TABLE', 'roles', 'ERROR', 'Failed to create roles table', SQLERRM);
    RAISE;
END $$;

-- Users Table
DO $$
BEGIN
    CREATE TABLE users (
        user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    PERFORM log_migration_step('CREATE_TABLE', 'users', 'SUCCESS', 'Users table created successfully', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_TABLE', 'users', 'ERROR', 'Failed to create users table', SQLERRM);
    RAISE;
END $$;

-- =============================================================================
-- 3) CREATE TRANSACTIONAL TABLES WITH LOGGING
-- =============================================================================

-- Lots Table (Header)
DO $$
BEGIN
    CREATE TABLE lots (
        lot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        lot_number VARCHAR(50) NOT NULL UNIQUE,
        purchase_date DATE NOT NULL,
        farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    PERFORM log_migration_step('CREATE_TABLE', 'lots', 'SUCCESS', 'Lots table created successfully', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_TABLE', 'lots', 'ERROR', 'Failed to create lots table', SQLERRM);
    RAISE;
END $$;

-- Lot Items Table (Individual Products)
DO $$
BEGIN
    CREATE TABLE lot_items (
        lot_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        lot_id UUID NOT NULL REFERENCES lots(lot_id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
        warehouse_id UUID NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
        bay_number VARCHAR(20),
        
        -- Quantities
        initial_bags INTEGER DEFAULT 0 CHECK (initial_bags >= 0),
        initial_loose_kg DECIMAL(10,3) DEFAULT 0 CHECK (initial_loose_kg >= 0),
        initial_total_kg DECIMAL(10,3) NOT NULL CHECK (initial_total_kg >= 0),
        current_total_kg DECIMAL(10,3) NOT NULL CHECK (current_total_kg >= 0),
        
        -- Financials
        purchase_rate_per_kg DECIMAL(10,2) NOT NULL CHECK (purchase_rate_per_kg >= 0),
        total_purchase_value DECIMAL(15,2) NOT NULL CHECK (total_purchase_value >= 0),
        
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        CONSTRAINT lot_items_current_kg_max_check CHECK (current_total_kg <= initial_total_kg),
        UNIQUE (lot_id, product_id, warehouse_id, bay_number)
    );
    PERFORM log_migration_step('CREATE_TABLE', 'lot_items', 'SUCCESS', 'Lot Items table created successfully', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_TABLE', 'lot_items', 'ERROR', 'Failed to create lot_items table', SQLERRM);
    RAISE;
END $$;

-- Purchase Payments Table
DO $$
BEGIN
    CREATE TABLE purchase_payments (
        payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        lot_id UUID NOT NULL REFERENCES lots(lot_id) ON DELETE CASCADE,
        amount_paid DECIMAL(15,2) NOT NULL CHECK (amount_paid > 0),
        payment_date DATE NOT NULL,
        payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('Cash','RTGS','Cheque','UPI','NEFT')),
        reference_details TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    PERFORM log_migration_step('CREATE_TABLE', 'purchase_payments', 'SUCCESS', 'Purchase Payments table created successfully', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_TABLE', 'purchase_payments', 'ERROR', 'Failed to create purchase_payments table', SQLERRM);
    RAISE;
END $$;

-- Sales Orders Table
DO $$
BEGIN
    CREATE TABLE sales_orders (
        order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
        order_date DATE NOT NULL,
        status VARCHAR(30) DEFAULT 'Draft'
          CHECK (status IN ('Draft','Packing in Progress','Packed','Dispatched','Delivered','Cancelled')),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    PERFORM log_migration_step('CREATE_TABLE', 'sales_orders', 'SUCCESS', 'Sales Orders table created successfully', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_TABLE', 'sales_orders', 'ERROR', 'Failed to create sales_orders table', SQLERRM);
    RAISE;
END $$;

-- Picklist Items Table
DO $$
BEGIN
    CREATE TABLE picklist_items (
        picklist_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID NOT NULL REFERENCES sales_orders(order_id) ON DELETE CASCADE,
        lot_item_id UUID NOT NULL REFERENCES lot_items(lot_item_id) ON DELETE RESTRICT,
        customer_mark VARCHAR(100),
        planned_bags INTEGER DEFAULT 0 CHECK (planned_bags >= 0),
        planned_loose_kg DECIMAL(10,3) DEFAULT 0 CHECK (planned_loose_kg >= 0),
        sale_rate_per_kg DECIMAL(10,2) NOT NULL CHECK (sale_rate_per_kg >= 0),
        packaging_type VARCHAR(20) DEFAULT 'Bag' CHECK (packaging_type IN ('Bag','Box','Bulk')),
        status VARCHAR(20) DEFAULT 'To Be Packed' CHECK (status IN ('To Be Packed','Packed','Dispatched')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    PERFORM log_migration_step('CREATE_TABLE', 'picklist_items', 'SUCCESS', 'Picklist Items table created successfully', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_TABLE', 'picklist_items', 'ERROR', 'Failed to create picklist_items table', SQLERRM);
    RAISE;
END $$;

-- Dispatch Confirmations Table
DO $$
BEGIN
    CREATE TABLE dispatch_confirmations (
        dispatch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        picklist_item_id UUID NOT NULL REFERENCES picklist_items(picklist_item_id) ON DELETE CASCADE,
        actual_bags INTEGER NOT NULL CHECK (actual_bags >= 0),
        actual_loose_kg DECIMAL(10,3) NOT NULL CHECK (actual_loose_kg >= 0),
        actual_total_kg DECIMAL(10,3) NOT NULL CHECK (actual_total_kg >= 0),
        packed_by_user_id UUID REFERENCES users(user_id),
        confirmation_timestamp TIMESTAMPTZ DEFAULT NOW(),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    PERFORM log_migration_step('CREATE_TABLE', 'dispatch_confirmations', 'SUCCESS', 'Dispatch Confirmations table created successfully', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_TABLE', 'dispatch_confirmations', 'ERROR', 'Failed to create dispatch_confirmations table', SQLERRM);
    RAISE;
END $$;

-- Sales Payments Table
DO $$
BEGIN
    CREATE TABLE sales_payments (
        payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID NOT NULL REFERENCES sales_orders(order_id) ON DELETE CASCADE,
        amount_paid DECIMAL(15,2) NOT NULL CHECK (amount_paid > 0),
        payment_date DATE NOT NULL,
        payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('Cash','RTGS','Cheque','UPI','NEFT')),
        reference_details TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    PERFORM log_migration_step('CREATE_TABLE', 'sales_payments', 'SUCCESS', 'Sales Payments table created successfully', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_TABLE', 'sales_payments', 'ERROR', 'Failed to create sales_payments table', SQLERRM);
    RAISE;
END $$;

-- Settings Table
DO $$
BEGIN
    CREATE TABLE settings (
        setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        setting_key VARCHAR(50) NOT NULL UNIQUE,
        setting_value TEXT,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    PERFORM log_migration_step('CREATE_TABLE', 'settings', 'SUCCESS', 'Settings table created successfully', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_TABLE', 'settings', 'ERROR', 'Failed to create settings table', SQLERRM);
    RAISE;
END $$;

-- =============================================================================
-- 4) CREATE INDEXES WITH LOGGING
-- =============================================================================
DO $$
DECLARE
    index_list TEXT[] := ARRAY[
        'CREATE INDEX idx_lots_farmer_id ON lots(farmer_id)',
        'CREATE INDEX idx_lots_purchase_date ON lots(purchase_date)',
        'CREATE INDEX idx_lots_lot_number ON lots(lot_number)',
        'CREATE INDEX idx_lot_items_lot_id ON lot_items(lot_id)',
        'CREATE INDEX idx_lot_items_product_id ON lot_items(product_id)',
        'CREATE INDEX idx_lot_items_warehouse_id ON lot_items(warehouse_id)',
        'CREATE INDEX idx_lot_items_current_kg ON lot_items(current_total_kg) WHERE current_total_kg > 0',
        'CREATE INDEX idx_purchase_payments_lot ON purchase_payments(lot_id)',
        'CREATE INDEX idx_purchase_payments_date ON purchase_payments(payment_date)',
        'CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id)',
        'CREATE INDEX idx_sales_orders_date ON sales_orders(order_date)',
        'CREATE INDEX idx_sales_orders_status ON sales_orders(status)',
        'CREATE INDEX idx_picklist_items_order ON picklist_items(order_id)',
        'CREATE INDEX idx_picklist_items_lotitem ON picklist_items(lot_item_id)',
        'CREATE INDEX idx_picklist_items_status ON picklist_items(status)',
        'CREATE INDEX idx_sales_payments_order ON sales_payments(order_id)',
        'CREATE INDEX idx_sales_payments_date ON sales_payments(payment_date)'
    ];
    index_sql TEXT;
    index_name TEXT;
BEGIN
    FOREACH index_sql IN ARRAY index_list
    LOOP
        -- Extract index name for logging
        index_name := split_part(split_part(index_sql, ' ', 3), ' ', 1);
        
        EXECUTE index_sql;
        PERFORM log_migration_step('CREATE_INDEX', index_name, 'SUCCESS', 'Index created successfully', NULL);
    END LOOP;
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_INDEX', index_name, 'ERROR', 'Failed to create index', SQLERRM);
    RAISE;
END $$;

-- =============================================================================
-- 5) CREATE TRIGGERS WITH LOGGING
-- =============================================================================
DO $$
BEGIN
    -- Create the trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    PERFORM log_migration_step('CREATE_FUNCTION', 'update_updated_at_column', 'SUCCESS', 'Trigger function created successfully', NULL);
    
    -- Create triggers for all tables
    CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_farmers_updated_at BEFORE UPDATE ON farmers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_lots_updated_at BEFORE UPDATE ON lots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_lot_items_updated_at BEFORE UPDATE ON lot_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_purchase_payments_updated_at BEFORE UPDATE ON purchase_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_picklist_items_updated_at BEFORE UPDATE ON picklist_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_dispatch_confirmations_updated_at BEFORE UPDATE ON dispatch_confirmations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_sales_payments_updated_at BEFORE UPDATE ON sales_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    PERFORM log_migration_step('CREATE_TRIGGERS', 'all_tables', 'SUCCESS', 'All triggers created successfully', NULL);
    
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('CREATE_TRIGGERS', 'all_tables', 'ERROR', 'Failed to create triggers', SQLERRM);
    RAISE;
END $$;

-- =============================================================================
-- 6) ENABLE RLS WITH LOGGING
-- =============================================================================
DO $$
DECLARE
    table_list TEXT[] := ARRAY[
        'products', 'farmers', 'customers', 'warehouses', 'roles', 'users',
        'lots', 'lot_items', 'purchase_payments', 'sales_orders', 
        'picklist_items', 'dispatch_confirmations', 'sales_payments', 'settings'
    ];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY table_list
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all operations" ON %I', table_name);
        EXECUTE format('CREATE POLICY "Allow all operations" ON %I FOR ALL USING (true) WITH CHECK (true)', table_name);
        PERFORM log_migration_step('ENABLE_RLS', table_name, 'SUCCESS', 'RLS enabled and policy created', NULL);
    END LOOP;
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('ENABLE_RLS', table_name, 'ERROR', 'Failed to enable RLS', SQLERRM);
    RAISE;
END $$;

-- =============================================================================
-- 7) INSERT SAMPLE DATA WITH LOGGING
-- =============================================================================

-- Insert Settings
DO $$
BEGIN
    INSERT INTO settings (setting_key, setting_value, description)
    VALUES ('sippam_kg_default','30','Default sippam weight')
    ON CONFLICT (setting_key) DO NOTHING;
    PERFORM log_migration_step('INSERT_DATA', 'settings', 'SUCCESS', 'Settings data inserted', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('INSERT_DATA', 'settings', 'ERROR', 'Failed to insert settings', SQLERRM);
    RAISE;
END $$;

-- Insert Products (as specified: Urundai Vellam, Achu Vellam, Panai Vellam, Nattu Sakarai)
DO $$
BEGIN
    INSERT INTO products (product_name) VALUES
    ('Urundai Vellam'), ('Achu Vellam'), ('Panai Vellam'), ('Nattu Sakarai')
    ON CONFLICT (product_name) DO NOTHING;
    PERFORM log_migration_step('INSERT_DATA', 'products', 'SUCCESS', '4 jaggery products inserted', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('INSERT_DATA', 'products', 'ERROR', 'Failed to insert products', SQLERRM);
    RAISE;
END $$;

-- Insert Warehouses
DO $$
BEGIN
    INSERT INTO warehouses (warehouse_name, address, contact_person_name, contact_number)
    VALUES 
    ('Main Warehouse','Industrial Area, Coimbatore','Manager','9876543200'),
    ('Secondary Storage','Godown Complex, Salem','Supervisor','9876543201')
    ON CONFLICT (warehouse_name) DO NOTHING;
    PERFORM log_migration_step('INSERT_DATA', 'warehouses', 'SUCCESS', 'Warehouse data inserted', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('INSERT_DATA', 'warehouses', 'ERROR', 'Failed to insert warehouses', SQLERRM);
    RAISE;
END $$;

-- Insert Farmers
DO $$
BEGIN
    INSERT INTO farmers (auction_name, billing_name, contact_person_name, mobile_primary, farmer_since_year)
    VALUES 
    ('Raman Krishnamurthy','R. Krishnamurthy & Sons','Raman','9876543210',2015),
    ('Murugan Velayudam','M. Velayudam Farms','Murugan','9876543212',2018)
    ON CONFLICT DO NOTHING;
    PERFORM log_migration_step('INSERT_DATA', 'farmers', 'SUCCESS', 'Farmer data inserted', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('INSERT_DATA', 'farmers', 'ERROR', 'Failed to insert farmers', SQLERRM);
    RAISE;
END $$;

-- Insert Customers
DO $$
BEGIN
    INSERT INTO customers (company_name, contact_person_name, bag_marking, mobile_primary, customer_since_year)
    VALUES 
    ('Sweet Dreams Confectionery','Rajesh Patel','SD-001','8765432109',2020),
    ('Traditional Sweets Pvt Ltd','Meera Sharma','TS-VLM','8765432108',2019)
    ON CONFLICT DO NOTHING;
    PERFORM log_migration_step('INSERT_DATA', 'customers', 'SUCCESS', 'Customer data inserted', NULL);
EXCEPTION WHEN OTHERS THEN
    PERFORM log_migration_step('INSERT_DATA', 'customers', 'ERROR', 'Failed to insert customers', SQLERRM);
    RAISE;
END $$;

-- =============================================================================
-- 8) MIGRATION COMPLETION AND VERIFICATION
-- =============================================================================
SELECT log_migration_step('MIGRATION_END', NULL, 'SUCCESS', 'Enhanced Schema Migration Completed Successfully', NULL);

-- =============================================================================
-- 9) FINAL VERIFICATION AND SUMMARY
-- =============================================================================
SELECT 
    'MIGRATION COMPLETED SUCCESSFULLY!' as status,
    NOW() as completion_time;

-- Table counts verification
SELECT 'Products' AS label, COUNT(*) AS count FROM products
UNION ALL
SELECT 'Farmers' AS label, COUNT(*) AS count FROM farmers
UNION ALL
SELECT 'Customers' AS label, COUNT(*) AS count FROM customers
UNION ALL
SELECT 'Warehouses' AS label, COUNT(*) AS count FROM warehouses
UNION ALL
SELECT 'Lots' AS label, COUNT(*) AS count FROM lots
UNION ALL
SELECT 'Lot Items' AS label, COUNT(*) AS count FROM lot_items
UNION ALL
SELECT 'Migration Logs' AS label, COUNT(*) AS count FROM migration_logs;

-- Show recent migration logs
SELECT 
    timestamp,
    operation,
    table_name,
    status,
    message
FROM migration_logs 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC
LIMIT 50;