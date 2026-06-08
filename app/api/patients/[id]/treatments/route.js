import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Extract user token to track last_modified_by
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    const username = user?.name || 'Staff';

    const supabase = getDB();

    // Support both single treatment (legacy) and array of treatments
    const treatments = Array.isArray(body)
      ? body
      : (body.treatments ? body.treatments : [body]);

    if (treatments.length === 0) {
      return NextResponse.json({ error: 'At least one treatment is required' }, { status: 400 });
    }

    const visitId = `visit-${uuidv4().substring(0, 8)}`;
    const recordsToInsert = [];

    for (const item of treatments) {
      const desc = item.description || item.name;
      const date = item.date || body.date;
      
      if (!desc || !date) {
        return NextResponse.json({ error: 'Description/Name and date are required for all treatments' }, { status: 400 });
      }

      const treatmentId = `t-${uuidv4().substring(0, 8)}`;
      const tf = parseFloat(item.treatmentFee) || 0;
      const sf = parseFloat(item.surgeryFee) || 0;
      const cf = parseFloat(item.consultationFee) || 0;
      const totalCost = tf + sf + cf;

      // JSON metadata serialization to bypass structural schema limitations
      const serializedDescription = JSON.stringify({
        name: desc,
        notes: item.notes || '',
        last_modified_by: username,
        last_modified_at: new Date().toISOString()
      });

      recordsToInsert.push({
        id: treatmentId,
        patient_id: id,
        appointment_id: visitId, // links multiple treatments to the same visit
        description: serializedDescription,
        cost: totalCost,
        treatment_fee: tf,
        surgery_fee: sf,
        consultation_fee: cf,
        date,
        dentist: item.dentist || 'Dr. Anand'
      });
    }

    const { data: inserted, error: treatError } = await supabase
      .from('treatments')
      .insert(recordsToInsert)
      .select();

    if (treatError) throw treatError;

    // Process material consumption deductions (optional)
    for (let i = 0; i < treatments.length; i++) {
      const item = treatments[i];
      const insertedTreatment = inserted[i];
      const materials = item.materials || [];
      if (Array.isArray(materials) && materials.length > 0) {
        for (const mat of materials) {
          const { itemId, quantity } = mat;
          const qty = parseInt(quantity) || 0;
          if (itemId && qty > 0) {
            // Fetch item to verify stock and name
            const { data: invItem } = await supabase
              .from('inventory_items')
              .select('current_stock, item_name, reorder_level')
              .eq('id', itemId)
              .single();
            
            if (invItem) {
              const newStock = Math.max(0, invItem.current_stock - qty);
              
              // Decrement Stock
              await supabase
                .from('inventory_items')
                .update({ current_stock: newStock })
                .eq('id', itemId);

              // Log Transaction
              await supabase.from('inventory_transactions').insert([
                {
                  id: `itx-${uuidv4().substring(0, 8)}`,
                  item_id: itemId,
                  transaction_type: 'Usage',
                  quantity: -qty,
                  notes: `Deducted for treatment "${item.description || item.name}" (Visit ref: ${visitId})`
                }
              ]);

              // Check if stock is now below reorder level, trigger alert
              if (newStock <= invItem.reorder_level) {
                await supabase.from('notifications').insert([
                  {
                    id: `not-${uuidv4().substring(0, 8)}`,
                    type: 'inventory',
                    title: 'Low Stock Alert',
                    message: `Stock for ${invItem.item_name} has dropped below the reorder level (${newStock} remaining).`,
                    read: 0
                  }
                ]);
              }
            }
          }
        }
      }
    }

    // Optional follow-up insertion
    if (!Array.isArray(body) && body.followupRequired) {
      const { followupDate, followupType, followupNotes } = body;
      if (followupDate && followupType) {
        const followUpId = `fol-${uuidv4().substring(0, 8)}`;
        const { error: followUpError } = await supabase
          .from('follow_ups')
          .insert([
            {
              id: followUpId,
              patient_id: id,
              treatment_id: inserted[0]?.id || null,
              followup_date: followupDate,
              followup_type: followupType,
              notes: followupNotes || '',
              status: 'Scheduled'
            }
          ]);
        if (followUpError) {
          console.error('[Treatments:CreateFollowUp] Error creating follow-up:', followUpError);
        }
      }
    }

    // Consolidate activity log text
    const descSummary = treatments.map(t => t.description || t.name).join(', ');
    const totalCostSum = recordsToInsert.reduce((sum, r) => sum + r.cost, 0);

    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `New treatment visit: ${descSummary.substring(0, 50)}${descSummary.length > 50 ? '...' : ''}`,
        subtext: `Total: ₹${totalCostSum}`,
        color: 'green',
        patient_id: id
      }
    ]);

    return NextResponse.json(Array.isArray(body) ? inserted : (body.treatments ? inserted : inserted[0]));
  } catch (error) {
    console.error('[Treatments:Create] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
