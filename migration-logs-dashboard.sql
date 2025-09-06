-- =============================================================================
-- MIGRATION LOGS DASHBOARD - Real-time Monitoring Queries
-- Use these queries to monitor migration progress and system operations
-- =============================================================================

-- 1. LATEST MIGRATION STATUS
SELECT 
    '=== LATEST MIGRATION STATUS ===' as section;

SELECT 
    timestamp,
    operation,
    table_name,
    status,
    message,
    CASE 
        WHEN error_details IS NOT NULL THEN '⚠️ ERROR'
        WHEN status = 'SUCCESS' THEN '✅ SUCCESS'
        WHEN status = 'INFO' THEN 'ℹ️ INFO'
        ELSE status
    END as visual_status
FROM migration_logs 
WHERE timestamp >= NOW() - INTERVAL '2 hours'
ORDER BY timestamp DESC
LIMIT 50;

-- 2. MIGRATION SUMMARY BY STATUS
SELECT 
    '=== MIGRATION SUMMARY ===' as section;

SELECT 
    status,
    COUNT(*) as operation_count,
    MIN(timestamp) as first_operation,
    MAX(timestamp) as last_operation
FROM migration_logs 
WHERE timestamp >= NOW() - INTERVAL '2 hours'
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'ERROR' THEN 1 
        WHEN 'SUCCESS' THEN 2 
        WHEN 'INFO' THEN 3 
        ELSE 4 
    END;

-- 3. TABLE CREATION STATUS
SELECT 
    '=== TABLE CREATION STATUS ===' as section;

SELECT 
    table_name,
    operation,
    status,
    timestamp,
    message
FROM migration_logs 
WHERE operation IN ('CREATE_TABLE', 'DROP_TABLE')
    AND timestamp >= NOW() - INTERVAL '2 hours'
ORDER BY timestamp DESC;

-- 4. ERROR DETAILS (IF ANY)
SELECT 
    '=== ERROR DETAILS ===' as section;

SELECT 
    timestamp,
    operation,
    table_name,
    message,
    error_details
FROM migration_logs 
WHERE status = 'ERROR'
    AND timestamp >= NOW() - INTERVAL '2 hours'
ORDER BY timestamp DESC;

-- 5. CURRENT DATABASE STATE
SELECT 
    '=== CURRENT DATABASE STATE ===' as section;

-- Check which tables currently exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('products', 'farmers', 'customers', 'warehouses', 'lots', 'lot_items') THEN '🏢 Core Business'
        WHEN table_name IN ('sales_orders', 'picklist_items', 'dispatch_confirmations') THEN '📦 Sales Process'
        WHEN table_name IN ('purchase_payments', 'sales_payments') THEN '💰 Financial'
        WHEN table_name = 'migration_logs' THEN '📊 System'
        ELSE '🔧 Other'
    END as category,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY category, table_name;

-- 6. DATA VERIFICATION
SELECT 
    '=== DATA VERIFICATION ===' as section;

-- Row counts for all main tables
WITH table_counts AS (
    SELECT 'products' as table_name, COUNT(*) as row_count FROM products
    UNION ALL
    SELECT 'farmers', COUNT(*) FROM farmers
    UNION ALL
    SELECT 'customers', COUNT(*) FROM customers
    UNION ALL
    SELECT 'warehouses', COUNT(*) FROM warehouses
    UNION ALL
    SELECT 'lots', COUNT(*) FROM lots
    UNION ALL
    SELECT 'lot_items', COUNT(*) FROM lot_items
    UNION ALL
    SELECT 'purchase_payments', COUNT(*) FROM purchase_payments
    UNION ALL
    SELECT 'sales_orders', COUNT(*) FROM sales_orders
    UNION ALL
    SELECT 'picklist_items', COUNT(*) FROM picklist_items
    UNION ALL
    SELECT 'sales_payments', COUNT(*) FROM sales_payments
    UNION ALL
    SELECT 'migration_logs', COUNT(*) FROM migration_logs
)
SELECT 
    table_name,
    row_count,
    CASE 
        WHEN table_name = 'products' AND row_count = 4 THEN '✅ Expected (4 jaggery types)'
        WHEN table_name = 'farmers' AND row_count >= 2 THEN '✅ Sample data present'
        WHEN table_name = 'customers' AND row_count >= 2 THEN '✅ Sample data present'
        WHEN table_name = 'warehouses' AND row_count >= 2 THEN '✅ Sample data present'
        WHEN table_name = 'migration_logs' AND row_count > 0 THEN '✅ Logging active'
        WHEN row_count = 0 THEN 'ℹ️ Empty (normal for new installation)'
        ELSE '✅ Has data'
    END as verification_status
