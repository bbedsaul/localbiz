/*
 * Storage adapter for prospect photo uploads.
 *
 * Bucket setup (one-time, in Supabase Dashboard):
 *   1. Storage → New bucket → name: prospect-photos (matches STORAGE_BUCKET env)
 *   2. Make the bucket Public so getPublicUrl returns a directly-loadable URL.
 *   3. (Optional) Add a policy restricting writes to the service role only —
 *      the API uses the service-role key, so anon clients cannot upload directly.
 *
 * Swapping to Cloudflare R2 later:
 *   Replace SupabaseStorageAdapter below with an R2StorageAdapter that uses the
 *   AWS S3 SDK pointed at R2's S3-compatible endpoint
 *   (https://<account-id>.r2.cloudflarestorage.com). Keep the StorageAdapter
 *   interface and the exported `storage` symbol unchanged; the rest of the
 *   codebase (api.ts, tests) imports the adapter through this module and does
 *   not care about the backend.
 */

import { supabase } from '../db.js';

export interface UploadResult {
  key: string;
  publicUrl: string;
}

export interface StorageAdapter {
  upload(key: string, file: Buffer, contentType: string): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}

const BUCKET = process.env.STORAGE_BUCKET || 'prospect-photos';

class SupabaseStorageAdapter implements StorageAdapter {
  async upload(key: string, file: Buffer, contentType: string): Promise<UploadResult> {
    const { error } = await supabase.storage.from(BUCKET).upload(key, file, { contentType });
    if (error) {
      throw new Error(`Storage upload failed for ${key}: ${error.message}`);
    }
    return { key, publicUrl: this.getPublicUrl(key) };
  }

  async delete(key: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([key]);
    if (error) {
      throw new Error(`Storage delete failed for ${key}: ${error.message}`);
    }
  }

  getPublicUrl(key: string): string {
    return supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  }
}

export const storage: StorageAdapter = new SupabaseStorageAdapter();
