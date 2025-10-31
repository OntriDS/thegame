// app/api/notes-log/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api-auth';
import fs from 'fs';
import path from 'path';

// Force dynamic rendering since this route accesses request cookies for auth
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  console.log('🔥 [Notes Log API] GET request received');
  
  if (!(await requireAdminAuth(req))) {
    console.log('🔥 [Notes Log API] ❌ Auth failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // In production with KV, read from KV
    if (process.env.UPSTASH_REDIS_REST_URL) {
      console.log('🔥 [Notes Log API] Using KV (production)');
      const { kvGet } = await import('@/data-store/kv');
      const notesData = await kvGet('data:notes-log');
      console.log('🔥 [Notes Log API] KV data:', notesData ? 'FOUND' : 'NOT FOUND');

      if (notesData) {
        console.log('🔥 [Notes Log API] ✅ Returning notes from KV');
        const notesDataTyped = notesData as any;
        console.log('🔥 [Notes Log API] Data structure:', {
          hasEntries: !!notesDataTyped.entries,
          entriesLength: notesDataTyped.entries?.length || 0,
          keys: Object.keys(notesDataTyped)
        });
        return NextResponse.json(notesData);
      } else {
        console.log('🔥 [Notes Log API] ⚠️ No notes in KV, returning empty structure');
        return NextResponse.json({ entries: [] });
      }
    } else {
      console.log('🔥 [Notes Log API] Using filesystem (development)');
      // In development, read from filesystem
      const filePath = path.join(process.cwd(), 'logs-research', 'notes-log.json');
      console.log('🔥 [Notes Log API] Reading from:', filePath);

      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const notesData = JSON.parse(fileContent);
        console.log('🔥 [Notes Log API] ✅ File read successfully');
        return NextResponse.json(notesData);
      } catch (fileError) {
        console.error('🔥 [Notes Log API] ❌ Error reading notes-log.json:', fileError);
        return NextResponse.json({ entries: [] });
      }
    }
  } catch (error) {
   console.error('🔥 [Notes Log API] ❌ Error loading notes log:', error);
   return NextResponse.json({ error: 'Failed to load notes' }, { status: 500 });
 }
}

export async function POST(req: NextRequest) {
 if (!(await requireAdminAuth(req))) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 try {
   const note = await req.json();

   if (!note) {
     return NextResponse.json({ error: 'Note data is required' }, { status: 400 });
   }

   // In production with KV, write to KV
   if (process.env.UPSTASH_REDIS_REST_URL) {
     const { kvGet, kvSet } = await import('@/data-store/kv');

     // Get current notes data
     const existingData = await kvGet('data:notes-log');
     const currentData = existingData || { entries: [], lastUpdated: new Date().toISOString() };

     // Add new note to entries
     const newNote = {
       ...note,
       id: note.id || `note_${Date.now()}`,
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

     const updatedData = {
       ...currentData,
       entries: [newNote, ...(currentData as any).entries || []],
       lastUpdated: new Date().toISOString()
     };

     await kvSet('data:notes-log', updatedData);
     return NextResponse.json({ note: newNote });
   } else {
     // In development, write to filesystem
     const filePath = path.join(process.cwd(), 'logs-research', 'notes-log.json');

     // Read current data
     let currentData = { entries: [], lastUpdated: new Date().toISOString() };
     try {
       const fileContent = fs.readFileSync(filePath, 'utf8');
       currentData = JSON.parse(fileContent);
     } catch (fileError) {
       // File doesn't exist or is invalid, start with empty data
     }

     // Add new note
     const newNote = {
       ...note,
       id: note.id || `note_${Date.now()}`,
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     };

     const updatedData = {
       ...currentData,
       entries: [newNote, ...currentData.entries],
       lastUpdated: new Date().toISOString()
     };

     fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
     return NextResponse.json({ note: newNote });
   }
 } catch (error) {
   console.error('Error creating note:', error);
   return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
 }
}

export async function PUT(req: NextRequest) {
 if (!(await requireAdminAuth(req))) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 try {
   const note = await req.json();

   if (!note || !note.id) {
     return NextResponse.json({ error: 'Note data with ID is required' }, { status: 400 });
   }

   // In production with KV, write to KV
   if (process.env.UPSTASH_REDIS_REST_URL) {
     const { kvGet, kvSet } = await import('@/data-store/kv');

     // Get current notes data
     const currentData = await kvGet('data:notes-log') || { entries: [], lastUpdated: new Date().toISOString() };

     // Update existing note
     const updatedNote = {
       ...note,
       updatedAt: new Date().toISOString()
     };

     const currentEntries = (currentData as any).entries || [];
     const updatedEntries = currentEntries.map((n: any) =>
       n.id === note.id ? updatedNote : n
     );

     const updatedData = {
       ...currentData,
       entries: updatedEntries,
       lastUpdated: new Date().toISOString()
     };

     await kvSet('data:notes-log', updatedData);
     return NextResponse.json({ note: updatedNote });
   } else {
     // In development, write to filesystem
     const filePath = path.join(process.cwd(), 'logs-research', 'notes-log.json');

     // Read current data
     let currentData = { entries: [], lastUpdated: new Date().toISOString() };
     try {
       const fileContent = fs.readFileSync(filePath, 'utf8');
       currentData = JSON.parse(fileContent);
     } catch (fileError) {
       return NextResponse.json({ error: 'Failed to read notes file' }, { status: 500 });
     }

     // Update existing note
     const updatedNote = {
       ...note,
       updatedAt: new Date().toISOString()
     };

     const updatedEntries = currentData.entries.map((n: any) =>
       n.id === note.id ? updatedNote : n
     );

     const updatedData = {
       ...currentData,
       entries: updatedEntries,
       lastUpdated: new Date().toISOString()
     };

     fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
     return NextResponse.json({ note: updatedNote });
   }
 } catch (error) {
   console.error('Error updating note:', error);
   return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
 }
}

export async function DELETE(req: NextRequest) {
 if (!(await requireAdminAuth(req))) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 try {
   const body = await req.json();
   const { noteId } = body;

   if (!noteId) {
     return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
   }

   // In production with KV, write to KV
   if (process.env.UPSTASH_REDIS_REST_URL) {
     const { kvGet, kvSet } = await import('@/data-store/kv');

     // Get current notes data
     const currentData = await kvGet('data:notes-log') || { entries: [], lastUpdated: new Date().toISOString() };

     // Remove note from entries
     const currentEntries = (currentData as any).entries || [];
     const updatedEntries = currentEntries.filter((n: any) => n.id !== noteId);

     const updatedData = {
       ...currentData,
       entries: updatedEntries,
       lastUpdated: new Date().toISOString()
     };

     await kvSet('data:notes-log', updatedData);
     return NextResponse.json({ success: true });
   } else {
     // In development, write to filesystem
     const filePath = path.join(process.cwd(), 'logs-research', 'notes-log.json');

     // Read current data
     let currentData = { entries: [], lastUpdated: new Date().toISOString() };
     try {
       const fileContent = fs.readFileSync(filePath, 'utf8');
       currentData = JSON.parse(fileContent);
     } catch (fileError) {
       return NextResponse.json({ error: 'Failed to read notes file' }, { status: 500 });
     }

     // Remove note from entries
     const updatedEntries = currentData.entries.filter((n: any) => n.id !== noteId);

     const updatedData = {
       ...currentData,
       entries: updatedEntries,
       lastUpdated: new Date().toISOString()
     };

     fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
     return NextResponse.json({ success: true });
   }
 } catch (error) {
   console.error('Error deleting note:', error);
   return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
 }
}