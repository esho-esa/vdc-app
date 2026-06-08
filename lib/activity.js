import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Logs a staff activity action to both `staff_activity_logs` and the legacy dashboard `activity_log`.
 * 
 * @param {object} params
 * @param {string} params.staffId - ID of the staff member
 * @param {string} params.staffName - Name of the staff member
 * @param {string} params.action - Action type (e.g. 'Login', 'Logout', 'Patient Updates', 'Treatment Updates', 'Billing Actions', 'Inventory Changes')
 * @param {string} params.details - Descriptive details of the action
 * @param {string} [params.patientId] - Optional patient ID related to the action
 */
export async function logStaffActivity({ staffId, staffName, action, details, patientId }) {
  try {
    const supabase = getDB();
    const logId = `log-${uuidv4().substring(0, 8)}`;
    const staffNameStr = staffName || 'System';

    // 1. Insert into staff_activity_logs
    const { error: logError } = await supabase
      .from('staff_activity_logs')
      .insert([
        {
          id: logId,
          staff_id: staffId || null,
          staff_name: staffNameStr,
          action,
          details,
          created_at: new Date().toISOString()
        }
      ]);

    if (logError) {
      console.error('[Activity] Error inserting into staff_activity_logs:', logError.message);
    }

    // 2. Insert into the legacy activity_log table for Dashboard feed
    let color = 'blue';
    if (action === 'Login') color = 'green';
    else if (action === 'Logout') color = 'gray';
    else if (action === 'Billing Actions') color = 'purple';
    else if (action === 'Inventory Changes') color = 'orange';
    else if (action === 'Treatment Updates') color = 'teal';
    else if (action === 'Patient Updates') color = 'blue';

    const { error: legacyError } = await supabase
      .from('activity_log')
      .insert([
        {
          id: `act-${uuidv4().substring(0, 8)}`,
          text: `${action}: ${details}`,
          subtext: `By ${staffNameStr}`,
          color,
          patient_id: patientId || null
        }
      ]);

    if (legacyError) {
      console.error('[Activity] Error inserting into legacy activity_log:', legacyError.message);
    }

  } catch (error) {
    console.error('[Activity] Log staff activity failed:', error);
  }
}