FROM table_counts
ORDER BY 
    CASE table_name 
        WHEN 'products' THEN 1
        WHEN 'farmers' THEN 2
        WHEN 'customers' THEN 3
        WHEN 'warehouses' THEN 4
        WHEN 'lots' THEN 5
        WHEN 'lot_items' THEN 6
        ELSE 7
    END;

-- 7. ENHANCED SCHEMA FEATURES VERIFICATION
SELECT 
    '=== ENHANCED SCHEMA FEATURES ===' as section;

-- Check if the 4 required jaggery products exist
SELECT 
    'Jaggery Products Check' as feature,
    STRING_AGG(product_name, ', ' ORDER BY product_name) as products_found,
    COUNT(*) as product_count,
    CASE 
        WHEN COUNT(*) = 4 AND 
             COUNT(*) FILTER (WHERE product_name IN ('Urundai Vellam', 'Achu Vellam', 'Panai Vellam', 'Nattu Sakarai')) = 4 
        THEN '✅ All required products present'
        ELSE '⚠️ Missing required products'
    END as status
FROM products
WHERE is_active = true;

-- Check enhanced customer fields
SELECT 
    'Enhanced Customer Fields' as feature,
    COUNT(*) FILTER (WHERE bag_marking IS NOT NULL) as customers_with_bag_marking,
    COUNT(*) as total_customers,
    CASE 
        WHEN COUNT(*) FILTER (WHERE bag_marking IS NOT NULL) > 0 
        THEN '✅ Bag marking field populated'
        ELSE 'ℹ️ Bag marking field exists but empty'
    END as status
FROM customers;

-- Check normalized lot structure
SELECT 
    'Normalized Lot Structure' as feature,
    (SELECT COUNT(*) FROM lots) as lot_headers,
    (SELECT COUNT(*) FROM lot_items) as lot_items,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lots') 
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lot_items')
        THEN '✅ Normalized structure implemented'
        ELSE '⚠️ Structure incomplete'
    END as status;

-- 8. REAL-TIME SYSTEM MONITORING
SELECT 
    '=== REAL-TIME MONITORING ===' as section;

-- Most recent activity
SELECT 
    'Last 10 Operations' as activity_type,
    STRING_AGG(
        operation || ' (' || status || ')', 
        ' → ' 
        ORDER BY timestamp DESC
    ) as recent_operations
FROM (
    SELECT operation, status, timestamp 
    FROM migration_logs 
    ORDER BY timestamp DESC 
    LIMIT 10
) recent;

-- System health check
SELECT 
    'System Health' as metric,
    CASE 
        WHEN (SELECT COUNT(*) FROM migration_logs WHERE status = 'ERROR' AND timestamp >= NOW() - INTERVAL '1 hour') = 0
        THEN '✅ No recent errors'
        ELSE '⚠️ Recent errors detected'
    END as status,
    (SELECT COUNT(*) FROM migration_logs WHERE status = 'ERROR' AND timestamp >= NOW() - INTERVAL '1 hour') as error_count_last_hour;

-- 9. REFRESH COMMAND
SELECT 
    '=== REFRESH INSTRUCTIONS ===' as section,
    'Re-run this query to get updated status' as instruction,
    NOW() as last_refreshed;