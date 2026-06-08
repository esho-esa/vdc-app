import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';

/**
 * Helper to upload file buffer to Supabase Storage, auto-creating the bucket if needed.
 */
async function uploadToStorage(supabase, bucketName, path, fileBuffer, contentType) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, fileBuffer, {
      contentType,
      upsert: true
    });

  if (error) {
    console.warn(`[ExpensesUpload] Initial upload failed: ${error.message}. Checking if bucket exists...`);
    try {
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760 // 10MB
      });

      if (createError && !createError.message?.includes('already exists')) {
        throw createError;
      }

      const { data: retryData, error: retryError } = await supabase.storage
        .from(bucketName)
        .upload(path, fileBuffer, {
          contentType,
          upsert: true
        });

      if (retryError) throw retryError;
      return retryData;
    } catch (createEx) {
      throw new Error(`Storage upload failed: ${error.message} -> ${createEx.message}`);
    }
  }

  return data;
}

export async function POST(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const fileBuffer = Buffer.from(bytes);

    const supabase = getDB();
    const bucketName = 'expense-receipts';
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `receipts/${uuidv4()}-${sanitizedFileName}`;

    // Upload
    await uploadToStorage(supabase, bucketName, storagePath, fileBuffer, file.type);

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    return NextResponse.json({ fileUrl: publicUrl, storagePath });
  } catch (error) {
    console.error('[Expenses Upload API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
