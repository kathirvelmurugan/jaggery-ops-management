# 🚀 Supabase Database Setup for Jaggery Operations Management System

## Prerequisites
- A Supabase account at [supabase.com](https://supabase.com)
- Your Supabase project created with the provided credentials

## Quick Setup Steps

### 1. Run the Database Schema
1. Open your Supabase Dashboard
2. Go to `SQL Editor`
3. Copy the entire content from `supabase-schema.sql`
4. Paste it into the SQL Editor
5. Click `Run` to execute the schema

### 2. Verify Setup
After running the schema, you should see:
- ✅ 12 tables created
- ✅ Sample data inserted (farmers, customers, products, warehouses)
- ✅ 2 sample lots with multiple products
- ✅ Sample payment records
- ✅ Row Level Security enabled

### 3. Environment Configuration
The `.env` file should already be configured with:
```
VITE_SUPABASE_URL=https://ktpdgagqpwwqytbccppf.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Database Schema Overview

### Master Data Tables
- **products** - Jaggery product categories (Achu vellam, Urundai vellam, etc.)
- **farmers** - Farmer information with contact details
- **customers** - Customer and company information
- **warehouses** - Storage facility details

### Operational Tables
- **lots** - Purchase records from farmers
- **lot_products** - Multi-product support within lots
- **purchase_payments** - Payment tracking for purchases
- **sales_orders** - Customer orders
- **pick_list_items** - Items selected for packing
- **dispatch_confirmations** - Packing completion records
- **sales_payments** - Customer payment tracking
- **settings** - System configuration

## Sample Data Included

### 🧑‍🌾 Farmers (8 sample records)
- Raman Krishnamurthy (Kerala)
- Murugan Velayudam (Tamil Nadu)
- Krishnan Raghavan (Tamil Nadu)
- And more...

### 🏢 Customers (8 sample records)
- Rajesh Patel (Sweet Dreams Confectionery)
- Meera Sharma (Traditional Sweets Pvt Ltd)
- Arun Gupta (Golden Jaggery Industries)
- And more...

### 📦 Sample Lots
- **LOT-2024-001**: Multi-product lot with Achu vellam & Urundai vellam
- **LOT-2024-002**: Multi-product lot with Nattu sarkari & Pana vellam

## Security Notes

### Row Level Security (RLS)
- ✅ Enabled on all tables
- ✅ Policies configured for demo access
- ⚠️ **Important**: In production, implement proper authentication and restrictive policies

### API Keys
- ✅ Anon key is safe for browser use with RLS enabled
- ⚠️ Never expose Service Role key in frontend code
- ✅ Environment variables properly configured

## Troubleshooting

### Common Issues
1. **"relation does not exist"** - Ensure the schema was run completely
2. **"permission denied"** - Check RLS policies are properly set
3. **"duplicate key value"** - Sample data may already exist

### Verification Queries
Run these in SQL Editor to verify setup:
```sql
-- Check table existence
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check sample data
SELECT 'Products:', COUNT(*) FROM products
UNION ALL
SELECT 'Farmers:', COUNT(*) FROM farmers
UNION ALL
SELECT 'Customers:', COUNT(*) FROM customers
UNION ALL
SELECT 'Lots:', COUNT(*) FROM lots;
```

## Next Steps
After database setup is complete, the application will automatically:
1. Connect to Supabase instead of localStorage
2. Load all existing data from the cloud database
3. Provide real-time synchronization across sessions
4. Support multiple users simultaneously

## Support
If you encounter any issues, check:
1. Supabase project is active
2. API keys are correct in `.env`
3. Database schema was executed without errors
4. RLS policies are properly set

---
*Database schema designed for comprehensive jaggery operations management with multi-product lot support, financial tracking, and real-time capabilities.*