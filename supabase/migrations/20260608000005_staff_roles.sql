-- Migration: Staff, Roles, Permissions, and Activity Logs tables

-- 1. Create Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Default Roles
INSERT INTO roles (id, name) VALUES
('super_admin', 'Super Admin'),
('admin', 'Admin'),
('dentist', 'Dentist'),
('receptionist', 'Receptionist'),
('accountant', 'Accountant'),
('assistant', 'Assistant')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Create Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    module TEXT NOT NULL, -- 'dashboard', 'patients', 'appointments', 'treatments', 'prescriptions', 'clinical_records', 'billing', 'inventory', 'reports'
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_refund BOOLEAN DEFAULT FALSE,
    can_manage BOOLEAN DEFAULT FALSE,
    can_export BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, module)
);

-- Seed Default Permissions
-- Super Admin / Admin: Full Access
INSERT INTO permissions (id, role_id, module, can_view, can_create, can_edit, can_delete, can_refund, can_manage, can_export) VALUES
('perm-admin-dash', 'admin', 'dashboard', true, true, true, true, true, true, true),
('perm-admin-pat', 'admin', 'patients', true, true, true, true, true, true, true),
('perm-admin-app', 'admin', 'appointments', true, true, true, true, true, true, true),
('perm-admin-treat', 'admin', 'treatments', true, true, true, true, true, true, true),
('perm-admin-rx', 'admin', 'prescriptions', true, true, true, true, true, true, true),
('perm-admin-rec', 'admin', 'clinical_records', true, true, true, true, true, true, true),
('perm-admin-bill', 'admin', 'billing', true, true, true, true, true, true, true),
('perm-admin-inv', 'admin', 'inventory', true, true, true, true, true, true, true),
('perm-admin-rep', 'admin', 'reports', true, true, true, true, true, true, true),

('perm-sadmin-dash', 'super_admin', 'dashboard', true, true, true, true, true, true, true),
('perm-sadmin-pat', 'super_admin', 'patients', true, true, true, true, true, true, true),
('perm-sadmin-app', 'super_admin', 'appointments', true, true, true, true, true, true, true),
('perm-sadmin-treat', 'super_admin', 'treatments', true, true, true, true, true, true, true),
('perm-sadmin-rx', 'super_admin', 'prescriptions', true, true, true, true, true, true, true),
('perm-sadmin-rec', 'super_admin', 'clinical_records', true, true, true, true, true, true, true),
('perm-sadmin-bill', 'super_admin', 'billing', true, true, true, true, true, true, true),
('perm-sadmin-inv', 'super_admin', 'inventory', true, true, true, true, true, true, true),
('perm-sadmin-rep', 'super_admin', 'reports', true, true, true, true, true, true, true)
ON CONFLICT (role_id, module) DO NOTHING;

-- Dentist: Access to Treatments, Prescriptions, Clinical Records, and Patients/Dashboard (View-only)
INSERT INTO permissions (id, role_id, module, can_view, can_create, can_edit, can_delete, can_refund, can_manage, can_export) VALUES
('perm-dentist-dash', 'dentist', 'dashboard', true, false, false, false, false, false, false),
('perm-dentist-pat', 'dentist', 'patients', true, false, false, false, false, false, false),
('perm-dentist-app', 'dentist', 'appointments', true, false, false, false, false, false, false),
('perm-dentist-treat', 'dentist', 'treatments', true, true, true, true, false, false, false),
('perm-dentist-rx', 'dentist', 'prescriptions', true, true, true, true, false, false, false),
('perm-dentist-rec', 'dentist', 'clinical_records', true, true, true, true, false, false, false),
('perm-dentist-bill', 'dentist', 'billing', false, false, false, false, false, false, false),
('perm-dentist-inv', 'dentist', 'inventory', false, false, false, false, false, false, false),
('perm-dentist-rep', 'dentist', 'reports', false, false, false, false, false, false, false)
ON CONFLICT (role_id, module) DO NOTHING;

