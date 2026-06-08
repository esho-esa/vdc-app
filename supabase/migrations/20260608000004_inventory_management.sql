-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Clinical Supplies', 'Equipment', 'Medicines', 'Personal Protective Equipment', 'Other')),
  unit TEXT NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 0,
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Purchase', 'Usage', 'Adjustment', 'Expired', 'Returned')),
  quantity INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id TEXT PRIMARY KEY,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  order_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Draft', 'Ordered', 'Received', 'Cancelled')) DEFAULT 'Draft',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Stores Array of { itemId, itemName, quantity, unitPrice, receivedQty }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS inventory_items_supplier_id_idx ON public.inventory_items(supplier_id);
CREATE INDEX IF NOT EXISTS inventory_transactions_item_id_idx ON public.inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS purchase_orders_supplier_id_idx ON public.purchase_orders(supplier_id);

-- Seed Initial Suppliers
INSERT INTO public.suppliers (id, name, contact, email, address) VALUES
('sup-dentaltech', 'Dental Tech Solutions', '+91 9112233445', 'sales@dentaltech.com', 'No. 24, Outer Ring Road, Bangalore, Karnataka'),
('sup-healthline', 'HealthLine Meds India', '+91 9998887776', 'orders@healthlinemeds.co.in', 'No. 88, Mount Road, Chennai, Tamil Nadu')
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Inventory Items
INSERT INTO public.inventory_items (id, item_name, category, unit, current_stock, minimum_stock, reorder_level, purchase_price, selling_price, supplier_id, expiry_date) VALUES
('inv-rcfile', 'Root Canal File', 'Clinical Supplies', 'Pcs', 50, 10, 15, 450.00, 600.00, 'sup-dentaltech', NULL),
('inv-anesthetic', 'Anesthetic Tube', 'Clinical Supplies', 'Box', 30, 5, 8, 850.00, 1200.00, 'sup-healthline', '2026-10-31'),
('inv-gloves', 'Nitrile Gloves (M)', 'Personal Protective Equipment', 'Box', 100, 20, 30, 350.00, 500.00, 'sup-healthline', '2028-06-30')
ON CONFLICT (id) DO NOTHING;
