import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const { id, recordId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'photo', 'xray', or 'file'

    // Auth Check
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!type || !['photo', 'xray', 'file'].includes(type)) {
      return NextResponse.json({ error: 'Valid record type is required (?type=photo|xray|file)' }, { status: 400 });
    }

    const username = user.name || 'Staff';
    const supabase = getDB();

    // Map type to table
    let table = '';
    if (type === 'photo') table = 'patient_photos';
    else if (type === 'xray') table = 'patient_xrays';
    else if (type === 'file') table = 'patient_files';

    // 1. Fetch the record from db to get storage_path
    const { data: record, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .eq('id', recordId)
      .eq('patient_id', id)
      .single();

    if (fetchError || !record) {
      return NextResponse.json({ error: 'Clinical record not found' }, { status: 404 });
    }

    const bucketName = 'clinical-records';
    const storagePath = record.storage_path;
    const filename = record.file_name;

    // 2. Remove file from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .remove([storagePath]);

    if (storageError) {
      console.warn(`[ClinicalRecords:DELETE] Warning: Failed to remove file from storage: ${storageError.message}`);
      // Proceed to delete DB record anyway in case storage path was missing/invalid
    }

    // 3. Delete metadata row from DB
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq('id', recordId)
      .eq('patient_id', id);

    if (deleteError) throw deleteError;

    // Log Activity
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Clinical record deleted: ${filename}`,
        subtext: `Deleted by ${username} for Patient ID: ${id}`,
        color: 'red',
        patient_id: id
      }
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ClinicalRecords:DELETE] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
