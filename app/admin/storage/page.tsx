'use client';

import { useEffect, useMemo, useState } from 'react';
import PrivateFileUpload from '@/components/admin/private-file-upload';
import {
  AdminStation,
  ArtDesignStation,
  BusinessArea,
  DevStation,
  MakerSpaceStation,
  PersonalStation,
  ResearchStation,
  SalesStation,
} from '@/lib/storage/taxonomy';

interface UploadedFile {
  path: string;
}

const STATIONS_BY_AREA = {
  [BusinessArea.ADMIN]: Object.values(AdminStation),
  [BusinessArea.RESEARCH]: Object.values(ResearchStation),
  [BusinessArea.DEV]: Object.values(DevStation),
  [BusinessArea.ART_DESIGN]: Object.values(ArtDesignStation),
  [BusinessArea.MAKER_SPACE]: Object.values(MakerSpaceStation),
  [BusinessArea.SALES]: Object.values(SalesStation),
  [BusinessArea.PERSONAL]: Object.values(PersonalStation),
};

const AREA_OPTIONS = Object.values(BusinessArea);

function getStationsForArea(area: BusinessArea): string[] {
  return STATIONS_BY_AREA[area] || ['default'];
}

export default function StorageUploadPage() {
  const [area, setArea] = useState<BusinessArea>(BusinessArea.ADMIN);
  const [station, setStation] = useState<string>(STATIONS_BY_AREA[BusinessArea.ADMIN][0] ?? 'default');
  const [uploadedFiles, setUploadedFiles] = useState<Array<UploadedFile>>([]);

  const stationOptions = useMemo(() => getStationsForArea(area), [area]);

  useEffect(() => {
    if (!stationOptions.includes(station)) {
      setStation(stationOptions[0] ?? 'default');
    }
  }, [area, station, stationOptions]);

  const canUpload = station.trim().length > 0;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Private Storage Upload</h1>
      <p className="text-sm text-muted-foreground">
        Configure business area and station, then upload private files through the signed upload API.
      </p>

      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Private metadata</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Business Area</span>
            <select
              className="w-full rounded border border-input bg-background px-3 py-2"
              value={area}
              onChange={(e) => setArea(e.target.value as BusinessArea)}
            >
              {AREA_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Station</span>
            <select
              className="w-full rounded border border-input bg-background px-3 py-2"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              disabled={stationOptions.length <= 1}
            >
              {stationOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        {canUpload ? (
          <p className="text-sm text-blue-700">Upload area is active. Select files to send signed PUT requests.</p>
        ) : (
          <p className="text-sm text-amber-700">Choose an area and station to enable upload.</p>
        )}
      </section>

      {canUpload && (
        <PrivateFileUpload
          area={area}
          station={station}
          onUploadComplete={(results) => {
            setUploadedFiles(results);
          }}
        />
      )}

      <section className="rounded-lg border p-4">
        <h2 className="mb-2 text-base font-semibold">Latest upload result</h2>
        {uploadedFiles.length > 0 ? (
          <ul className="space-y-1">
            {uploadedFiles.map((file, index) => (
              <li key={`${file.path}-${index}`} className="text-sm text-muted-foreground break-all">
                {file.path}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No private uploads yet.</p>
        )}
      </section>
    </main>
  );
}
