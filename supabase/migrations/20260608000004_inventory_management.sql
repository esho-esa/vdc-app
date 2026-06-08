-- Overwrite Migration: Dental Inventory & Stock Management
-- Aligned with the specific requested database schema

-- Drop existing tables to ensure clean state
DROP TABLE IF EXISTS public.stock_transactions CASCADE;
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;

-- 1. Create Suppliers Table
CREATE TABLE public.suppliers (
    id TEXT PRIMARY KEY,
    supplier_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Inventory Items Table
CREATE TABLE public.inventory_items (
    id TEXT PRIMARY KEY,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Medicine', 'Dental Material', 'Equipment', 'Consumable')),
    sku TEXT,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    purchase_price NUMERIC NOT NULL DEFAULT 0,
    selling_price NUMERIC DEFAULT 0,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on foreign key supplier_id
CREATE INDEX IF NOT EXISTS inventory_items_supplier_id_idx ON public.inventory_items(supplier_id);

-- 3. Create Stock Transactions Table
CREATE TABLE public.stock_transactions (
    id TEXT PRIMARY KEY,
    inventory_item_id TEXT NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('IN', 'OUT', 'ADJUSTMENT')),
    quantity INTEGER NOT NULL, -- negative for OUT, positive for IN / ADJUSTMENT
    reason TEXT,
    treatment_id TEXT, -- Nullable, references treatments(id)
    staff_id TEXT, -- Nullable, references staff_members(id)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes on stock transactions
CREATE INDEX IF NOT EXISTS stock_transactions_item_id_idx ON public.stock_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS stock_transactions_created_at_idx ON public.stock_transactions(created_at DESC);

-- 4. Create Purchase Orders Table
CREATE TABLE public.purchase_orders (
    id TEXT PRIMARY KEY,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Ordered', 'Received', 'Cancelled')) DEFAULT 'Draft',
    notes TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Store list of ordered items [{ itemId, itemName, quantity, unitPrice }]
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on purchase orders
CREATE INDEX IF NOT EXISTS purchase_orders_supplier_id_idx ON public.purchase_orders(supplier_id);

-- 5. Seed Default Suppliers
INSERT INTO public.suppliers (id, supplier_name, phone, email, address) VALUES
('sup-dentaltech', 'Dental Tech Solutions', '+91 9112233445', 'sales@dentaltech.com', 'No. 24, Outer Ring Road, Bangalore, Karnataka'),
('sup-healthline', 'HealthLine Meds India', '+91 9998887776', 'orders@healthlinemeds.co.in', 'No. 88, Mount Road, Chennai, Tamil Nadu')
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Default Inventory Items (aligned with Patient Integration keyword matching)
INSERT INTO public.inventory_items (id, item_name, category, sku, supplier_id, current_stock, minimum_stock, unit, purchase_price, selling_price, expiry_date) VALUES
('inv-anesthetic', 'Anesthetic Tube', 'Medicine', 'MED-ANS-01', 'sup-healthline', 50, 10, 'Box', 850.00, 1200.00, '2026-10-31'),
('inv-rcfile', 'Root Canal File', 'Dental Material', 'DM-RCF-02', 'sup-dentaltech', 30, 5, 'Pcs', 450.00, 600.00, NULL),
('inv-gppoints', 'GP Points', 'Consumable', 'CON-GPP-03', 'sup-dentaltech', 100, 20, 'Box', 150.00, 250.00, NULL),
('inv-sealer', 'Sealer', 'Dental Material', 'DM-SLR-04', 'sup-dentaltech', 15, 3, 'Pcs', 950.00, 1500.00, NULL),
('inv-crownmat', 'Crown Material', 'Dental Material', 'DM-CRN-05', 'sup-dentaltech', 25, 5, 'Pcs', 1250.00, 2000.00, NULL),
('inv-xraymat', 'X-Ray Material', 'Consumable', 'CON-XRY-06', 'sup-healthline', 80, 15, 'Pcs', 200.00, 350.00, NULL)
ON CONFLICT (id) DO NOTHING;
