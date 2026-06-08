import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';

/**
 * Helper to upload a file buffer to Supabase Storage.
 * Auto-creates bucket if it does not exist.
 */
async function uploadToStorage(supabase, bucketName, path, fileBuffer, contentType) {
  // Try uploading first
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, fileBuffer, {
      contentType,
      upsert: true
    });

  if (error) {
    console.warn(`[ClinicalRecords:Upload] Initial upload failed: ${error.message}. Checking if bucket exists...`);
    // Attempt to create bucket if it doesn't exist
    try {
      console.log(`[ClinicalRecords:Upload] Attempting to create bucket '${bucketName}'...`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760 // 10MB limit for large images/files
      });

      if (createError && !createError.message?.includes('already exists')) {
        console.error(`[ClinicalRecords:Upload] Failed to create bucket '${bucketName}':`, createError.message);
        throw createError;
      }

      console.log(`[ClinicalRecords:Upload] Bucket '${bucketName}' verified/created. Retrying upload...`);
      const { data: retryData, error: retryError } = await supabase.storage
        .from(bucketName)
        .upload(path, fileBuffer, {
          contentType,
          upsert: true
        });

      if (retryError) {
        console.error(`[ClinicalRecords:Upload] Retry upload failed:`, retryError.message);
        throw retryError;
      }

      return retryData;
    } catch (createEx) {
      throw new Error(`Storage upload and bucket creation failed: ${error.message} -> ${createEx.message}`);
    }
  }

  return data;
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    // Auth Check
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getDB();

    // 1. Fetch photos
    const { data: photos, error: photosErr } = await supabase
      .from('patient_photos')
      .select('*')
      .eq('patient_id', id)
      .order('uploaded_at', { ascending: false });

    if (photosErr) throw photosErr;

    // 2. Fetch xrays
    const { data: xrays, error: xraysErr } = await supabase
      .from('patient_xrays')
      .select('*')
      .eq('patient_id', id)
      .order('uploaded_at', { ascending: false });

    if (xraysErr) throw xraysErr;

    // 3. Fetch files
    const { data: files, error: filesErr } = await supabase
      .from('patient_files')
      .select('*')
      .eq('patient_id', id)
      .order('uploaded_at', { ascending: false });

    if (filesErr) throw filesErr;

    return NextResponse.json({
      photos: photos || [],
      xrays: xrays || [],
      files: files || []
    });
  } catch (error) {
    console.error('[ClinicalRecords:GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    
    // Auth Check
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = user.name || 'Staff';
    const supabase = getDB();

    const formData = await request.formData();
    const file = formData.get('file');
    const category = formData.get('category');
    const notes = formData.get('notes') || '';
    const treatmentId = formData.get('treatmentId') || null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    // Determine subfolder and database table based on category
    let subfolder = '';
    let table = '';
    const isPhoto = ['Before', 'During', 'After'].includes(category);
    const isXRay = category === 'X-Ray';
    const isFile = ['Scan', 'Report', 'Other'].includes(category);

    if (isPhoto) {
      subfolder = 'photos';
      table = 'patient_photos';
    } else if (isXRay) {
      subfolder = 'xrays';
      table = 'patient_xrays';
    } else if (isFile) {
      subfolder = 'reports';
      table = 'patient_files';
    } else {
      return NextResponse.json({ error: 'Invalid category specified' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const fileBuffer = Buffer.from(bytes);

    const bucketName = 'clinical-records';
    const recordId = `${subfolder.substring(0, 3)}-${uuidv4().substring(0, 8)}`;
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `patients/${id}/${subfolder}/${uuidv4()}-${sanitizedFileName}`;

    // Upload to Supabase Storage
    await uploadToStorage(supabase, bucketName, storagePath, fileBuffer, file.type);

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    // Insert metadata record into DB
    const insertPayload = {
      id: recordId,
      patient_id: id,
      treatment_id: treatmentId || null,
      file_url: publicUrl,
      storage_path: storagePath,
      file_name: file.name,
      notes,
      uploaded_by: username
    };

    // Category check is only present on photos and files tables
    if (isPhoto || isFile) {
      insertPayload.category = category;
    }

    const { data: inserted, error: insertError } = await supabase
      .from(table)
      .insert([insertPayload])
      .select();

    if (insertError) {
      // Clean up the storage file if db insert fails to avoid orphaned files
      await supabase.storage.from(bucketName).remove([storagePath]);
      throw insertError;
    }

    // Log Activity
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Clinical record uploaded: ${file.name} (${category})`,
        subtext: `Uploaded by ${username} for Patient ID: ${id}`,
        color: 'purple',
        patient_id: id
      }
    ]);

    return NextResponse.json(inserted[0]);
  } catch (error) {
    console.error('[ClinicalRecords:POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