-- Receptionist: Access to Patients & Appointments
INSERT INTO permissions (id, role_id, module, can_view, can_create, can_edit, can_delete, can_refund, can_manage, can_export) VALUES
('perm-recept-dash', 'receptionist', 'dashboard', true, false, false, false, false, false, false),
('perm-recept-pat', 'receptionist', 'patients', true, true, true, true, false, false, false),
('perm-recept-app', 'receptionist', 'appointments', true, true, true, true, false, false, false),
('perm-recept-treat', 'receptionist', 'treatments', false, false, false, false, false, false, false),
('perm-recept-rx', 'receptionist', 'prescriptions', false, false, false, false, false, false, false),
('perm-recept-rec', 'receptionist', 'clinical_records', false, false, false, false, false, false, false),
('perm-recept-bill', 'receptionist', 'billing', false, false, false, false, false, false, false),
('perm-recept-inv', 'receptionist', 'inventory', false, false, false, false, false, false, false),
('perm-recept-rep', 'receptionist', 'reports', false, false, false, false, false, false, false)
ON CONFLICT (role_id, module) DO NOTHING;

-- Accountant: Access to Billing, Revenue, and Reports
INSERT INTO permissions (id, role_id, module, can_view, can_create, can_edit, can_delete, can_refund, can_manage, can_export) VALUES
('perm-account-dash', 'accountant', 'dashboard', true, false, false, false, false, false, false),
('perm-account-pat', 'accountant', 'patients', true, false, false, false, false, false, false),
('perm-account-app', 'accountant', 'appointments', false, false, false, false, false, false, false),
('perm-account-treat', 'accountant', 'treatments', false, false, false, false, false, false, false),
('perm-account-rx', 'accountant', 'prescriptions', false, false, false, false, false, false, false),
('perm-account-rec', 'accountant', 'clinical_records', false, false, false, false, false, false, false),
('perm-account-bill', 'accountant', 'billing', true, true, true, true, true, false, false),
('perm-account-inv', 'accountant', 'inventory', false, false, false, false, false, false, false),
('perm-account-rep', 'accountant', 'reports', true, false, false, false, false, false, true)
ON CONFLICT (role_id, module) DO NOTHING;

-- Assistant: Access to Patients, Appointments, Treatments (Read-only)
INSERT INTO permissions (id, role_id, module, can_view, can_create, can_edit, can_delete, can_refund, can_manage, can_export) VALUES
('perm-assist-dash', 'assistant', 'dashboard', true, false, false, false, false, false, false),
('perm-assist-pat', 'assistant', 'patients', true, false, false, false, false, false, false),
('perm-assist-app', 'assistant', 'appointments', true, false, false, false, false, false, false),
('perm-assist-treat', 'assistant', 'treatments', true, false, false, false, false, false, false),
('perm-assist-rx', 'assistant', 'prescriptions', false, false, false, false, false, false, false),
('perm-assist-rec', 'assistant', 'clinical_records', false, false, false, false, false, false, false),
('perm-assist-bill', 'assistant', 'billing', false, false, false, false, false, false, false),
('perm-assist-inv', 'assistant', 'inventory', false, false, false, false, false, false, false),
('perm-assist-rep', 'assistant', 'reports', false, false, false, false, false, false, false)
ON CONFLICT (role_id, module) DO NOTHING;

-- 3. Create Staff Members Table
CREATE TABLE IF NOT EXISTS staff_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT DEFAULT 'assistant',
    joining_date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
    profile_photo TEXT,
    password_hash TEXT NOT NULL,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Staff Activity Logs Table
