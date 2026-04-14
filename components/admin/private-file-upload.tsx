'use client';

import { useRef, useState } from 'react';
import { BusinessArea } from '@/lib/storage/taxonomy';
import { PRIVATE_UPLOAD_MAX_BYTES } from '@/lib/storage/limits';

const ALLOWED_PRIVATE_UPLOAD_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/json',
  'application/zip',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'text/plain',
  'application/octet-stream',
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  json: 'application/json',
  zip: 'application/zip',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  txt: 'text/plain',
};

function inferContentType(file: File): string | null {
  const normalizedType = file.type?.trim().toLowerCase();
  if (normalizedType && ALLOWED_PRIVATE_UPLOAD_TYPES.has(normalizedType)) {
    return normalizedType;
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const inferredType = MIME_BY_EXTENSION[extension];
  if (inferredType && ALLOWED_PRIVATE_UPLOAD_TYPES.has(inferredType)) {
    return inferredType;
  }

  return null;
}

interface PrivateFileUploadProps {
  area: BusinessArea;
  station: string;
  onUploadComplete: (results: Array<{ path: string }>) => void;
}

export default function PrivateFileUpload({
  area,
  station,
  onUploadComplete,
}: PrivateFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ path: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    const results: Array<{ path: string }> = [];

    try {
      for (const file of files) {
        if (file.size > PRIVATE_UPLOAD_MAX_BYTES) {
          throw new Error(
            `${file.name} exceeds ${PRIVATE_UPLOAD_MAX_BYTES / (1024 * 1024)}MB limit`,
          );
        }

        const contentType = inferContentType(file);
        if (!contentType) {
          const rawType = file.type || 'unknown';
          throw new Error(
            `Unsupported content type for ${file.name}: ${rawType}. Upload allowed: application/pdf, images, csv, json, zip, common office formats, mp4, mp3, wav, ogg, txt`,
          );
        }

        const params = new URLSearchParams({
          area,
          station,
          filename: file.name,
          contentType,
          contentLength: String(file.size),
        });

        const uploadResponse = await fetch(`/api/storage/presigned-upload?${params.toString()}`);
        const uploadData = await uploadResponse.json();

        if (!uploadData.success) {
          throw new Error(uploadData.error || 'Failed to get upload URL');
        }

        const uploadResult = await fetch(uploadData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': contentType,
          },
        });

        if (!uploadResult.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        results.push({
          path: uploadData.path || '',
        });
      }

      setUploadedFiles(results);
      onUploadComplete(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="private-file-upload"
        />

        <label
          htmlFor="private-file-upload"
          className="flex cursor-pointer flex-col items-center gap-2"
        >
          <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="text-gray-600">
            {uploading ? 'Uploading…' : 'Click to upload private files'}
          </span>
          <span className="text-sm text-gray-400">
            Supported files: PDF, docs/xlsx/csv, JSON, ZIP, JPG/PNG/WEBP, MP4, MP3/WAV/OGG, txt — max{' '}
            {PRIVATE_UPLOAD_MAX_BYTES / (1024 * 1024)}MB per file
          </span>
        </label>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="rounded border border-blue-200 bg-blue-50 p-4">
          <h4 className="mb-2 font-medium text-blue-800">Successfully uploaded (private)</h4>
          <ul className="space-y-1">
            {uploadedFiles.map((file, index) => (
              <li key={index} className="text-sm text-blue-700">
                {file.path}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
      )}
    </div>
  );
}
