import 'server-only';

import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BusinessArea,
  generatePrivatePath,
  isBusinessArea,
  isValidPrivatePath,
} from '@/lib/storage/taxonomy';
import { s3Client, R2_BUCKETS, getBucketForPath } from '@/lib/storage/r2-client';
import { R2UsageTracker } from '@/lib/storage/usage-tracker';
import { isReasonablePrivateContentType, PRIVATE_UPLOAD_MAX_BYTES } from '@/lib/storage/limits';

export interface PresignedPrivateUploadResult {
  success: boolean;
  uploadUrl?: string;
  path?: string;
  error?: string;
}

export async function presignedPrivateUpload(input: {
  area: string;
  station: string;
  filename: string;
  contentType: string;
  contentLength: number;
}): Promise<PresignedPrivateUploadResult> {
  const { area, station, filename, contentType, contentLength } = input;

  if (!isBusinessArea(area)) {
    return { success: false, error: 'Invalid business area' };
  }
  if (!station?.trim() || !filename?.trim()) {
    return { success: false, error: 'Missing station or filename' };
  }
  if (!isReasonablePrivateContentType(contentType)) {
    return { success: false, error: 'Invalid content type' };
  }
  if (!Number.isFinite(contentLength) || contentLength < 1 || contentLength > PRIVATE_UPLOAD_MAX_BYTES) {
    return {
      success: false,
      error: `contentLength must be between 1 and ${PRIVATE_UPLOAD_MAX_BYTES} bytes`,
    };
  }

  const limitCheck = await R2UsageTracker.checkLimits();
  if (!limitCheck.allowed) {
    return { success: false, error: limitCheck.reason ?? 'R2 usage limit exceeded' };
  }

  const key = generatePrivatePath(area as BusinessArea, station.trim(), filename.trim());
  if (!isValidPrivatePath(key)) {
    return { success: false, error: 'Generated key failed taxonomy validation' };
  }

  const bucket = getBucketForPath(key);
  if (bucket !== R2_BUCKETS.PRIVATE) {
    return { success: false, error: 'Private uploads must not target the public bucket' };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType.trim(),
      ContentLength: Math.floor(contentLength),
      CacheControl: 'private, max-age=31536000',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    await R2UsageTracker.recordUsage(Math.floor(contentLength), true);

    return {
      success: true,
      uploadUrl,
      path: key,
    };
  } catch (e) {
    console.error('[presigned-private] PutObject presign failed:', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to generate upload URL',
    };
  }
}

export async function presignedPrivateDownload(key: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  if (!key?.trim() || key.includes('..')) {
    return { success: false, error: 'Invalid key' };
  }
  const trimmed = key.trim();
  if (trimmed.startsWith('items/')) {
    return { success: false, error: 'Use akiles-ecosystem for public item keys' };
  }
  if (!isValidPrivatePath(trimmed)) {
    return { success: false, error: 'Key is not a valid private path' };
  }

  const bucket = getBucketForPath(trimmed);
  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: trimmed });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return { success: true, url };
  } catch (e) {
    console.error('[presigned-private] GetObject presign failed:', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to generate download URL',
    };
  }
}
