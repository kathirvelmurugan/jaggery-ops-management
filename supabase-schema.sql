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
    password_hash VARCHAR(255) NOT NULL, -- Store hashed passwords
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
    UNIQUE(lot_id, product_id, warehouse_id, bay_number) -- Prevent duplicate entries
);

-- =============================================================================
-- 3. PURCHASE MANAGEMENT
-- =============================================================================

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

-- =============================================================================
-- 4. SALES MANAGEMENT
-- =============================================================================

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
    customer_mark VARCHAR(100), -- Can override default customer bag marking
    planned_bags INTEGER DEFAULT 0 CHECK (planned_bags >= 0),
    planned_loose_kg DECIMAL(10,3) DEFAULT 0 CHECK (planned_loose_kg >= 0),
    sale_rate_per_kg DECIMAL(10,2) NOT NULL CHECK (sale_rate_per_kg >= 0),
    packaging_type VARCHAR(20) DEFAULT 'Bag' CHECK (packaging_type IN ('Bag', 'Box', 'Bulk')),
    status VARCHAR(20) DEFAULT 'To Be Packed' CHECK (status IN ('To Be Packed', 'Packed', 'Dispatched')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dispatch Confirmations (Unchanged logic, follows PickListItems)
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

-- Sales Payments (Unchanged, links to SalesOrders)
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

-- =============================================================================
-- 5. SYSTEM SETTINGS
-- =============================================================================

CREATE TABLE settings (
    setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(50) NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. PURCHASE MANAGEMENT TABLES
-- =============================================================================

-- Purchase Payments table
CREATE TABLE purchase_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    method VARCHAR(20) NOT NULL CHECK (method IN ('Cash', 'RTGS', 'Cheque', 'UPI')),
    reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. SALES MANAGEMENT TABLES
-- =============================================================================

-- Sales Orders table
CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Packing in Progress', 'Packed', 'Dispatched', 'Delivered', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pick List Items table (Items selected for packing)
CREATE TABLE pick_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE RESTRICT,
    lot_product_id UUID NOT NULL REFERENCES lot_products(id) ON DELETE RESTRICT,
    customer_mark VARCHAR(100),
    planned_bags INTEGER DEFAULT 0 CHECK (planned_bags >= 0),
    planned_loose_kg DECIMAL(8,2) DEFAULT 0 CHECK (planned_loose_kg >= 0),
    sale_rate DECIMAL(8,2) NOT NULL CHECK (sale_rate >= 0),
    packaging_type VARCHAR(20) DEFAULT 'Bag' CHECK (packaging_type IN ('Bag', 'Box', 'Bulk')),
    status VARCHAR(20) DEFAULT 'To Be Packed' CHECK (status IN ('To Be Packed', 'Packed', 'Dispatched')),
    
    -- Actual packed quantities (filled during packing)
    actual_bags INTEGER,
    actual_loose_kg DECIMAL(8,2),
    actual_total_kg DECIMAL(10,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dispatch Confirmations table
CREATE TABLE dispatch_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pick_item_id UUID NOT NULL REFERENCES pick_list_items(id) ON DELETE CASCADE,
    actual_bags INTEGER NOT NULL CHECK (actual_bags >= 0),
    actual_loose_kg DECIMAL(8,2) NOT NULL CHECK (actual_loose_kg >= 0),
    actual_total_kg DECIMAL(10,2) NOT NULL CHECK (actual_total_kg >= 0),
    dispatch_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Payments table
CREATE TABLE sales_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    method VARCHAR(20) NOT NULL CHECK (method IN ('Cash', 'RTGS', 'Cheque', 'UPI')),
    reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 5. SYSTEM SETTINGS TABLE
-- =============================================================================

-- Settings table for system configuration
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sippam_kg_default DECIMAL(6,2) DEFAULT 30 CHECK (sippam_kg_default > 0),
    company_name VARCHAR(100),
    company_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 6. INDEXES FOR PERFORMANCE
-- =============================================================================

-- Primary lookup indexes
CREATE INDEX idx_lots_farmer_id ON lots(farmer_id);
CREATE INDEX idx_lots_warehouse_id ON lots(warehouse_id);
CREATE INDEX idx_lots_purchase_date ON lots(purchase_date);
CREATE INDEX idx_lots_lot_number ON lots(lot_number);

CREATE INDEX idx_lot_products_lot_id ON lot_products(lot_id);
CREATE INDEX idx_lot_products_product_id ON lot_products(product_id);
CREATE INDEX idx_lot_products_current_kg ON lot_products(current_total_kg) WHERE current_total_kg > 0;

CREATE INDEX idx_purchase_payments_lot_id ON purchase_payments(lot_id);
CREATE INDEX idx_purchase_payments_date ON purchase_payments(payment_date);

CREATE INDEX idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_date ON sales_orders(order_date);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);

CREATE INDEX idx_pick_list_items_sales_order_id ON pick_list_items(sales_order_id);
CREATE INDEX idx_pick_list_items_lot_id ON pick_list_items(lot_id);
CREATE INDEX idx_pick_list_items_lot_product_id ON pick_list_items(lot_product_id);
CREATE INDEX idx_pick_list_items_status ON pick_list_items(status);

CREATE INDEX idx_sales_payments_sales_order_id ON sales_payments(sales_order_id);
CREATE INDEX idx_sales_payments_date ON sales_payments(payment_date);

-- =============================================================================
-- 7. TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables with updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_farmers_updated_at BEFORE UPDATE ON farmers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lots_updated_at BEFORE UPDATE ON lots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lot_products_updated_at BEFORE UPDATE ON lot_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_payments_updated_at BEFORE UPDATE ON purchase_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pick_list_items_updated_at BEFORE UPDATE ON pick_list_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dispatch_confirmations_updated_at BEFORE UPDATE ON dispatch_confirmations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_payments_updated_at BEFORE UPDATE ON sales_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 8. ROW LEVEL SECURITY (RLS) SETUP
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pick_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous users (for demonstration - in production you'd want proper auth)
-- These policies allow full access for demonstration purposes
CREATE POLICY "Allow all operations" ON products FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON farmers FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON warehouses FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON lots FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON lot_products FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON purchase_payments FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON sales_orders FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON pick_list_items FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON dispatch_confirmations FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON sales_payments FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON settings FOR ALL USING (true);

-- =============================================================================
-- 9. INITIAL DATA SETUP
-- =============================================================================

-- Insert default settings
INSERT INTO settings (sippam_kg_default, company_name, company_address) 
VALUES (30, 'Jaggery Operations Ltd.', 'Main Street, Jaggery Town, State 12345');

-- Insert default product categories
INSERT INTO products (name, description) VALUES 
('Achu vellam', 'Traditional jaggery variety with rich flavor'),
('Urundai vellam', 'Round shaped premium jaggery'),
('Nattu sarkari', 'Local government variety jaggery'),
('Pana vellam', 'Palm jaggery with natural sweetness');

-- Insert sample warehouses
INSERT INTO warehouses (name, location, capacity_kg) VALUES 
('Main Warehouse', 'Industrial Area, Zone A', 50000.00),
('Secondary Storage', 'Godown Complex, Zone B', 25000.00),
('Cold Storage Unit', 'Refrigerated Zone C', 15000.00);

-- Insert sample farmers with Indian names
INSERT INTO farmers (name, phone, address) VALUES 
('Raman Krishnamurthy', '+91-9876543210', 'Village Palakkad, Kerala'),
('Murugan Velayudam', '+91-9876543211', 'Sivaganga District, Tamil Nadu'),
('Krishnan Raghavan', '+91-9876543212', 'Thanjavur, Tamil Nadu'),
('Suresh Kumar', '+91-9876543213', 'Coimbatore, Tamil Nadu'),
('Balasubramanian', '+91-9876543214', 'Madurai, Tamil Nadu'),
('Devi Lakshmi', '+91-9876543215', 'Kanchipuram, Tamil Nadu'),
('Ganesh Moorthy', '+91-9876543216', 'Salem, Tamil Nadu'),
('Priya Shankar', '+91-9876543217', 'Vellore, Tamil Nadu');

-- Insert sample customers with company names
INSERT INTO customers (name, company_name, phone, email, address) VALUES 
('Rajesh Patel', 'Sweet Dreams Confectionery', '+91-8765432109', 'rajesh@sweetdreams.com', 'MG Road, Bangalore, Karnataka'),
('Meera Sharma', 'Traditional Sweets Pvt Ltd', '+91-8765432108', 'meera@traditionalsweets.com', 'Commercial Street, Mumbai, Maharashtra'),
('Arun Gupta', 'Golden Jaggery Industries', '+91-8765432107', 'arun@goldenjaggery.com', 'Industrial Zone, Pune, Maharashtra'),
('Kavitha Reddy', 'Natural Foods Co.', '+91-8765432106', 'kavitha@naturalfoods.com', 'Tech City, Hyderabad, Telangana'),
('Deepak Agarwal', 'Wholesale Food Distributors', '+91-8765432105', 'deepak@wfd.com', 'Market Area, Delhi'),
('Sunita Jain', 'Organic Products Ltd', '+91-8765432104', 'sunita@organicproducts.com', 'Green Park, Jaipur, Rajasthan'),
('Vikram Singh', 'Royal Sweets & Snacks', '+91-8765432103', 'vikram@royalsweets.com', 'Main Bazaar, Lucknow, UP'),
('Anitha Nair', 'South Indian Delicacies', '+91-8765432102', 'anitha@southindian.com', 'Fort Kochi, Kerala');

-- =============================================================================
-- 10. SAMPLE DATA FOR DEMONSTRATION
-- =============================================================================

-- Create some sample lots with products
WITH sample_lot_1 AS (
  INSERT INTO lots (lot_number, farmer_id, warehouse_id, purchase_date, bay_number, total_purchase_value)
  SELECT 'LOT-2024-001', f.id, w.id, '2024-01-15', 'BAY-A1', 67500.00
  FROM farmers f, warehouses w 
  WHERE f.name = 'Raman Krishnamurthy' AND w.name = 'Main Warehouse'
  RETURNING id as lot_id
)
INSERT INTO lot_products (lot_id, product_id, num_bags, loose_kg, sippam_kg, purchase_rate, current_total_kg)
SELECT 
  sl.lot_id,
  p.id as product_id,
  CASE 
    WHEN p.name = 'Achu vellam' THEN 20
    WHEN p.name = 'Urundai vellam' THEN 15
    ELSE 0
  END as num_bags,
  CASE 
    WHEN p.name = 'Achu vellam' THEN 25.5
    WHEN p.name = 'Urundai vellam' THEN 18.0
    ELSE 0
  END as loose_kg,
  30 as sippam_kg,
  CASE 
    WHEN p.name = 'Achu vellam' THEN 45.00
    WHEN p.name = 'Urundai vellam' THEN 50.00
    ELSE 0
  END as purchase_rate,
  CASE 
    WHEN p.name = 'Achu vellam' THEN (20 * 30 + 25.5)
    WHEN p.name = 'Urundai vellam' THEN (15 * 30 + 18.0)
    ELSE 0
  END as current_total_kg
FROM sample_lot_1 sl, products p
WHERE p.name IN ('Achu vellam', 'Urundai vellam');

-- Create second sample lot
WITH sample_lot_2 AS (
  INSERT INTO lots (lot_number, farmer_id, warehouse_id, purchase_date, bay_number, total_purchase_value)
  SELECT 'LOT-2024-002', f.id, w.id, '2024-01-20', 'BAY-B2', 84000.00
  FROM farmers f, warehouses w 
  WHERE f.name = 'Murugan Velayudam' AND w.name = 'Secondary Storage'
  RETURNING id as lot_id
)
INSERT INTO lot_products (lot_id, product_id, num_bags, loose_kg, sippam_kg, purchase_rate, current_total_kg)
SELECT 
  sl.lot_id,
  p.id as product_id,
  CASE 
    WHEN p.name = 'Nattu sarkari' THEN 25
    WHEN p.name = 'Pana vellam' THEN 18
    ELSE 0
  END as num_bags,
  CASE 
    WHEN p.name = 'Nattu sarkari' THEN 12.5
    WHEN p.name = 'Pana vellam' THEN 22.0
    ELSE 0
  END as loose_kg,
  30 as sippam_kg,
  CASE 
    WHEN p.name = 'Nattu sarkari' THEN 40.00
    WHEN p.name = 'Pana vellam' THEN 48.00
    ELSE 0
  END as purchase_rate,
  CASE 
    WHEN p.name = 'Nattu sarkari' THEN (25 * 30 + 12.5)
    WHEN p.name = 'Pana vellam' THEN (18 * 30 + 22.0)
    ELSE 0
  END as current_total_kg
FROM sample_lot_2 sl, products p
WHERE p.name IN ('Nattu sarkari', 'Pana vellam');

-- Add some sample purchase payments
INSERT INTO purchase_payments (lot_id, amount, payment_date, method, reference)
SELECT l.id, 30000.00, '2024-01-15', 'Cash', 'Initial payment for LOT-2024-001'
FROM lots l WHERE l.lot_number = 'LOT-2024-001';

INSERT INTO purchase_payments (lot_id, amount, payment_date, method, reference)
SELECT l.id, 25000.00, '2024-01-20', 'RTGS', 'TXN-RTG-001-2024'
FROM lots l WHERE l.lot_number = 'LOT-2024-002';

-- Create sample sales orders
INSERT INTO sales_orders (customer_id, order_date, status, notes)
SELECT c.id, '2024-01-25', 'Draft', 'Bulk order for festival season'
FROM customers c WHERE c.name = 'Rajesh Patel';

INSERT INTO sales_orders (customer_id, order_date, status, notes)
SELECT c.id, '2024-01-26', 'Draft', 'Regular monthly supply'
FROM customers c WHERE c.name = 'Meera Sharma';

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================

-- Verification queries to check setup
SELECT 'Schema creation completed successfully!' as status;
SELECT 'Total products:', COUNT(*) FROM products;
SELECT 'Total farmers:', COUNT(*) FROM farmers;
SELECT 'Total customers:', COUNT(*) FROM customers;
SELECT 'Total warehouses:', COUNT(*) FROM warehouses;
SELECT 'Total lots:', COUNT(*) FROM lots;
SELECT 'Total lot products:', COUNT(*) FROM lot_products;