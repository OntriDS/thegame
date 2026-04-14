'use server';

import {
  presignedPrivateUpload,
  presignedPrivateDownload,
} from '@/lib/storage/presigned-private';

export type { PresignedPrivateUploadResult } from '@/lib/storage/presigned-private';

export async function generatePresignedPrivateUpload(input: {
  area: string;
  station: string;
  filename: string;
  contentType: string;
  contentLength: number;
}) {
  return presignedPrivateUpload(input);
}

export async function generatePresignedPrivateDownloadUrl(key: string) {
  return presignedPrivateDownload(key);
}
