-- Migration: Expense Categories, Expenses, and Attachments

-- 1. Create Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    budget NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Default Categories
INSERT INTO expense_categories (id, name, color, budget) VALUES
('exp-cat-rent', 'Rent', '#ff3b30', 50000),
('exp-cat-salaries', 'Salaries', '#ff9f0a', 200000),
('exp-cat-electricity', 'Electricity', '#34c759', 15000),
('exp-cat-water', 'Water', '#5ac8fa', 5000),
('exp-cat-internet', 'Internet', '#007aff', 3000),
('exp-cat-equipment', 'Equipment', '#af52de', 100000),
('exp-cat-dental-materials', 'Dental Materials', '#ff2d55', 75000),
('exp-cat-medicines', 'Medicines', '#5856d6', 40000),
('exp-cat-marketing', 'Marketing', '#e0c068', 20000),
('exp-cat-maintenance', 'Maintenance', '#8e8e93', 10000),
('exp-cat-miscellaneous', 'Miscellaneous', '#c7c7cc', 10000)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    color = EXCLUDED.color, 
    budget = EXCLUDED.budget;

-- 2. Create Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
    amount NUMERIC NOT NULL,
    expense_date DATE NOT NULL,
    vendor_name TEXT,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Credit Card', 'Cheque', 'Other')),
    notes TEXT,
    attachment_url TEXT,
    created_by TEXT REFERENCES staff_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Index on Expenses
CREATE INDEX IF NOT EXISTS expenses_expense_date_idx ON expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS expenses_category_id_idx ON expenses (category_id);

-- 3. Create Expense Attachments Table
CREATE TABLE IF NOT EXISTS expense_attachments (
    id TEXT PRIMARY KEY,
    expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Index on Attachments
CREATE INDEX IF NOT EXISTS expense_attachments_expense_id_idx ON expense_attachments (expense_id);

-- 4. Seed Permissions for Expenses module
-- Admin & Super Admin: Full Access
INSERT INTO permissions (id, role_id, module, can_view, can_create, can_edit, can_delete, can_refund, can_manage, can_export) VALUES
('perm-admin-exp', 'admin', 'expenses', true, true, true, true, true, true, true),
('perm-sadmin-exp', 'super_admin', 'expenses', true, true, true, true, true, true, true)
ON CONFLICT (role_id, module) DO NOTHING;

-- Accountant: Full Access
INSERT INTO permissions (id, role_id, module, can_view, can_create, can_edit, can_delete, can_refund, can_manage, can_export) VALUES
('perm-account-exp', 'accountant', 'expenses', true, true, true, true, true, true, true)
ON CONFLICT (role_id, module) DO NOTHING;

-- Dentist: View Only
INSERT INTO permissions (id, role_id, module, can_view, can_create, can_edit, can_delete, can_refund, can_manage, can_export) VALUES
('perm-dentist-exp', 'dentist', 'expenses', true, false, false, false, false, false, false)
ON CONFLICT (role_id, module) DO NOTHING;

-- Receptionist: No Access
INSERT INTO permissions (id, role_id, module, can_view, can_create, can_edit, can_delete, can_refund, can_manage, can_export) VALUES
('perm-recept-exp', 'receptionist', 'expenses', false, false, false, false, false, false, false)
ON CONFLICT (role_id, module) DO NOTHING;

-- Assistant: No Access
INSERT INTO permissions (id, role_id, module, can_view, can_create, can_edit, can_delete, can_refund, can_manage, can_export) VALUES
('perm-assist-exp', 'assistant', 'expenses', false, false, false, false, false, false, false)
ON CONFLICT (role_id, module) DO NOTHING;
