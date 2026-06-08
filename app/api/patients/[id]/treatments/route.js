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

    // Fetch all inventory items once to do local keyword matching
    const { data: allItems } = await supabase.from('inventory_items').select('*');
    const findItemByKeyword = (keyword) => {
      return (allItems || []).find(it => it.item_name.toLowerCase().includes(keyword.toLowerCase()));
    };

    // Process material consumption deductions (both automatic keyword-based and manual)
    for (let i = 0; i < treatments.length; i++) {
      const item = treatments[i];
      const insertedTreatment = inserted[i];
      const descText = (item.description || item.name || '').toLowerCase();
      const materialsToDeduct = [];

      // 1. Automatic Keyword-based matching
      if (descText.includes('extraction') || descText.includes('extract')) {
        const mat = findItemByKeyword('anesthetic');
        if (mat) materialsToDeduct.push({ item: mat, qty: 1 });
      }
      if (descText.includes('rct') || descText.includes('root canal')) {
        const matGp = findItemByKeyword('gp point') || findItemByKeyword('gp');
        const matFile = findItemByKeyword('file');
        const matSealer = findItemByKeyword('sealer');
        if (matGp) materialsToDeduct.push({ item: matGp, qty: 1 });
        if (matFile) materialsToDeduct.push({ item: matFile, qty: 1 });
        if (matSealer) materialsToDeduct.push({ item: matSealer, qty: 1 });
      }
      if (descText.includes('crown')) {
        const matCrown = findItemByKeyword('crown material') || findItemByKeyword('crown');
        if (matCrown) materialsToDeduct.push({ item: matCrown, qty: 1 });
      }
      if (descText.includes('x-ray') || descText.includes('xray') || descText.includes('x ray')) {
        const matXray = findItemByKeyword('x-ray material') || findItemByKeyword('xray') || findItemByKeyword('x-ray');
        if (matXray) materialsToDeduct.push({ item: matXray, qty: 1 });
      }

      // 2. Manual materials passed from request (if any)
      const manualMaterials = item.materials || [];
      if (Array.isArray(manualMaterials)) {
        for (const mat of manualMaterials) {
          const { itemId, quantity } = mat;
          const qty = parseInt(quantity) || 0;
          if (itemId && qty > 0) {
            const matchedItem = (allItems || []).find(it => it.id === itemId);
            if (matchedItem) {
              materialsToDeduct.push({ item: matchedItem, qty });
            }
          }
        }
      }

      // Deduct materials and log transactions
      for (const { item: invItem, qty } of materialsToDeduct) {
        const newStock = Math.max(0, invItem.current_stock - qty);
        
        // Decrement Stock
        await supabase
          .from('inventory_items')
          .update({ current_stock: newStock })
          .eq('id', invItem.id);

        // Update local reference stock in case subsequent treatments use the same item
        invItem.current_stock = newStock;

        // Log Transaction to stock_transactions
        await supabase.from('stock_transactions').insert([
          {
            id: `stx-${uuidv4().substring(0, 8)}`,
            inventory_item_id: invItem.id,
            transaction_type: 'OUT',
            quantity: -qty,
            reason: `Deducted for treatment "${item.description || item.name}" (Visit ref: ${visitId})`,
            treatment_id: insertedTreatment?.id || null,
            staff_id: user?.id || null
          }
        ]);

        // Check if stock is now below minimum stock, trigger alert
        if (newStock <= invItem.minimum_stock) {
          await supabase.from('notifications').insert([
            {
              id: `not-${uuidv4().substring(0, 8)}`,
              type: 'inventory',
              title: 'Low Stock Alert',
              message: `Stock for ${invItem.item_name} has dropped below the minimum limit (${newStock} remaining).`,
              read: 0
            }
          ]);
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
