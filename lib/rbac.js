import { getDB } from './db';

/**
 * Checks if a user role has the required permission for a module and action.
 * Uses a hybrid approach: queries the permissions table, and falls back to static rules.
 * 
 * @param {string} role - The user role code (e.g., 'admin', 'dentist')
 * @param {string} module - The system module (e.g., 'patients', 'billing')
 * @param {string} action - The action (e.g., 'view', 'create', 'edit', 'delete', 'refund', 'manage', 'export')
 * @returns {Promise<boolean>} - True if permitted, false otherwise
 */
export async function hasPermission(role, module, action) {
  if (!role) return false;
  
  // Super Admin and Admin roles always have full access to everything
  const lowerRole = role.toLowerCase();
  if (lowerRole === 'admin' || lowerRole === 'super_admin') {
    return true;
  }

  try {
    const supabase = getDB();
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .eq('role_id', lowerRole)
      .eq('module', module.toLowerCase())
      .single();

    if (!error && data) {
      // Map action to corresponding column
      const columnMap = {
        view: 'can_view',
        create: 'can_create',
        edit: 'can_edit',
        delete: 'can_delete',
        refund: 'can_refund',
        manage: 'can_manage',
        export: 'can_export'
      };

      const col = columnMap[action.toLowerCase()];
      if (col && data[col] !== undefined) {
        return !!data[col];
      }
    }
  } catch (err) {
    console.warn('[RBAC] Database query failed, using static fallback rules:', err);
  }

  // Fallback to static rules if database query fails or row isn't found
  return checkStaticPermission(lowerRole, module.toLowerCase(), action.toLowerCase());
}

/**
 * Fallback static permission rules.
 */
function checkStaticPermission(role, module, action) {
  if (role === 'admin' || role === 'super_admin') return true;

  if (role === 'receptionist') {
    if (module === 'patients' || module === 'appointments') return true;
    if (module === 'dashboard' && action === 'view') return true;
    return false;
  }

  if (role === 'dentist') {
    if (module === 'treatments' || module === 'prescriptions' || module === 'clinical_records') return true;
    if (module === 'patients' && action === 'view') return true;
    if (module === 'dashboard' && action === 'view') return true;
    if (module === 'appointments' && action === 'view') return true;
    return false;
  }

  if (role === 'accountant') {
    if (module === 'billing' || module === 'reports') return true;
    if (module === 'dashboard' && action === 'view') return true;
    if (module === 'patients' && action === 'view') return true;
    return false;
  }

  if (role === 'assistant') {
    if (module === 'patients' && action === 'view') return true;
    if (module === 'appointments' && action === 'view') return true;
    if (module === 'treatments' && action === 'view') return true;
    if (module === 'dashboard' && action === 'view') return true;
    return false;
  }

  return false;
}
