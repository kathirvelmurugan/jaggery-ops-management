-- =============================================================================
-- JAGGERY OPERATIONS MANAGEMENT SYSTEM - ENHANCED SUPABASE DATABASE SCHEMA
-- Multi-Product Lot Architecture with Normalized Structure
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. MASTER DATA TABLES
-- =============================================================================

-- Products table (Enhanced with activation status)
CREATE TABLE products (
    product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Farmers table (Enhanced with auction and billing names)
CREATE TABLE farmers (
    farmer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_name VARCHAR(100) NOT NULL, -- Name used at auction
    billing_name VARCHAR(100) NOT NULL, -- Legal/payment name
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

-- Customers table (Enhanced with bag marking and detailed contact info)
CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(100) NOT NULL,
    contact_person_name VARCHAR(100),
    bag_marking VARCHAR(50), -- IMPORTANT: Default mark for this customer
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

-- Warehouses table (Enhanced structure)
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

-- Users & Roles (Authentication system)
CREATE TABLE roles (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(50) NOT NULL UNIQUE CHECK (role_name IN ('admin', 'manager', 'dispatch')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. TRANSACTIONAL DATA MODELS (REVISED FOR MULTI-PRODUCT LOTS)
-- =============================================================================

-- Lots table (Header for purchases - contains metadata only)
CREATE TABLE lots (
    lot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot_number VARCHAR(50) NOT NULL UNIQUE,
    purchase_date DATE NOT NULL,
    farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LotItems table (Individual products within each lot)
CREATE TABLE lot_items (
    lot_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot_id UUID NOT NULL REFERENCES lots(lot_id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
    bay_number VARCHAR(20),
    
    -- Quantity fields
    initial_bags INTEGER DEFAULT 0 CHECK (initial_bags >= 0),
    initial_loose_kg DECIMAL(10,3) DEFAULT 0 CHECK (initial_loose_kg >= 0),
    initial_total_kg DECIMAL(10,3) NOT NULL CHECK (initial_total_kg >= 0),
    current_total_kg DECIMAL(10,3) NOT NULL CHECK (current_total_kg >= 0),
    
    -- Financial fields
    purchase_rate_per_kg DECIMAL(10,2) NOT NULL CHECK (purchase_rate_per_kg >= 0),
    total_purchase_value DECIMAL(15,2) NOT NULL CHECK (total_purchase_value >= 0),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT lot_items_current_kg_max_check CHECK (current_total_kg <= initial_total_kg),
    UNIQUE(lot_id, product_id, warehouse_id, bay_number)
);

-- Purchase Payments (Links to lot header, not individual items)
CREATE TABLE purchase_payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot_id UUID NOT NULL REFERENCES lots(lot_id) ON DELETE CASCADE,
    amount_paid DECIMAL(15,2) NOT NULL CHECK (amount_paid > 0),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('Cash', 'RTGS', 'Cheque', 'UPI', 'NEFT')),
    reference_details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Orders (Unchanged)
CREATE TABLE sales_orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
    order_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Packing in Progress', 'Packed', 'Dispatched', 'Delivered', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pick List Items (Now links to specific LotItems)
CREATE TABLE picklist_items (
    picklist_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES sales_orders(order_id) ON DELETE CASCADE,
    lot_item_id UUID NOT NULL REFERENCES lot_items(lot_item_id) ON DELETE RESTRICT,
    customer_mark VARCHAR(100),
    planned_bags INTEGER DEFAULT 0 CHECK (planned_bags >= 0),
    planned_loose_kg DECIMAL(10,3) DEFAULT 0 CHECK (planned_loose_kg >= 0),
    sale_rate_per_kg DECIMAL(10,2) NOT NULL CHECK (sale_rate_per_kg >= 0),
    packaging_type VARCHAR(20) DEFAULT 'Bag' CHECK (packaging_type IN ('Bag', 'Box', 'Bulk')),
    status VARCHAR(20) DEFAULT 'To Be Packed' CHECK (status IN ('To Be Packed', 'Packed', 'Dispatched')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dispatch Confirmations
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

-- Sales Payments
CREATE TABLE sales_payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES sales_orders(order_id) ON DELETE CASCADE,
    amount_paid DECIMAL(15,2) NOT NULL CHECK (amount_paid > 0),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('Cash', 'RTGS', 'Cheque', 'UPI', 'NEFT')),
    reference_details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Settings
CREATE TABLE settings (
    setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(50) NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. INDEXES, TRIGGERS, AND POLICIES
-- =============================================================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_farmers_updated_at BEFORE UPDATE ON farmers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lots_updated_at BEFORE UPDATE ON lots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lot_items_updated_at BEFORE UPDATE ON lot_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE picklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_payments ENABLE ROW LEVEL SECURITY;

-- Create policies (Demo - allow all operations)
CREATE POLICY "Allow all operations" ON products FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON farmers FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON warehouses FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON lots FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON lot_items FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON purchase_payments FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON sales_orders FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON picklist_items FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON sales_payments FOR ALL USING (true);

-- =============================================================================
-- 4. SEED DATA
-- =============================================================================

-- Insert system settings
INSERT INTO settings (setting_key, setting_value, description) VALUES
('default_sippam_kg', '30', 'Default weight of one sippam/bag in kg'),
('company_name', 'Jaggery Operations Ltd.', 'Company name');

-- Insert product categories
INSERT INTO products (product_name, is_active) VALUES 
('Urundai Vellam', true),
('Achu Vellam', true),
('Panai Vellam', true),
('Nattu Sakarai', true);

-- Insert warehouses
INSERT INTO warehouses (warehouse_name, address, contact_person_name, contact_number) VALUES 
('Main Warehouse', 'Industrial Area, Coimbatore', 'Manager', '+91-9876543200'),
('Secondary Storage', 'Godown Complex, Salem', 'Supervisor', '+91-9876543201');

-- Insert farmers
INSERT INTO farmers (auction_name, billing_name, contact_person_name, mobile_primary, farmer_since_year) VALUES 
('Raman Krishnamurthy', 'R. Krishnamurthy & Sons', 'Raman', '+91-9876543210', 2015),
('Murugan Velayudam', 'M. Velayudam Farms', 'Murugan', '+91-9876543212', 2018);

-- Insert customers
INSERT INTO customers (company_name, contact_person_name, bag_marking, mobile_primary, customer_since_year) VALUES 
('Sweet Dreams Confectionery', 'Rajesh Patel', 'SD-001', '+91-8765432109', 2020),
('Traditional Sweets Pvt Ltd', 'Meera Sharma', 'TS-VLM', '+91-8765432108', 2019);

SELECT 'Enhanced schema creation completed successfully!' as status;