CREATE TABLE IF NOT EXISTS staff_activity_logs (
    id TEXT PRIMARY KEY,
    staff_id TEXT REFERENCES staff_members(id) ON DELETE SET NULL,
    staff_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on logs for speed
CREATE INDEX IF NOT EXISTS staff_activity_logs_created_at_idx ON staff_activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS staff_activity_logs_staff_id_idx ON staff_activity_logs (staff_id);

-- 5. Copy data from old staff table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff') THEN
        INSERT INTO staff_members (id, name, username, email, role, password_hash, created_at, status, joining_date)
        SELECT 
            id, 
            name, 
            username, 
            email, 
            CASE 
                WHEN LOWER(role) = 'admin' THEN 'admin'
                WHEN LOWER(role) = 'dentist' THEN 'dentist'
                WHEN LOWER(role) = 'receptionist' THEN 'receptionist'
                WHEN LOWER(role) = 'accountant' THEN 'accountant'
                WHEN LOWER(role) = 'assistant' THEN 'assistant'
                ELSE 'admin'
            END,
            password_hash, 
            created_at,
            'Active',
            created_at::date
        FROM staff
        ON CONFLICT (username) DO NOTHING;
    END IF;
END $$;

-- 6. Trigger to automatically sync legacy activity_log table to staff_activity_logs
CREATE OR REPLACE FUNCTION sync_staff_activity_log()
RETURNS TRIGGER AS $$
DECLARE
    v_staff_id TEXT;
    v_staff_name TEXT := 'System';
    v_action TEXT := 'Patient Updates';
BEGIN
    -- Parse staff name from subtext if possible
    IF NEW.subtext LIKE 'By %' THEN
        v_staff_name := SUBSTRING(NEW.subtext FROM 4);
    ELSIF NEW.subtext LIKE 'Created by %' THEN
        v_staff_name := SUBSTRING(NEW.subtext FROM 12);
    ELSIF NEW.subtext LIKE 'Modified by %' THEN
        v_staff_name := SUBSTRING(NEW.subtext FROM 12);
    END IF;

    -- Map action based on text content
    IF NEW.text LIKE 'New patient%' OR NEW.text LIKE 'Patient %' OR NEW.text LIKE 'Restore patient%' THEN
        v_action := 'Patient Updates';
    ELSIF NEW.text LIKE 'Treatment %' OR NEW.text LIKE 'New treatment%' OR NEW.text LIKE 'Added treatment%' OR NEW.text LIKE 'Deleted treatment%' THEN
        v_action := 'Treatment Updates';
    ELSIF NEW.text LIKE 'Payment %' OR NEW.text LIKE 'Record Payment%' OR NEW.text LIKE 'Billing %' OR NEW.text LIKE 'Recorded Payment%' OR NEW.text LIKE 'Deleted Payment%' OR NEW.text LIKE 'Updated Payment%' THEN
        v_action := 'Billing Actions';
    ELSIF NEW.text LIKE 'Stock %' OR NEW.text LIKE 'New supplier%' OR NEW.text LIKE 'Purchase Order%' OR NEW.text LIKE 'Supplier %' OR NEW.text LIKE 'Received PO%' OR NEW.text LIKE 'Created PO%' THEN
        v_action := 'Inventory Changes';
    ELSIF NEW.text LIKE 'Appointment %' THEN
        v_action := 'Patient Updates';
    ELSE
        v_action := 'Patient Updates';
    END IF;

    -- Try to find staff ID by matching staff name (case-insensitive)
    SELECT id INTO v_staff_id FROM staff_members WHERE LOWER(name) = LOWER(v_staff_name) LIMIT 1;

    INSERT INTO staff_activity_logs (id, staff_id, staff_name, action, details, created_at)
    VALUES ('log-' || substr(md5(random()::text), 1, 8), v_staff_id, v_staff_name, v_action, NEW.text, NEW.created_at);

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Prevent log triggers from failing parent transactions
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_staff_activity_log_trg ON activity_log;
CREATE TRIGGER sync_staff_activity_log_trg
AFTER INSERT ON activity_log
FOR EACH ROW
EXECUTE FUNCTION sync_staff_activity_log();

