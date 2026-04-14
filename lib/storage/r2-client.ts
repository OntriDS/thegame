import 'server-only';

import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKETS = {
  PUBLIC: process.env.R2_PUBLIC_BUCKET || 'akiles-ecosystem-media',
  PRIVATE: process.env.R2_PRIVATE_BUCKET || 'thegame-media',
} as const;

export function getBucketForPath(path: string): string {
  if (path.startsWith('items/')) {
    return R2_BUCKETS.PUBLIC;
  }
  return R2_BUCKETS.PRIVATE;
}

export { s3Client };
